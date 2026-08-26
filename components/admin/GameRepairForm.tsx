"use client";

import { useState, useTransition } from "react";
import { repairGameAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import type { Alignment, Game, GameStatus } from "@/types/domain";

const STATUSES: GameStatus[] = ["draft", "active", "paused", "completed", "cancelled"];

export function GameRepairForm({ game }: { game: Game }) {
  const [status, setStatus] = useState<GameStatus>(game.status);
  const [isTest, setIsTest] = useState(game.is_test);
  const [winner, setWinner] = useState<Alignment | "">(game.winner_alignment ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    game.official_duration_seconds ? Math.round(game.official_duration_seconds / 60) : "",
  );
  const [leagueNumber, setLeagueNumber] = useState(game.league_number ?? "");
  const [endedDate, setEndedDate] = useState(game.ended_at ? game.ended_at.slice(0, 10) : "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await repairGameAction(game.id, {
          status,
          is_test: isTest,
          winner_alignment: status === "completed" ? (winner || null) : null,
          official_duration_seconds:
            durationMinutes === "" ? null : Math.round(Number(durationMinutes) * 60),
          league_number: isTest ? null : leagueNumber === "" ? null : Number(leagueNumber),
          ended_at: endedDate === "" ? null : new Date(`${endedDate}T12:00:00`).toISOString(),
        });
        setMessage("Saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save repair.");
      }
    });
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-muted">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as GameStatus)}
          className="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-muted">Official / Test</span>
        <select
          value={isTest ? "test" : "official"}
          onChange={(e) => setIsTest(e.target.value === "test")}
          className="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground"
        >
          <option value="official">Official</option>
          <option value="test">Test</option>
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-muted">Winner</span>
        <select
          value={winner}
          onChange={(e) => setWinner(e.target.value as Alignment | "")}
          disabled={status !== "completed"}
          className="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground disabled:opacity-50"
        >
          <option value="">— none —</option>
          <option value="civilian">Civilians</option>
          <option value="mafia">Mafia</option>
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-muted">Duration (minutes)</span>
        <input
          type="number"
          min={0}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-muted">Date</span>
        <input
          type="date"
          value={endedDate}
          onChange={(e) => setEndedDate(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-muted">League Number</span>
        <input
          type="number"
          min={1}
          value={leagueNumber}
          disabled={isTest}
          onChange={(e) => setLeagueNumber(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground disabled:opacity-50"
        />
        {isTest && <span className="mt-1 block text-xs text-muted">Test games are always unnumbered.</span>}
      </label>

      <div className="flex items-end gap-3 sm:col-span-2">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Repair"}
        </Button>
        {message && <p className="text-sm text-civilian">{message}</p>}
        {error && <p className="text-sm text-red-soft">{error}</p>}
      </div>
    </div>
  );
}
