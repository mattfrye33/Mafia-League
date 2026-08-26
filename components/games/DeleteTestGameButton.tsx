"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTestGameAction } from "@/app/play/actions";
import { Button } from "@/components/ui/Button";

export function DeleteTestGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTestGameAction(gameId);
        router.refresh();
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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="danger" disabled={pending} onClick={confirmDelete}>
          {pending ? "Deleting..." : "Confirm"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-soft">{error}</p>}
    </div>
  );
}
