import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Alignment, DeathReason, GamePhase, GamePlayerWithDetails } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";
import { participantDisplay, roleDisplayLabel } from "@/lib/utils";
import { getGame, getGamePlayers } from "@/lib/services/games";

type Client = SupabaseClient<Database>;

// ----------------------------------------------------------------------------
// Structured, reversible actions
//
// Every mutation below captures the exact "before" values of whatever
// columns it's about to change (a "patch"), then logs them on the
// game_actions row it writes. Undo replays those before-values back onto
// the same rows — a real reverse of what happened, not a guess at one.
// ----------------------------------------------------------------------------

interface ActionPatch {
  table: "games" | "game_players";
  id: string;
  before: Record<string, unknown>;
}

interface ActionPayload {
  patches: ActionPatch[];
  meta?: Record<string, unknown>;
}

async function patchGame(supabase: Client, id: string, changes: Record<string, unknown>): Promise<Record<string, unknown>> {
  const keys = Object.keys(changes);
  const { data, error } = await supabase.from("games").select(keys.join(",")).eq("id", id).single();
  throwIfError(error);
  const { error: updateError } = await supabase
    .from("games")
    .update(changes as Database["public"]["Tables"]["games"]["Update"])
    .eq("id", id);
  throwIfError(updateError);
  return data as unknown as Record<string, unknown>;
}

async function patchGamePlayer(
  supabase: Client,
  id: string,
  changes: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const keys = Object.keys(changes);
  const { data, error } = await supabase.from("game_players").select(keys.join(",")).eq("id", id).single();
  throwIfError(error);
  const { error: updateError } = await supabase
    .from("game_players")
    .update(changes as Database["public"]["Tables"]["game_players"]["Update"])
    .eq("id", id);
  throwIfError(updateError);
  return data as unknown as Record<string, unknown>;
}

async function recordAction(
  supabase: Client,
  params: {
    gameId: string;
    round: number;
    phase: string;
    actionType: string;
    actorGamePlayerId?: string | null;
    targetGamePlayerId?: string | null;
    patches: ActionPatch[];
    meta?: Record<string, unknown>;
    createdBy: string;
  },
): Promise<void> {
  const payload: ActionPayload = { patches: params.patches, meta: params.meta };
  const { error } = await supabase.from("game_actions").insert({
    game_id: params.gameId,
    round: params.round,
    phase: params.phase,
    action_type: params.actionType,
    actor_game_player_id: params.actorGamePlayerId ?? null,
    target_game_player_id: params.targetGamePlayerId ?? null,
    payload: payload as unknown as Database["public"]["Tables"]["game_actions"]["Insert"]["payload"],
    created_by: params.createdBy,
  });
  throwIfError(error);
}

const ACTION_LABELS: Record<string, string> = {
  recruit: "recruit",
  mafia_kill_target_set: "Godfather's kill target",
  cop_investigate: "Cop investigation",
  medic_protect: "Medic protection",
  silence: "Silencer action",
  skip_action: "skipped action",
  resolve_night: "night resolution",
  vote: "vote elimination",
  snipe_confirmed: "confirmed snipe",
  snipe_denied: "denied snipe",
  manual_death: "manual death",
  priest_use: "Priest use",
  kamikaze_kill: "Kamikaze kill",
  next_night: "Next Night",
  finish_game: "game finish",
};

