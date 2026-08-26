import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { EMPTY_CAREER_STATS, type PlayerCareerStats } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

/**
 * Career stats derived entirely from completed, official (non-test) games —
 * games/game_players via normal RLS (public once a game is completed), and
 * game_actions via the narrow get_player_stat_actions() RPC (game_actions
 * itself stays narrator/admin-only for everything else). Nothing here is a
 * manually-incremented counter; re-run this any time and it reflects
 * whatever the game_actions log currently says, including after an Admin
 * correction.
 */
export async function getPlayerCareerStats(supabase: Client, playerId: string): Promise<PlayerCareerStats> {
  const { data: rows, error } = await supabase
    .from("game_players")
    .select("*, game:games(id, status, is_test, winner_alignment, official_duration_seconds), role:roles(slug)")
    .eq("player_id", playerId);
  throwIfError(error);

  const official = (rows ?? []).filter((r) => r.game?.status === "completed" && r.game?.is_test === false);

  if (official.length === 0) return { ...EMPTY_CAREER_STATS };

  const gamePlayerIds = new Set(official.map((r) => r.id));

  const { data: actions, error: actionsError } = await supabase.rpc("get_player_stat_actions", {
    target_player_id: playerId,
  });
  throwIfError(actionsError);
  const actionList = actions ?? [];

  const belongsToPlayer = (id: string | null) => Boolean(id && gamePlayerIds.has(id));

  let wins = 0;
  let mafiaGames = 0;
  let mafiaWins = 0;
  let civilianGames = 0;
  let civilianWins = 0;
  let godfatherGames = 0;
  let godfatherWins = 0;
  let timesRecruited = 0;
  let totalMafiaHoursSeconds = 0;

  for (const r of official) {
    const won = r.current_alignment === r.game!.winner_alignment;
    if (won) wins++;
    if (r.current_alignment === "mafia") {
      mafiaGames++;
      if (won) mafiaWins++;
    } else {
      civilianGames++;
      if (won) civilianWins++;
    }
    if (r.role?.slug === "godfather") {
      godfatherGames++;
      if (won) godfatherWins++;
    }
    if (r.recruited) timesRecruited++;
    totalMafiaHoursSeconds += r.game!.official_duration_seconds ?? 0;
  }

  const successfulRecruits = actionList.filter(
    (a) => a.action_type === "recruit" && belongsToPlayer(a.actor_game_player_id),
  ).length;
  const successfulSnipes = actionList.filter(
    (a) => a.action_type === "snipe_confirmed" && belongsToPlayer(a.actor_game_player_id),
  ).length;
  const priestUses = actionList.filter(
    (a) => a.action_type === "priest_use" && belongsToPlayer(a.actor_game_player_id),
  ).length;
  const kamikazeKills = actionList.filter(
    (a) => a.action_type === "kamikaze_kill" && belongsToPlayer(a.actor_game_player_id),
  ).length;
  const timesSilenced = actionList.filter(
    (a) => a.action_type === "silence" && belongsToPlayer(a.target_game_player_id),
  ).length;

  // Medic saves: cross-reference this player's medic_protect actions against
  // the resolve_night for the same game+round to see if their target is the
  // one resolve_night recorded as saved.
  const medicProtects = actionList.filter(
    (a) => a.action_type === "medic_protect" && belongsToPlayer(a.actor_game_player_id),
  );
  let medicSaves = 0;
  for (const mp of medicProtects) {
    const resolve = actionList.find(
      (a) => a.action_type === "resolve_night" && a.game_id === mp.game_id && a.round === mp.round,
    );
    const meta = (resolve?.payload as { meta?: Record<string, unknown> } | null)?.meta;
    if (meta?.savedGamePlayerId === mp.target_game_player_id) medicSaves++;
  }

  const gamesPlayed = official.length;

  return {
    gamesPlayed,
    wins,
    losses: gamesPlayed - wins,
    winPct: gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0,
    mafiaGames,
    mafiaWins,
    civilianGames,
    civilianWins,
    godfatherGames,
    godfatherWins,
    successfulRecruits,
    successfulSnipes,
    timesRecruited,
    medicSaves,
    priestUses,
    kamikazeKills,
    timesSilenced,
    totalMafiaHoursSeconds,
    avgGameDurationSeconds: gamesPlayed ? Math.round(totalMafiaHoursSeconds / gamesPlayed) : 0,
  };
}

export interface RecentGame {
  gameId: string;
  leagueNumber: number | null;
  roleName: string;
  won: boolean;
  endedAt: string | null;
}

/** Most recent completed official games this player was in, newest first. */
export async function getRecentGames(supabase: Client, playerId: string, limit = 5): Promise<RecentGame[]> {
  const { data, error } = await supabase
    .from("game_players")
    .select(
      "current_alignment, game:games(id, league_number, status, is_test, winner_alignment, ended_at), role:roles(name)",
    )
    .eq("player_id", playerId);
  throwIfError(error);

  return (data ?? [])
    .filter((r) => r.game?.status === "completed" && r.game?.is_test === false)
    .sort((a, b) => new Date(b.game!.ended_at ?? 0).getTime() - new Date(a.game!.ended_at ?? 0).getTime())
    .slice(0, limit)
    .map((r) => ({
      gameId: r.game!.id,
      leagueNumber: r.game!.league_number,
      roleName: r.role?.name ?? "Unknown",
      won: r.current_alignment === r.game!.winner_alignment,
      endedAt: r.game!.ended_at,
    }));
}
