import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStatsFromRows, type OfficialGamePlayerRow } from "./careerStats.ts";
import type { Alignment } from "@/types/domain";

function row(opts: {
  currentAlignment: Alignment;
  roleSlug: string;
  winnerAlignment: Alignment;
  recruited?: boolean;
}): OfficialGamePlayerRow {
  return {
    id: "gp-1",
    player_id: "player-1",
    current_alignment: opts.currentAlignment,
    recruited: opts.recruited ?? false,
    alive: true,
    death_reason: null,
    game: {
      id: "game-1",
      status: "completed",
      is_test: false,
      winner_alignment: opts.winnerAlignment,
      official_duration_seconds: 1800,
    },
    role: { slug: opts.roleSlug },
  };
}

// Regression coverage for the "recruited players must count by FINAL
// alignment, not base role" bug: a Dirty Cop must count toward Mafia
// Games/Wins/Losses (never Civilian), while still separately counting
// toward Cop Games via base role.

test("Dirty Cop + Mafia loses => Mafia Game, Mafia Loss, Cop Game, NOT Civilian Game", () => {
  const stats = computeStatsFromRows(
    [row({ currentAlignment: "mafia", roleSlug: "cop", winnerAlignment: "civilian", recruited: true })],
    [],
  );
  assert.equal(stats.gamesPlayed, 1);
  assert.equal(stats.wins, 0);
  assert.equal(stats.losses, 1);
  assert.equal(stats.mafiaGames, 1);
  assert.equal(stats.mafiaWins, 0);
  assert.equal(stats.civilianGames, 0);
  assert.equal(stats.copGames, 1);
});

test("Dirty Cop + Mafia wins => Mafia Game, Mafia Win, Cop Game", () => {
  const stats = computeStatsFromRows(
    [row({ currentAlignment: "mafia", roleSlug: "cop", winnerAlignment: "mafia", recruited: true })],
    [],
  );
  assert.equal(stats.wins, 1);
  assert.equal(stats.mafiaGames, 1);
  assert.equal(stats.mafiaWins, 1);
  assert.equal(stats.civilianGames, 0);
  assert.equal(stats.copGames, 1);
});

test("Clean Cop + Civilians win => Civilian Game, Civilian Win, Cop Game", () => {
  const stats = computeStatsFromRows(
    [row({ currentAlignment: "civilian", roleSlug: "cop", winnerAlignment: "civilian" })],
    [],
  );
  assert.equal(stats.wins, 1);
  assert.equal(stats.civilianGames, 1);
  assert.equal(stats.civilianWins, 1);
  assert.equal(stats.mafiaGames, 0);
  assert.equal(stats.copGames, 1);
});

test("Recruited Civilian + Mafia wins => Mafia Game/Win, civilian BASE-ROLE game, not alignment Civilian Game", () => {
  const stats = computeStatsFromRows(
    [row({ currentAlignment: "mafia", roleSlug: "civilian", winnerAlignment: "mafia", recruited: true })],
    [],
  );
  assert.equal(stats.mafiaGames, 1);
  assert.equal(stats.mafiaWins, 1);
  assert.equal(stats.civilianGames, 0);
  assert.equal(stats.civilianRoleGames, 1);
});

test("Godfather + Mafia loses => Mafia Game, Mafia Loss, Godfather Game", () => {
  const stats = computeStatsFromRows(
    [row({ currentAlignment: "mafia", roleSlug: "godfather", winnerAlignment: "civilian" })],
    [],
  );
  assert.equal(stats.mafiaGames, 1);
  assert.equal(stats.mafiaWins, 0);
  assert.equal(stats.godfatherGames, 1);
  assert.equal(stats.godfatherWins, 0);
});