export async function undoLastAction(supabase: Client, gameId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("game_actions")
    .select("*")
    .eq("game_id", gameId)
    .eq("undone", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  if (!data) return null;

  const payload = data.payload as unknown as ActionPayload;
  for (const patch of payload.patches) {
    if (patch.table === "games") {
      const { error: restoreError } = await supabase
        .from("games")
        .update(patch.before as Database["public"]["Tables"]["games"]["Update"])
        .eq("id", patch.id);
      throwIfError(restoreError);
    } else {
      const { error: restoreError } = await supabase
        .from("game_players")
        .update(patch.before as Database["public"]["Tables"]["game_players"]["Update"])
        .eq("id", patch.id);
      throwIfError(restoreError);
    }
  }

  const { error: markError } = await supabase.from("game_actions").update({ undone: true }).eq("id", data.id);
  throwIfError(markError);

  return `Undid: ${ACTION_LABELS[data.action_type] ?? data.action_type}`;
}

// ----------------------------------------------------------------------------
// Shared death handling — every death (night kill, vote, snipe, manual,
// kamikaze) funnels through here so Kamikaze detection is never duplicated.
// ----------------------------------------------------------------------------

export interface KamikazeTrigger {
  gamePlayerId: string;
}

async function applyDeath(
  supabase: Client,
  gameId: string,
  targetGamePlayerId: string,
  reason: DeathReason,
  round: number,
  patches: ActionPatch[],
): Promise<{ isKamikaze: boolean }> {
  const players = await getGamePlayers(supabase, gameId);
  const target = players.find((p) => p.id === targetGamePlayerId);
  if (!target) throw new Error("Target not found in this game.");
  if (!target.alive) return { isKamikaze: false };

  const before = await patchGamePlayer(supabase, targetGamePlayerId, {
    alive: false,
    death_reason: reason,
    died_round: round,
  });
  patches.push({ table: "game_players", id: targetGamePlayerId, before });

  return { isKamikaze: target.role.slug === "kamikaze" };
}

// ----------------------------------------------------------------------------
// Night phase: Godfather
// ----------------------------------------------------------------------------

export async function recruitPlayer(
  supabase: Client,
  gameId: string,
  godfatherGamePlayerId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");
  if (game.godfather_recruits_used >= game.godfather_recruits_allowed) {
    throw new Error("No recruits remaining.");
  }

  const players = await getGamePlayers(supabase, gameId);
  const target = players.find((p) => p.id === targetGamePlayerId);
  if (!target) throw new Error("Target not found.");
  if (!target.alive) throw new Error("Target is not alive.");
  if (target.current_alignment === "mafia") throw new Error("Target is already Mafia-aligned.");

  const patches: ActionPatch[] = [];

  const beforeTarget = await patchGamePlayer(supabase, targetGamePlayerId, {
    current_alignment: "mafia",
    recruited: true,
    recruited_by_game_player_id: godfatherGamePlayerId,
  });
  patches.push({ table: "game_players", id: targetGamePlayerId, before: beforeTarget });

  const beforeGame = await patchGame(supabase, gameId, {
    godfather_recruits_used: game.godfather_recruits_used + 1,
    phase: "night_cop",
  });
  patches.push({ table: "games", id: gameId, before: beforeGame });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "night_godfather",
    actionType: "recruit",
    actorGamePlayerId: godfatherGamePlayerId,
    targetGamePlayerId,
    patches,
    createdBy: narratorId,
  });
}

export async function setMafiaKillTarget(
  supabase: Client,
  gameId: string,
  godfatherGamePlayerId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const before = await patchGame(supabase, gameId, {
    pending_mafia_kill_game_player_id: targetGamePlayerId,
    phase: "night_cop",
  });
  patches.push({ table: "games", id: gameId, before });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "night_godfather",
    actionType: "mafia_kill_target_set",
    actorGamePlayerId: godfatherGamePlayerId,
    targetGamePlayerId,
    patches,
    createdBy: narratorId,
  });
}

/** Shared by Godfather/Cop/Medic/Silencer "Skip Action". */
export async function skipNightStep(
  supabase: Client,
  gameId: string,
  currentPhase: GamePhase,
  nextPhase: GamePhase,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const before = await patchGame(supabase, gameId, { phase: nextPhase });
  patches.push({ table: "games", id: gameId, before });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: currentPhase,
    actionType: "skip_action",
    patches,
    meta: { skippedPhase: currentPhase },
    createdBy: narratorId,
  });
}

// ----------------------------------------------------------------------------
// Night phase: Cop
// ----------------------------------------------------------------------------

export interface CopInvestigateResult {
  result: "MAFIA" | "NOT MAFIA";
  isGodfather: boolean;
  checkCount?: number;
}

