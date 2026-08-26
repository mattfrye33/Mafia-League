import type { RoleCounts } from "@/types/domain";

// Deliberately excludes "mafia" — at game start the only Mafia-aligned
// player is the Godfather. The Mafia role still exists in the `roles` table
// for the architecture (and a Narrator can still hand-assign it to a
// specific player via manual reassignment), but it is not part of the
// default setup/randomization flow, so it has no configurable count here.
export const ROLE_SLUGS = [
  "godfather",
  "cop",
  "medic",
  "priest",
  "kamikaze",
  "silencer",
  "civilian",
] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

const SPECIAL_ROLE_KEYS: (keyof RoleCounts)[] = [
  "godfather",
  "cop",
  "medic",
  "priest",
  "kamikaze",
  "silencer",
];

export function emptyRoleCounts(): RoleCounts {
  return {
    godfather: 0,
    cop: 0,
    medic: 0,
    priest: 0,
    kamikaze: 0,
    silencer: 0,
    civilian: 0,
    godfatherRecruits: 0,
  };
}

function sumSpecialRoles(counts: RoleCounts): number {
  return SPECIAL_ROLE_KEYS.reduce((sum, key) => sum + counts[key], 0);
}

/** Total role slots assigned. godfatherRecruits is intentionally excluded. */
export function totalAssigned(counts: RoleCounts): number {
  return sumSpecialRoles(counts) + counts.civilian;
}

/**
 * Sensible starting point for a given player count: exactly 1 Godfather
 * (the only starting Mafia-aligned player), normally 2 Cops, and the usual
 * one-each special roles. Always overridable by the Narrator afterward —
 * this is only a starting point.
 */
export function recommendedRoleCounts(totalPlayers: number): RoleCounts {
  const counts = emptyRoleCounts();
  if (totalPlayers <= 0) return counts;

  counts.godfather = 1;
  counts.cop = totalPlayers >= 6 ? 2 : totalPlayers >= 3 ? 1 : 0;
  counts.medic = totalPlayers >= 4 ? 1 : 0;
  counts.priest = totalPlayers >= 5 ? 1 : 0;
  counts.kamikaze = totalPlayers >= 6 ? 1 : 0;
  counts.silencer = totalPlayers >= 7 ? 1 : 0;
  counts.godfatherRecruits = totalPlayers >= 8 ? 1 : 0;

  // Scale back the lowest-priority roles first if a small group can't fit them all.
  const reducePriority: (keyof RoleCounts)[] = ["silencer", "kamikaze", "priest", "cop", "medic"];
  for (const key of reducePriority) {
    while (sumSpecialRoles(counts) > totalPlayers && counts[key] > 0) {
      counts[key]--;
    }
    if (sumSpecialRoles(counts) <= totalPlayers) break;
  }

  counts.civilian = Math.max(0, totalPlayers - sumSpecialRoles(counts));
  return counts;
}

/** Expands { cop: 2, ... } into ["cop", "cop", ...] for shuffling against players. */
export function buildRoleSlugList(counts: RoleCounts): RoleSlug[] {
  const list: RoleSlug[] = [];
  for (const slug of ROLE_SLUGS) {
    for (let i = 0; i < counts[slug]; i++) list.push(slug);
  }
  return list;
}

// Fixed order for the Narrator's secret role-assignment overview, so it's
// physically the same every game to read straight down while assigning
// roles in person. Deliberately separate from ROLE_SLUGS (which governs the
// setup-screen stepper order) — this one only controls display order and is
// unrelated to role counts or randomization.
const NARRATOR_REVIEW_ORDER = ["godfather", "cop", "medic", "priest", "silencer", "kamikaze"];

/** Sort rank for a role slug in the Narrator's review overview. Civilian is
 * always last; any role not in the known list (including "mafia", which is
 * only ever hand-assigned) sorts after the known specials but before
 * Civilian, so it can't break the screen if new roles are added later. */
export function roleReviewRank(slug: string): number {
  const idx = NARRATOR_REVIEW_ORDER.indexOf(slug);
  if (idx !== -1) return idx;
  if (slug === "civilian") return NARRATOR_REVIEW_ORDER.length + 1;
  return NARRATOR_REVIEW_ORDER.length;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
