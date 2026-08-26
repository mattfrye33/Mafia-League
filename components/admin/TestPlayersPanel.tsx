"use client";

import { useState, useTransition } from "react";
import {
  createTestPlayerAction,
  generateTestPlayersAction,
  deleteTestPlayerAction,
  deleteAllTestPlayersAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClass } from "@/components/ui/AuthShell";
import type { TestPlayer } from "@/types/domain";

export function TestPlayersPanel({ testPlayers }: { testPlayers: TestPlayer[] }) {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createTestPlayerAction(fullName.trim(), nickname.trim());
        setFullName("");
        setNickname("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add test player.");
      }
    });
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        await generateTestPlayersAction();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate test players.");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTestPlayerAction(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  function handleDeleteAll() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAllTestPlayersAction();
        setConfirmingReset(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reset.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={pending} onClick={handleGenerate}>
          Generate 12 Test Players
        </Button>
        {testPlayers.length > 0 &&
          (confirmingReset ? (
            <>
              <span className="text-sm text-muted">Delete all {testPlayers.length}?</span>
              <Button variant="danger" disabled={pending} onClick={handleDeleteAll}>
                Confirm Delete All
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="danger" disabled={pending} onClick={() => setConfirmingReset(true)}>
              Delete All Test Players
            </Button>
          ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <Field label="Name">
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Nickname (optional)">
          <input className={inputClass} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Button type="submit" disabled={pending || !fullName.trim()}>
          Add
        </Button>
      </form>

      {error && <p className="text-sm text-red-soft">{error}</p>}

      {testPlayers.length === 0 ? (
        <p className="text-sm text-muted">No test players yet.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {testPlayers.map((tp) => (
            <div
              key={tp.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{tp.nickname || tp.full_name}</p>
                <Badge tone="gold">TEST PLAYER</Badge>
              </div>
              <button
                onClick={() => handleDelete(tp.id)}
                disabled={pending}
                className="text-xs text-red-soft hover:text-red"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