export async function copInvestigate(
  supabase: Client,
  gameId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<CopInvestigateResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const players = await getGamePlayers(supabase, gameId);
  const target = players.find((p) => p.id === targetGamePlayerId);
  if (!target) throw new Error("Target not found.");

  const patches: ActionPatch[] = [];
  let result: "MAFIA" | "NOT MAFIA";
  let checkCount: number | undefined;
  const isGodfather = target.role.slug === "godfather";

  if (isGodfather) {
    checkCount = target.godfather_check_count + 1;
    const before = await patchGamePlayer(supabase, targetGamePlayerId, { godfather_check_count: checkCount });
    patches.push({ table: "game_players", id: targetGamePlayerId, before });
    result = checkCount >= 2 ? "MAFIA" : "NOT MAFIA";
  } else {
    result = target.current_alignment === "mafia" ? "MAFIA" : "NOT MAFIA";
  }

  const beforeGame = await patchGame(supabase, gameId, { phase: "night_medic" });
  patches.push({ table: "games", id: gameId, before: beforeGame });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "night_cop",
    actionType: "cop_investigate",
    targetGamePlayerId,
    patches,
    meta: { result, checkCount, isGodfather },
    createdBy: narratorId,
  });

  return { result, isGodfather, checkCount };
}

// ----------------------------------------------------------------------------
// Night phase: Medic
// ----------------------------------------------------------------------------

export async function medicProtect(
  supabase: Client,
  gameId: string,
  medicGamePlayerId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const isSelfSave = medicGamePlayerId === targetGamePlayerId;
  const patches: ActionPatch[] = [];

  if (isSelfSave) {
    const players = await getGamePlayers(supabase, gameId);
    const medic = players.find((p) => p.id === medicGamePlayerId);
    if (!medic) throw new Error("Medic not found.");
    if (medic.self_save_count >= 1) throw new Error("The Medic has already used their self-save.");
    const before = await patchGamePlayer(supabase, medicGamePlayerId, { self_save_count: medic.self_save_count + 1 });
    patches.push({ table: "game_players", id: medicGamePlayerId, before });
  }

  const beforeGame = await patchGame(supabase, gameId, {
    pending_medic_protect_game_player_id: targetGamePlayerId,
    phase: "night_silencer",
  });
  patches.push({ table: "games", id: gameId, before: beforeGame });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "night_medic",
    actionType: "medic_protect",
    actorGamePlayerId: medicGamePlayerId,
    targetGamePlayerId,
    patches,
    meta: { isSelfSave },
    createdBy: narratorId,
  });
}

// ----------------------------------------------------------------------------
// Night phase: Silencer
// ----------------------------------------------------------------------------

export async function silenceTarget(
  supabase: Client,
  gameId: string,
  silencerGamePlayerId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const beforeTarget = await patchGamePlayer(supabase, targetGamePlayerId, {
    silenced_until_round: game.current_round,
  });
  patches.push({ table: "game_players", id: targetGamePlayerId, before: beforeTarget });

  const beforeGame = await patchGame(supabase, gameId, { phase: "night_resolve" });
  patches.push({ table: "games", id: gameId, before: beforeGame });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "night_silencer",
    actionType: "silence",
    actorGamePlayerId: silencerGamePlayerId,
    targetGamePlayerId,
    patches,
    createdBy: narratorId,
  });
}

// ----------------------------------------------------------------------------
// Night resolution
// ----------------------------------------------------------------------------

export interface DeathResult {
  died?: { gamePlayerId: string };
  kamikazeTriggered?: KamikazeTrigger;
}

export interface ResolveNightResult extends DeathResult {
  saved: boolean;
}

export async function resolveNight(supabase: Client, gameId: string, narratorId: string): Promise<ResolveNightResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const meta: Record<string, unknown> = {};
  const result: ResolveNightResult = { saved: false };

  const killTarget = game.pending_mafia_kill_game_player_id;
  const protectedId = game.pending_medic_protect_game_player_id;

  if (killTarget) {
    if (killTarget === protectedId) {
      result.saved = true;
      meta.savedGamePlayerId = killTarget;
    } else {
      const { isKamikaze } = await applyDeath(supabase, gameId, killTarget, "mafia_kill", game.current_round, patches);
      result.died = { gamePlayerId: killTarget };
      if (isKamikaze) result.kamikazeTriggered = { gamePlayerId: killTarget };
      meta.diedGamePlayerId = killTarget;
    }
  }

  const beforeGame = await patchGame(supabase, gameId, {
    pending_mafia_kill_game_player_id: null,
    pending_medic_protect_game_player_id: null,
    phase: "day",
  });
  patches.push({ table: "games", id: gameId, before: beforeGame });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "night_resolve",
    actionType: "resolve_night",
    patches,
    meta,
    createdBy: narratorId,
  });

  return result;
}

