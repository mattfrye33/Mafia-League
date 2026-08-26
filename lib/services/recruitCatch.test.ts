import { test } from "node:test";
import assert from "node:assert/strict";
import { wasRecruitCaught } from "./recruitCatch.ts";

const JOE = "gp-joe";
const OTHER_COP = "gp-other-cop";

test("investigate directly catches the exact recruit target", () => {
  const result = wasRecruitCaught({
    recruitTargetId: JOE,
    recruitTargetRoleSlug: "cop",
    roundActions: [
      { action_type: "recruit", target_game_player_id: JOE, payload: null },
      { action_type: "cop_investigate", target_game_player_id: JOE, payload: { meta: { result: "MAFIA" } } },
    ],
    otherLivingCops: [],
  });
  assert.equal(result.caught, true);
  assert.equal(result.by, "cop_investigate");
});

test("investigate on a DIFFERENT target does not catch the recruit", () => {
  const result = wasRecruitCaught({
    recruitTargetId: JOE,
    recruitTargetRoleSlug: "cop",
    roundActions: [
      { action_type: "cop_investigate", target_game_player_id: "someone-else", payload: { meta: { result: "MAFIA" } } },
    ],
    otherLivingCops: [],
  });
  assert.equal(result.caught, false);
});

test("cross check catches a fresh recruit when they are the only dirty cop", () => {
  const result = wasRecruitCaught({
    recruitTargetId: JOE,
    recruitTargetRoleSlug: "cop",
    roundActions: [{ action_type: "cop_cross_check", target_game_player_id: null, payload: { meta: { result: "MAFIA_FOUND" } } }],
    otherLivingCops: [{ id: OTHER_COP, current_alignment: "civilian" }],
  });
  assert.equal(result.caught, true);
  assert.equal(result.by, "cop_cross_check");
});

// Regression test for the Joe Wiegand / Game #2 bug: a MAFIA_FOUND cross
// check result must NOT be blamed on this round's fresh recruit if it's
// already fully explained by a different, already-dirty Cop.
test("cross check does NOT catch the recruit when another Cop is already dirty (regression)", () => {
  const result = wasRecruitCaught({
    recruitTargetId: JOE,
    recruitTargetRoleSlug: "cop",
    roundActions: [{ action_type: "cop_cross_check", target_game_player_id: null, payload: { meta: { result: "MAFIA_FOUND" } } }],
    otherLivingCops: [{ id: OTHER_COP, current_alignment: "mafia" }],
  });
  assert.equal(result.caught, false);
});

test("cross check never catches a non-Cop recruit target", () => {
  const result = wasRecruitCaught({
    recruitTargetId: "gp-civilian",
    recruitTargetRoleSlug: "civilian",
    roundActions: [{ action_type: "cop_cross_check", target_game_player_id: null, payload: { meta: { result: "MAFIA_FOUND" } } }],
    otherLivingCops: [],
  });
  assert.equal(result.caught, false);
});

test("no investigate or cross check this round leaves the recruit uncaught", () => {
  const result = wasRecruitCaught({
    recruitTargetId: JOE,
    recruitTargetRoleSlug: "cop",
    roundActions: [{ action_type: "recruit", target_game_player_id: JOE, payload: null }],
    otherLivingCops: [],
  });
  assert.equal(result.caught, false);
});
