import type { Alignment } from "@/types/domain";

export interface RoundAction {
  action_type: string;
  target_game_player_id: string | null;
  payload: unknown;
}

export interface LivingCop {
  id: string;
  current_alignment: Alignment;
}

export interface RecruitCatchInput {
  recruitTargetId: string;
  recruitTargetRoleSlug: string;
  /** Every game_actions row from this exact round (recruit/cop_investigate/cop_cross_check). */
  roundActions: RoundAction[];
  /** Every OTHER living Cop besides the recruit target (excludes the target itself). */
  otherLivingCops: LivingCop[];
}

export interface RecruitCatchResult {
  caught: boolean;
  by?: "cop_investigate" | "cop_cross_check";
}

function metaResult(a: RoundAction): string | undefined {
  return (a.payload as { meta?: { result?: string } } | null)?.meta?.result;
}

/**
 * Decides whether this round's recruit attempt was caught by the Cops.
 * Extracted out of resolveNight() so this exact decision — the one that
 * previously falsely reverted a successful recruit (Joe Wiegand, Game #2) —
 * can be unit-tested without a database.
 *
 * Investigate is precise: it names one target, so a MAFIA result on the
 * exact recruit target this round is unambiguous.
 *
 * Cross Check is a group signal only ("at least one Dirty Cop exists among
 * the living Cops") — it can only be blamed on THIS round's fresh recruit if
 * no OTHER living Cop is already Mafia-aligned. If one is, the MAFIA_FOUND
 * result is already fully explained by that other Cop and must not falsely
 * revert an unrelated, successful recruit.
 */
export function wasRecruitCaught(input: RecruitCatchInput): RecruitCatchResult {
  const { recruitTargetId, recruitTargetRoleSlug, roundActions, otherLivingCops } = input;

  const caughtByInvestigate = roundActions.some(
    (a) => a.action_type === "cop_investigate" && a.target_game_player_id === recruitTargetId && metaResult(a) === "MAFIA",
  );
  if (caughtByInvestigate) return { caught: true, by: "cop_investigate" };

  const otherLivingDirtyCop = otherLivingCops.some((c) => c.current_alignment === "mafia");
  const caughtByCrossCheck =
    recruitTargetRoleSlug === "cop" &&
    !otherLivingDirtyCop &&
    roundActions.some((a) => a.action_type === "cop_cross_check" && metaResult(a) === "MAFIA_FOUND");

  return caughtByCrossCheck ? { caught: true, by: "cop_cross_check" } : { caught: false };
}