/** The follow-up target choice once KAMIKAZE ACTIVATED fires. Recurses
 * naturally: if the chosen target is also a Kamikaze, the caller gets
 * another kamikazeTriggered back and can prompt again. */
export async function resolveKamikaze(
  supabase: Client,
  gameId: string,
  kamikazeGamePlayerId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<DeathResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const { isKamikaze } = await applyDeath(supabase, gameId, targetGamePlayerId, "kamikaze", game.current_round, patches);

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "kamikaze_kill",
    actorGamePlayerId: kamikazeGamePlayerId,
    targetGamePlayerId,
    patches,
    createdBy: narratorId,
  });

  return {
    died: { gamePlayerId: targetGamePlayerId },
    kamikazeTriggered: isKamikaze ? { gamePlayerId: targetGamePlayerId } : undefined,
  };
}

// ----------------------------------------------------------------------------
// Day phase actions
// ----------------------------------------------------------------------------

export async function voteEliminate(
  supabase: Client,
  gameId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<DeathResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const { isKamikaze } = await applyDeath(supabase, gameId, targetGamePlayerId, "vote", game.current_round, patches);

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "vote",
    targetGamePlayerId,
    patches,
    createdBy: narratorId,
  });

  return { died: { gamePlayerId: targetGamePlayerId }, kamikazeTriggered: isKamikaze ? { gamePlayerId: targetGamePlayerId } : undefined };
}

export async function confirmSnipe(
  supabase: Client,
  gameId: string,
  targetGamePlayerId: string,
  responsibleGamePlayerId: string | null,
  narratorId: string,
): Promise<DeathResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const { isKamikaze } = await applyDeath(supabase, gameId, targetGamePlayerId, "snipe", game.current_round, patches);

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "snipe_confirmed",
    actorGamePlayerId: responsibleGamePlayerId,
    targetGamePlayerId,
    patches,
    createdBy: narratorId,
  });

  return { died: { gamePlayerId: targetGamePlayerId }, kamikazeTriggered: isKamikaze ? { gamePlayerId: targetGamePlayerId } : undefined };
}

export async function denySnipe(
  supabase: Client,
  gameId: string,
  targetGamePlayerId: string,
  responsibleGamePlayerId: string | null,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "snipe_denied",
    actorGamePlayerId: responsibleGamePlayerId,
    targetGamePlayerId,
    patches: [],
    createdBy: narratorId,
  });
}

export async function manualDeath(
  supabase: Client,
  gameId: string,
  targetGamePlayerId: string,
  reason: DeathReason,
  narratorId: string,
): Promise<DeathResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const { isKamikaze } = await applyDeath(supabase, gameId, targetGamePlayerId, reason, game.current_round, patches);

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "manual_death",
    targetGamePlayerId,
    patches,
    meta: { reason },
    createdBy: narratorId,
  });

  return { died: { gamePlayerId: targetGamePlayerId }, kamikazeTriggered: isKamikaze ? { gamePlayerId: targetGamePlayerId } : undefined };
}

export interface PriestRevealResult {
  targetName: string;
  baseRoleName: string;
  alignment: Alignment;
  publicLabel: string;
}

export async function applyPriestUse(
  supabase: Client,
  gameId: string,
  priestGamePlayerId: string,
  targetGamePlayerId: string,
  narratorId: string,
): Promise<PriestRevealResult> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const players = await getGamePlayers(supabase, gameId);
  const priest = players.find((p) => p.id === priestGamePlayerId);
  const target = players.find((p) => p.id === targetGamePlayerId);
  if (!priest) throw new Error("Priest not found.");
  if (!target) throw new Error("Target not found.");
  if (!priest.alive) throw new Error("The Priest is not alive.");
  if (priest.role.slug !== "priest") throw new Error("Selected player is not the Priest.");
  if (priest.role_ability_used) throw new Error("The Priest has already used their ability.");

  const patches: ActionPatch[] = [];
  const before = await patchGamePlayer(supabase, priestGamePlayerId, { role_ability_used: true });
  patches.push({ table: "game_players", id: priestGamePlayerId, before });

  const publicLabel = roleDisplayLabel(target);
  const targetName = participantDisplay(target).name;

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "priest_use",
    actorGamePlayerId: priestGamePlayerId,
    targetGamePlayerId,
    patches,
    meta: { targetBaseRole: target.role.name, alignment: target.current_alignment, publicLabel },
    createdBy: narratorId,
  });

  return { targetName, baseRoleName: target.role.name, alignment: target.current_alignment, publicLabel };
}

