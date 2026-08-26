import type { Alignment, GamePlayerWithDetails } from "@/types/domain";

/**
 * Mafia wins when living Mafia-aligned >= living Civilian-aligned.
 * Civilians win when zero Mafia-aligned remain living.
 * Returns null when neither condition is met yet. Never auto-ends the game —
 * this is only used to surface a confirmation banner to the Narrator.
 */
export function checkWinCondition(players: GamePlayerWithDetails[]): Alignment | null {
  const living = players.filter((p) => p.alive);
  const mafiaCount = living.filter((p) => p.current_alignment === "mafia").length;
  const civilianCount = living.filter((p) => p.current_alignment === "civilian").length;

  if (mafiaCount === 0) return "civilian";
  if (mafiaCount >= civilianCount) return "mafia";
  return null;
}
