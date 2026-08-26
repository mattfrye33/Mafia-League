"use client";

import { useState, useTransition } from "react";
import { deleteGameAdminAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { gameTitle } from "@/lib/utils";
import type { Game } from "@/types/domain";

/** Test/draft/cancelled games get a simple confirm. An official
 * active/paused/completed game requires typing the game's exact title
 * before the delete button enables — a real friction step, not a fake one. */
export function AdminDeleteGameButton({ game }: { game: Game }) {
  const requiresStrongConfirmation = !game.is_test && ["active", "paused", "completed"].includes(game.status);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteGameAdminAction(game.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  if (requiresStrongConfirmation) {
    const expected = gameTitle(game);
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-red-soft">
          This is an official {game.status} game. Type <span className="font-semibold">{expected}</span> to confirm
          permanent deletion.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-48 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-xs text-foreground"
          placeholder={expected}
        />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={pending || typed !== expected} onClick={handleDelete}>
            {pending ? "Deleting..." : "Permanently Delete"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-soft">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="danger" disabled={pending} onClick={handleDelete}>
          {pending ? "Deleting..." : "Confirm Delete"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-soft">{error}</p>}
    </div>
  );
}