// ----------------------------------------------------------------------------
// Round / game transitions
// ----------------------------------------------------------------------------

export async function advanceToNextNight(supabase: Client, gameId: string, narratorId: string): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");

  const patches: ActionPatch[] = [];
  const before = await patchGame(supabase, gameId, {
    current_round: game.current_round + 1,
    phase: "night_godfather",
    pending_mafia_kill_game_player_id: null,
    pending_medic_protect_game_player_id: null,
  });
  patches.push({ table: "games", id: gameId, before });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: "day",
    actionType: "next_night",
    patches,
    createdBy: narratorId,
  });
}

export async function finishGame(
  supabase: Client,
  gameId: string,
  winnerAlignment: Alignment,
  narratorId: string,
): Promise<void> {
  const game = await getGame(supabase, gameId);
  if (!game) throw new Error("Game not found.");
  if (game.status === "completed") return; // already saved — safe no-op, no duplicate action/record
  if (!game.started_at) throw new Error("Game hasn't started.");

  const startedMs = new Date(game.started_at).getTime();
  const endedMs = Date.now();
  const durationSeconds = Math.max(0, Math.round((endedMs - startedMs) / 1000) - game.total_paused_seconds);

  const patches: ActionPatch[] = [];
  const before = await patchGame(supabase, gameId, {
    status: "completed",
    ended_at: new Date(endedMs).toISOString(),
    winner_alignment: winnerAlignment,
    official_duration_seconds: durationSeconds,
  });
  patches.push({ table: "games", id: gameId, before });

  await recordAction(supabase, {
    gameId,
    round: game.current_round,
    phase: game.phase,
    actionType: "finish_game",
    patches,
    meta: { winnerAlignment },
    createdBy: narratorId,
  });
}

// ----------------------------------------------------------------------------
// Night recap — built purely from this round's recorded game_actions, never
// hardcoded. Filtered by action_type rather than the games.phase snapshot on
// each action, because a Kamikaze chain triggered during night resolution is
// recorded with phase='day' (resolveNight already advances the phase before
// the follow-up runs) even though it's still part of the same night's story.
// ----------------------------------------------------------------------------

export interface NightRecapMafia {
  action: "kill" | "recruit" | "skip";
  targetName?: string;
  killOutcome?: "killed" | "saved";
  newStatusLabel?: string;
}

export interface NightRecapCopCheck {
  targetName: string;
  result: "MAFIA" | "NOT MAFIA";
  isGodfather: boolean;
  checkCount?: number;
}

export interface NightRecapMedic {
  acted: boolean;
  reason?: string;
  targetName?: string;
  outcome?: "saved" | "no_save" | "not_tested";
  selfSave?: boolean;
  mafiaTargetName?: string;
}

export interface NightRecapSilencer {
  acted: boolean;
  reason?: string;
  targetName?: string;
}

export interface NightRecap {
  round: number;
  recruitsLeft: number;
  mafia: NightRecapMafia;
  cops: NightRecapCopCheck[];
  copsReason?: string;
  medic: NightRecapMedic;
  silencer: NightRecapSilencer;
  kamikaze: { targetName: string }[];
}

function actionMeta(action: { payload: unknown }): Record<string, unknown> {
  const payload = action.payload as ActionPayload | null;
  return payload?.meta ?? {};
}

