"use client";

import { useState, useTransition } from "react";
import { resolveKamikazeAction } from "@/app/play/engineActions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlayerPicker } from "@/components/games/PlayerPicker";
import { participantDisplay } from "@/lib/utils";
import type { GamePlayerWithDetails } from "@/types/domain";

/** Shown whenever a death reveals the deceased was a Kamikaze. Recurses on
 * its own if the chosen target is also a Kamikaze — onResolved only fires
 * once the chain is fully done. */
export function KamikazeFollowUp({
  gameId,
  kamikazeGamePlayerId,
  players,
  onResolved,
}: {
  gameId: string;
  kamikazeGamePlayerId: string;
  players: GamePlayerWithDetails[];
  onResolved: () => void;
}) {
  const [activeKamikazeId, setActiveKamikazeId] = useState(kamikazeGamePlayerId);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const eligible = players.filter((p) => p.alive && p.id !== activeKamikazeId);

  function confirm() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        const result = await resolveKamikazeAction(gameId, activeKamikazeId, targetId);
        if (result.kamikazeTriggered) {
          setActiveKamikazeId(result.kamikazeTriggered.gamePlayerId);
          setSelected(null);
        } else {
          onResolved();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4 border-mafia/40">
      <div>
        <p className="font-heading text-xl text-red-soft">KAMIKAZE ACTIVATED</p>
        <p className="mt-1 text-sm text-muted">Choose one living player to take down with them.</p>
      </div>
      <PlayerPicker
        options={eligible.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
        selectedId={selected}
        onSelect={setSelected}
        disabled={pending}
      />
      {error && <p className="text-sm text-red-soft">{error}</p>}
      <Button disabled={!selected || pending} onClick={confirm}>
        {pending ? "Confirming..." : "Confirm"}
      </Button>
    </Card>
  );
}
