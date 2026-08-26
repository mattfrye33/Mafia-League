import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Badge, PlayerCareerStats } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";
import { getPlayerCareerStats } from "@/lib/services/careerStats";

type Client = SupabaseClient<Database>;

export async function listBadges(supabase: Client): Promise<Badge[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  throwIfError(error);
  return (data ?? []) as Badge[];
}

/**
 * Pure evaluation over already-computed career stats — no database access,
 * so it's trivial to add a new badge later: add a row via migration, add one
 * line here keyed by its slug. Stats themselves already exclude Test Games
 * entirely (getPlayerCareerStats only ever looks at completed, non-test
 * games), so a badge can never be earned from one.
 */
export function evaluateEarnedBadgeSlugs(stats: PlayerCareerStats): Set<string> {
  const earned = new Set<string>();
  if (stats.gamesPlayed >= 1) earned.add("first_game");
  if (stats.wins >= 1) earned.add("first_win");
  if (stats.gamesPlayed >= 10) earned.add("veteran");
  if (stats.mafiaGames >= 10) earned.add("mafia_regular");
  if (stats.civilianGames >= 10) earned.add("civilian_regular");
  if (stats.godfatherWins >= 1) earned.add("godfather_victory");
  if (stats.godfatherWins >= 2) earned.add("mastermind");
  if (stats.successfulRecruits >= 1) earned.add("recruiter");
  if (stats.successfulSnipes >= 1) earned.add("snipe");
  if (stats.successfulSnipes >= 2) earned.add("sharpshooter");
  if (stats.medicSaves >= 1) earned.add("medic_save");
  if (stats.medicSaves >= 2) earned.add("guardian");
  if (stats.priestUses >= 1) earned.add("priest");
  if (stats.kamikazeKills >= 1) earned.add("kamikaze");
  return earned;
}

export async function getPlayerBadges(
  supabase: Client,
  playerId: string,
): Promise<{ earned: Badge[]; locked: Badge[] }> {
  const [allBadges, stats] = await Promise.all([listBadges(supabase), getPlayerCareerStats(supabase, playerId)]);
  const earnedSlugs = evaluateEarnedBadgeSlugs(stats);
  return {
    earned: allBadges.filter((b) => earnedSlugs.has(b.slug)),
    locked: allBadges.filter((b) => !earnedSlugs.has(b.slug)),
  };
}

export async function getFeaturedBadges(supabase: Client, playerId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from("profile_featured_badges")
    .select("position, badge:badges(*)")
    .eq("profile_id", playerId)
    .order("position", { ascending: true });
  throwIfError(error);
  return (data ?? []).map((r) => r.badge).filter((b): b is Badge => Boolean(b));
}

export async function setFeaturedBadges(supabase: Client, playerId: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length > 3) throw new Error("You can feature at most 3 badges.");

  const { earned } = await getPlayerBadges(supabase, playerId);
  const earnedIds = new Set(earned.map((b) => b.id));
  for (const id of badgeIds) {
    if (!earnedIds.has(id)) throw new Error("You can only feature a badge you've earned.");
  }

  const { error: deleteError } = await supabase.from("profile_featured_badges").delete().eq("profile_id", playerId);
  throwIfError(deleteError);

  if (badgeIds.length === 0) return;

  const rows = badgeIds.map((badgeId, i) => ({ profile_id: playerId, badge_id: badgeId, position: i + 1 }));
  const { error: insertError } = await supabase.from("profile_featured_badges").insert(rows);
  throwIfError(insertError);
}