function capitalizeRoleSlug(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Explains why a role didn't act, using the same eligibility rules the live
 * step UI uses — dead, never existed, or (Medic only) recruited/Dirty. */
function describeRoleAbsence(players: GamePlayerWithDetails[], slug: string): string {
  const holder = players.find((p) => p.role.slug === slug);
  if (!holder) return `No ${capitalizeRoleSlug(slug)} in this game.`;
  if (!holder.alive) return `No living ${capitalizeRoleSlug(slug)} remains.`;
  if (slug === "medic" && holder.current_alignment === "mafia") {
    return `${participantDisplay(holder).name} has been recruited and is now Dirty Medic — no Civilian protection.`;
  }
  return `${capitalizeRoleSlug(slug)} skipped their action.`;
}

const NIGHT_RECAP_ACTION_TYPES = [
  "recruit",
  "mafia_kill_target_set",
  "cop_investigate",
  "medic_protect",
  "silence",
  "resolve_night",
  "kamikaze_kill",
  "skip_action",
];

export async function getNightRecap(supabase: Client, gameId: string, round: number): Promise<NightRecap> {
  const { data, error } = await supabase
    .from("game_actions")
    .select("*")
    .eq("game_id", gameId)
    .eq("round", round)
    .eq("undone", false)
    .in("action_type", NIGHT_RECAP_ACTION_TYPES)
    .order("created_at", { ascending: true });
  throwIfError(error);

  const actions = data ?? [];
  const players = await getGamePlayers(supabase, gameId);
  const nameById = new Map(players.map((p) => [p.id, participantDisplay(p).name]));
  const name = (id: string | null) => (id ? (nameById.get(id) ?? "someone") : "someone");

  const recruit = actions.find((a) => a.action_type === "recruit");
  const killSet = actions.find((a) => a.action_type === "mafia_kill_target_set");
  const resolve = actions.find((a) => a.action_type === "resolve_night");
  const copChecks = actions.filter((a) => a.action_type === "cop_investigate");
  const medicProtect = actions.find((a) => a.action_type === "medic_protect");
  const silence = actions.find((a) => a.action_type === "silence");
  const kamikazeKills = actions.filter((a) => a.action_type === "kamikaze_kill");

  const game = await getGame(supabase, gameId);
  const recruitsLeft = game ? game.godfather_recruits_allowed - game.godfather_recruits_used : 0;

  let mafia: NightRecapMafia;
  if (recruit) {
    const target = players.find((p) => p.id === recruit.target_game_player_id);
    mafia = {
      action: "recruit",
      targetName: name(recruit.target_game_player_id),
      newStatusLabel: target ? roleDisplayLabel(target) : undefined,
    };
  } else if (killSet) {
    const resolveMeta = resolve ? actionMeta(resolve) : {};
    mafia = {
      action: "kill",
      targetName: name(killSet.target_game_player_id),
      killOutcome: resolveMeta.savedGamePlayerId ? "saved" : "killed",
    };
  } else {
    mafia = { action: "skip" };
  }

  const cops: NightRecapCopCheck[] = copChecks.map((check) => {
    const meta = actionMeta(check);
    return {
      targetName: name(check.target_game_player_id),
      result: meta.result === "MAFIA" ? "MAFIA" : "NOT MAFIA",
      isGodfather: Boolean(meta.isGodfather),
      checkCount: typeof meta.checkCount === "number" ? meta.checkCount : undefined,
    };
  });
  const copsReason = cops.length === 0 ? describeRoleAbsence(players, "cop") : undefined;

  let medic: NightRecapMedic;
  if (medicProtect) {
    const meta = actionMeta(medicProtect);
    const targetId = medicProtect.target_game_player_id;
    let outcome: NightRecapMedic["outcome"];
    if (!killSet) {
      outcome = "not_tested";
    } else {
      const resolveMeta = resolve ? actionMeta(resolve) : {};
      outcome = resolveMeta.savedGamePlayerId === targetId ? "saved" : "no_save";
    }
    medic = {
      acted: true,
      targetName: name(targetId),
      outcome,
      selfSave: Boolean(meta.isSelfSave),
      mafiaTargetName: outcome === "no_save" ? name(killSet!.target_game_player_id) : undefined,
    };
  } else {
    medic = { acted: false, reason: describeRoleAbsence(players, "medic") };
  }

  const silencer: NightRecapSilencer = silence
    ? { acted: true, targetName: name(silence.target_game_player_id) }
    : { acted: false, reason: describeRoleAbsence(players, "silencer") };

  const kamikaze = kamikazeKills.map((k) => ({ targetName: name(k.target_game_player_id) }));

  return { round, recruitsLeft, mafia, cops, copsReason, medic, silencer, kamikaze };
}
