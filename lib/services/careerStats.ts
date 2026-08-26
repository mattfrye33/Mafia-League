import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { EMPTY_CAREER_STATS, type Alignment, type DeathReason, type PlayerCareerStats } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

const OFFICIAL_GAME_PLAYER_SELECT =
  // game_players<->games now has 3 FKs (game_id, plus games' two pending_*
  // columns pointing back at game_players), so the embed must say which —
  // "games!game_id" — or PostgREST can't tell them apart (PGRST201).
  "id, player_id, current_alignment, recruited, alive, death_reason, game:games!game_id(id, status, is_test, winner_alignment, official_duration_seconds), role:roles(slug)";

export interface OfficialGamePlayerRow {
  id: string;
  player_id: string | null;
  current_alignment: Alignment;
  recruited: boolean;
  alive: boolean;
  death_reason: DeathReason | null;
  game: {
    id: string;
    status: string;
    is_test: boolean;
    winner_alignment: Alignment | null;
    official_duration_seconds: number | null;
  } | null;
  role: { slug: string } | null;
}

function isOfficialRow(r: { game: { status: string; is_test: boolean } | null }): boolean {
  return r.game?.status === "completed" && r.game?.is_test === false;
}

/** Every real player's official completed-game participation rows, league-wide
 * — the one shared fetch behind both the Leaderboard's per-player stats and
 * the All-Time League Stats aggregates, so both read the exact same rows. */
export async function fetchAllOfficialGamePlayerRows(supabase: Client): Promise<OfficialGamePlayerRow[]> {
  const { data, error } = await supabase.from("game_players").select(OFFICIAL_GAME_PLAYER_SELECT);
  throwIfError(error);
  return ((data ?? []) as OfficialGamePlayerRow[]).filter((r) => isOfficialRow(r) && r.player_id);
}

interface StatAction {
  game_id: string;
  round: number;
  action_type: string;
  actor_game_player_id: string | null;
  target_game_player_id: string | null;
  payload: unknown;
}

/**
 * Pure aggregation shared by both the single-player career page and the
 * league-wide leaderboard — this is the ONE place stats math lives. `rows`
 * must already be filtered to one player's official completed-game rows;
 * `actions` may be a superset (e.g. the whole league's action log) since
 * every check below re-scopes to `rows`' own game_player ids.
 */
