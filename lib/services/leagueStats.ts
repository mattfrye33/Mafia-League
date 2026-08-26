import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { throwIfError } from "@/lib/supabase/errors";
import { fetchAllOfficialGamePlayerRows } from "@/lib/services/careerStats";

type Client = SupabaseClient<Database>;

export interface LeagueSummary {
  gamesPlayed: number;
  mafiaWins: number;
  civilianWins: number;
  mafiaWinPct: number;
  civilianWinPct: number;
  totalMafiaHoursSeconds: number;
  avgGameDurationSeconds: number;
  longestGameSeconds: number;
  shortestGameSeconds: number;
  totalPlayers: number;
}

/**
 * League-wide summary — total official games, win split, and duration
 * figures. Game-level numbers (duration, winner) come straight from `games`
 * (one row per game); "Total Players" comes from the same official
 * game_players rows the Leaderboard already fetches, so both always agree.
 */
export async function getLeagueSummary(supabase: Client): Promise<LeagueSummary> {
  const [{ data: games, error }, officialPlayerRows] = await Promise.all([
    supabase
      .from("games")
      .select("official_duration_seconds, winner_alignment")
      .eq("status", "completed")
      .eq("is_test", false),
    fetchAllOfficialGamePlayerRows(supabase),
  ]);
  throwIfError(error);

  const rows = games ?? [];
  const gamesPlayed = rows.length;
  const mafiaWins = rows.filter((g) => g.winner_alignment === "mafia").length;
  const civilianWins = rows.filter((g) => g.winner_alignment === "civilian").length;
  const durations = rows.map((g) => g.official_duration_seconds ?? 0).filter((d) => d > 0);
  const totalMafiaHoursSeconds = durations.reduce((sum, d) => sum + d, 0);

  const totalPlayers = new Set(officialPlayerRows.map((r) => r.player_id)).size;

  return {
    gamesPlayed,
    mafiaWins,
    civilianWins,
    mafiaWinPct: gamesPlayed ? Math.round((mafiaWins / gamesPlayed) * 100) : 0,
    civilianWinPct: gamesPlayed ? Math.round((civilianWins / gamesPlayed) * 100) : 0,
    totalMafiaHoursSeconds,
    avgGameDurationSeconds: durations.length ? Math.round(totalMafiaHoursSeconds / durations.length) : 0,
    longestGameSeconds: durations.length ? Math.max(...durations) : 0,
    shortestGameSeconds: durations.length ? Math.min(...durations) : 0,
    totalPlayers,
  };
}

export interface LeagueActionTotals {
  mafiaKills: number;
  successfulRecruits: number;
  caughtRecruits: number;
  successfulSnipes: number;
  copInvestigations: number;
  copCrossChecks: number;
  mafiaFoundByCops: number;
  medicSaves: number;
  priestUses: number;
  kamikazeKills: number;
  silences: number;
  voteEliminations: number;
  manualDeaths: number;
}

/**
 * Cumulative action totals across every official completed game. Death-type
 * totals (Mafia Kills, Vote Eliminations, Manual Deaths) come from
 * game_players.death_reason — the same field player Survival Stats use.
 * Ability-usage totals come from the narrow get_official_actions_for_stats()
 * RPC (0010/0012) — game_actions itself stays narrator/admin-only.
 */
export async function getLeagueActionTotals(supabase: Client): Promise<LeagueActionTotals> {
  const [officialPlayerRows, { data: actions, error: actionsError }] = await Promise.all([
    fetchAllOfficialGamePlayerRows(supabase),
    supabase.rpc("get_official_actions_for_stats"),
  ]);
  throwIfError(actionsError);
  const actionList = actions ?? [];

  const countDeaths = (reason: string) => officialPlayerRows.filter((r) => r.death_reason === reason).length;

  const recruitAttempts = actionList.filter((a) => a.action_type === "recruit");
  const caughtRecruits = recruitAttempts.filter((r) => {
    const resolve = actionList.find(
      (a) => a.action_type === "resolve_night" && a.game_id === r.game_id && a.round === r.round,
    );
    const meta = (resolve?.payload as { meta?: Record<string, unknown> } | null)?.meta;
    return meta?.recruitCaughtGamePlayerId === r.target_game_player_id;
  }).length;

  const medicProtects = actionList.filter((a) => a.action_type === "medic_protect");
  const medicSaves = medicProtects.filter((mp) => {
    const resolve = actionList.find(
      (a) => a.action_type === "resolve_night" && a.game_id === mp.game_id && a.round === mp.round,
    );
    const meta = (resolve?.payload as { meta?: Record<string, unknown> } | null)?.meta;
    return meta?.savedGamePlayerId === mp.target_game_player_id;
  }).length;

  const copInvestigations = actionList.filter((a) => a.action_type === "cop_investigate");
  const copCrossChecks = actionList.filter((a) => a.action_type === "cop_cross_check");
  const investigateMeta = (a: (typeof copInvestigations)[number]) =>
    (a.payload as { meta?: { result?: string } } | null)?.meta;
  const mafiaFoundByCops =
    copInvestigations.filter((a) => investigateMeta(a)?.result === "MAFIA").length +
    copCrossChecks.filter((a) => investigateMeta(a)?.result === "MAFIA_FOUND").length;

  return {
    mafiaKills: countDeaths("mafia_kill"),
    successfulRecruits: recruitAttempts.length - caughtRecruits,
    caughtRecruits,
    successfulSnipes: actionList.filter((a) => a.action_type === "snipe_confirmed").length,
    copInvestigations: copInvestigations.length,
    copCrossChecks: copCrossChecks.length,
    mafiaFoundByCops,
    medicSaves,
    priestUses: actionList.filter((a) => a.action_type === "priest_use").length,
    kamikazeKills: actionList.filter((a) => a.action_type === "kamikaze_kill").length,
    silences: actionList.filter((a) => a.action_type === "silence").length,
    voteEliminations: countDeaths("vote"),
    manualDeaths: countDeaths("manual"),
  };
}
