import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Game, GamePlayerWithDetails, RoleCounts } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";
import { buildRoleSlugList, shuffle, totalAssigned } from "@/lib/gameSetup";
import { listRoles, getCurrentRules } from "@/lib/services/rules";

type Client = SupabaseClient<Database>;

export async function listOpenGames(supabase: Client): Promise<Game[]> {
  // RLS already scopes this correctly per caller: narrators/admins see every
  // open game, players only see games they're a participant in.
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .in("status", ["draft", "active", "paused"])
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as Game[];
}

export async function getGame(supabase: Client, gameId: string): Promise<Game | null> {
  const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  throwIfError(error);
  return data as Game | null;
}

export async function isGameParticipant(supabase: Client, gameId: string, playerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("game_players")
    .select("id")
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .maybeSingle();
  throwIfError(error);
  return Boolean(data);
}

export async function getGamePlayers(supabase: Client, gameId: string): Promise<GamePlayerWithDetails[]> {
  const { data, error } = await supabase
    .from("game_players")
    .select(
      // game_players has two FKs into profiles (player_id and
      // recruited_by_player_id), so the embed must name which one it means —
      // "profiles!player_id" — or PostgREST can't tell them apart (PGRST201).
      "*, profile:profiles!player_id(id, full_name, nickname, avatar_url), test_player:test_players(id, full_name, nickname), role:roles(id, name, slug, default_alignment)",
    )
    .eq("game_id", gameId);
  throwIfError(error);
  return (data ?? []) as unknown as GamePlayerWithDetails[];
}

export interface CreateDraftGameInput {
  narratorId: string;
  profileIds: string[];
  testPlayerIds: string[];
  roleCounts: RoleCounts;
  isTest: boolean;
}

export async function createDraftGame(supabase: Client, input: CreateDraftGameInput): Promise<string> {
  const { narratorId, profileIds, testPlayerIds, roleCounts, isTest } = input;

  if (!isTest && testPlayerIds.length > 0) {
    throw new Error("Test players can only be used in a Test Game.");
  }

  const totalPlayers = profileIds.length + testPlayerIds.length;
  if (totalPlayers === 0) {
    throw new Error("Select at least one player.");
  }
  if (totalAssigned(roleCounts) !== totalPlayers) {
    throw new Error("Roles assigned must equal players selected.");
  }

  const roles = await listRoles(supabase);
  const roleBySlug = new Map(roles.map((r) => [r.slug, r]));
  const roleSlugSequence = buildRoleSlugList(roleCounts);
  for (const slug of roleSlugSequence) {
    if (!roleBySlug.has(slug)) {
      throw new Error(`Role "${slug}" isn't configured for this league.`);
    }
  }

  const currentRules = await getCurrentRules(supabase);

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      status: "draft",
      narrator_id: narratorId,
      rules_version_id: currentRules?.id ?? null,
      godfather_recruits_allowed: roleCounts.godfatherRecruits,
      is_test: isTest,
    })
    .select("id")
    .single();
  throwIfError(gameError);

  type Seat = { kind: "profile" | "test"; id: string };
  const seats: Seat[] = [
    ...profileIds.map((id): Seat => ({ kind: "profile", id })),
    ...testPlayerIds.map((id): Seat => ({ kind: "test", id })),
  ];
  const shuffledSeats = shuffle(seats);
  const shuffledRoleSlugs = shuffle(roleSlugSequence);

  const gamePlayersInsert = shuffledSeats.map((seat, i) => {
    const role = roleBySlug.get(shuffledRoleSlugs[i])!;
    return {
      game_id: game!.id,
      player_id: seat.kind === "profile" ? seat.id : null,
      test_player_id: seat.kind === "test" ? seat.id : null,
      base_role_id: role.id,
      original_alignment: role.default_alignment,
      current_alignment: role.default_alignment,
    };
  });

  const { error: playersError } = await supabase.from("game_players").insert(gamePlayersInsert);
  throwIfError(playersError);

  return game!.id;
}

/** Reshuffles which player has which role, keeping the exact same role counts. */
export async function rerollGameRoles(supabase: Client, gameId: string): Promise<void> {
  const { data: players, error } = await supabase
    .from("game_players")
    .select("id, base_role_id")
    .eq("game_id", gameId);
  throwIfError(error);
  if (!players || players.length === 0) return;

  const roles = await listRoles(supabase);
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const shuffledRoleIds = shuffle(players.map((p) => p.base_role_id));

  for (let i = 0; i < players.length; i++) {
    const role = roleById.get(shuffledRoleIds[i]);
    const { error: updateError } = await supabase
      .from("game_players")
      .update({
        base_role_id: shuffledRoleIds[i],
        original_alignment: role?.default_alignment ?? "civilian",
        current_alignment: role?.default_alignment ?? "civilian",
      })
      .eq("id", players[i].id);
    throwIfError(updateError);
  }
}

export async function updateGamePlayerRole(supabase: Client, gamePlayerId: string, roleId: string): Promise<void> {
  const roles = await listRoles(supabase);
  const role = roles.find((r) => r.id === roleId);
  if (!role) throw new Error("Role not found.");

  const { error } = await supabase
    .from("game_players")
    .update({
      base_role_id: roleId,
      original_alignment: role.default_alignment,
      current_alignment: role.default_alignment,
    })
    .eq("id", gamePlayerId);
  throwIfError(error);
}

export async function startGame(supabase: Client, gameId: string): Promise<void> {
  const { error } = await supabase
    .from("games")
    .update({ status: "active", started_at: new Date().toISOString(), current_round: 1, phase: "night_godfather" })
    .eq("id", gameId)
    .eq("status", "draft");
  throwIfError(error);
}

export async function listTestGames(supabase: Client): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("is_test", true)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as Game[];
}

/** Every game, any status — Admin game-management view only. */
export async function listAllGames(supabase: Client): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*").order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []) as Game[];
}

/** RLS decides who's actually allowed to delete which game (see
 * games_delete_test_or_invalid_narrator_or_admin / games_delete_admin_any).
 * A delete a caller isn't permitted to make simply matches zero rows rather
 * than erroring, so .select() the result and treat "nothing came back" as a
 * clear permission failure instead of a silent no-op. */
export async function deleteGame(supabase: Client, gameId: string): Promise<void> {
  const { data, error } = await supabase.from("games").delete().eq("id", gameId).select("id");
  throwIfError(error);
  if (!data || data.length === 0) {
    throw new Error(
      "Couldn't delete this game — only an Admin can remove an official active, paused, or completed game.",
    );
  }
}

export async function deleteTestGame(supabase: Client, gameId: string): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");
  if (!game.is_test) throw new Error("Only test games can be deleted this way.");
  await deleteGame(supabase, gameId);
}
