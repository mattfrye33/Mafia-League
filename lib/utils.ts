export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatPct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function gameTitle(game: { is_test: boolean; league_number: number | null }): string {
  return game.is_test ? "Test Game" : `Game #${game.league_number ?? "—"}`;
}

interface Participant {
  profile: { full_name: string; nickname: string } | null;
  test_player: { full_name: string; nickname: string | null } | null;
}

export function participantDisplay(gp: Participant): { name: string; isTest: boolean } {
  if (gp.profile) return { name: gp.profile.nickname || gp.profile.full_name, isTest: false };
  if (gp.test_player) return { name: gp.test_player.nickname || gp.test_player.full_name, isTest: true };
  return { name: "Unknown", isTest: false };
}

interface RoleHolder {
  role: { name: string };
  original_alignment: string;
  current_alignment: string;
}

/** "Cop" normally, "Dirty Cop" once a Civilian-side role has been recruited to Mafia. */
export function roleDisplayLabel(gp: RoleHolder): string {
  const isDirty = gp.current_alignment === "mafia" && gp.original_alignment === "civilian";
  return isDirty ? `Dirty ${gp.role.name}` : gp.role.name;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