function computeStatsFromRows(rows: OfficialGamePlayerRow[], actions: StatAction[]): PlayerCareerStats {
  if (rows.length === 0) return { ...EMPTY_CAREER_STATS };

  const gamePlayerIds = new Set(rows.map((r) => r.id));
  const belongsToPlayer = (id: string | null) => Boolean(id && gamePlayerIds.has(id));
  const actionList = actions.filter((a) => belongsToPlayer(a.actor_game_player_id) || belongsToPlayer(a.target_game_player_id));

  let wins = 0;
  let mafiaGames = 0;
  let mafiaWins = 0;
  let civilianGames = 0;
  let civilianWins = 0;
  let godfatherGames = 0;
  let godfatherWins = 0;
  let timesRecruited = 0;
  let totalMafiaHoursSeconds = 0;
  let copGames = 0;
  let medicGames = 0;
  let priestGames = 0;
  let kamikazeGames = 0;
  let silencerGames = 0;
  let civilianRoleGames = 0;
  let timesSurvived = 0;
  let timesKilledByMafia = 0;
  let timesVotedOut = 0;
  let timesSniped = 0;
  let timesKilledByKamikaze = 0;
  let timesManuallyKilled = 0;

  for (const r of rows) {
    const won = r.current_alignment === r.game!.winner_alignment;
    if (won) wins++;
    if (r.current_alignment === "mafia") {
      mafiaGames++;
      if (won) mafiaWins++;
    } else {
      civilianGames++;
      if (won) civilianWins++;
    }
    switch (r.role?.slug) {
      case "godfather":
        godfatherGames++;
        if (won) godfatherWins++;
        break;
      case "cop":
        copGames++;
        break;
      case "medic":
        medicGames++;
        break;
      case "priest":
        priestGames++;
        break;
      case "kamikaze":
        kamikazeGames++;
        break;
      case "silencer":
        silencerGames++;
        break;
      case "civilian":
        civilianRoleGames++;
        break;
    }
    if (r.recruited) timesRecruited++;
    totalMafiaHoursSeconds += r.game!.official_duration_seconds ?? 0;

    if (r.alive) {
      timesSurvived++;
    } else {
      switch (r.death_reason) {
        case "mafia_kill":
          timesKilledByMafia++;
          break;
        case "vote":
          timesVotedOut++;
          break;
        case "snipe":
          timesSniped++;
          break;
        case "kamikaze":
          timesKilledByKamikaze++;
          break;
        case "manual":
          timesManuallyKilled++;
          break;
      }
    }
  }

  // A recruit action only counts as "successful" if the Cops didn't catch it
  // that same round (resolve_night records the catch, if any, in its meta) —
  // a caught recruit is reverted to Civilian and must not count as a win for
  // the Godfather.
  const recruitAttempts = actionList.filter(
    (a) => a.action_type === "recruit" && belongsToPlayer(a.actor_game_player_id),
  );
  const successfulRecruits = recruitAttempts.filter((r) => {
    const resolve = actions.find(
      (a) => a.action_type === "resolve_night" && a.game_id === r.game_id && a.round === r.round,
    );
    const meta = (resolve?.payload as { meta?: Record<string, unknown> } | null)?.meta;
    return meta?.recruitCaughtGamePlayerId !== r.target_game_player_id;
  }).length;
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
    const resolve = actions.find(
      (a) => a.action_type === "resolve_night" && a.game_id === mp.game_id && a.round === mp.round,
    );
    const meta = (resolve?.payload as { meta?: Record<string, unknown> } | null)?.meta;
    if (meta?.savedGamePlayerId === mp.target_game_player_id) medicSaves++;
  }

  const gamesPlayed = rows.length;

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
    copGames,
    medicGames,
    priestGames,
    kamikazeGames,
    silencerGames,
    civilianRoleGames,
    timesSurvived,
    totalDeaths: gamesPlayed - timesSurvived,
    timesKilledByMafia,
    timesVotedOut,
    timesSniped,
    timesKilledByKamikaze,
    timesManuallyKilled,
  };
}

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
    .select(OFFICIAL_GAME_PLAYER_SELECT)
    .eq("player_id", playerId);
  throwIfError(error);

  const official = ((rows ?? []) as OfficialGamePlayerRow[]).filter(isOfficialRow);
  if (official.length === 0) return { ...EMPTY_CAREER_STATS };

  const { data: actions, error: actionsError } = await supabase.rpc("get_player_stat_actions", {
    target_player_id: playerId,
  });
  throwIfError(actionsError);

  return computeStatsFromRows(official, actions ?? []);
}

/**
 * League-wide career stats for every real player, in one pass — powers the
 * Leaderboard without an N+1 RPC call per player. Reuses the exact same
 * computeStatsFromRows math as the single-player path above.
 */
export async function getLeagueCareerStats(supabase: Client): Promise<Map<string, PlayerCareerStats>> {
  const official = await fetchAllOfficialGamePlayerRows(supabase);

  const { data: actions, error: actionsError } = await supabase.rpc("get_official_actions_for_stats");
  throwIfError(actionsError);
  const actionList = actions ?? [];

  const byPlayer = new Map<string, OfficialGamePlayerRow[]>();
  for (const r of official) {
    const list = byPlayer.get(r.player_id!) ?? [];
    list.push(r);
    byPlayer.set(r.player_id!, list);
  }

  const result = new Map<string, PlayerCareerStats>();
  for (const [playerId, playerRows] of byPlayer) {
    result.set(playerId, computeStatsFromRows(playerRows, actionList));
  }
  return result;
}

export interface RecentGame {
  gameId: string;
  leagueNumber: number | null;
  roleName: string;
  roleSlug: string;
  originalAlignment: Alignment;
  currentAlignment: Alignment;
  winnerAlignment: Alignment | null;
  won: boolean;
  endedAt: string | null;
}

/** Most recent completed official games this player was in, newest first. */
export async function getRecentGames(supabase: Client, playerId: string, limit = 5): Promise<RecentGame[]> {
  const { data, error } = await supabase
    .from("game_players")
    .select(
      "current_alignment, original_alignment, game:games!game_id(id, league_number, status, is_test, winner_alignment, ended_at), role:roles(name, slug)",
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
      roleSlug: r.role?.slug ?? "",
      originalAlignment: r.original_alignment as Alignment,
      currentAlignment: r.current_alignment as Alignment,
      winnerAlignment: r.game!.winner_alignment as Alignment | null,
      won: r.current_alignment === r.game!.winner_alignment,
      endedAt: r.game!.ended_at,
    }));
}
