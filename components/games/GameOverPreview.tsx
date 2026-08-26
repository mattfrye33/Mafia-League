"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishGameAction, getNightRecapAction } from "@/app/play/engineActions";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NightRecapCards } from "@/components/games/NightRecapCards";
import { GameTimer } from "@/components/games/GameTimer";
import { gameTitle } from "@/lib/utils";
import type { Alignment, Game, GamePlayerWithDetails } from "@/types/domain";
import type { NightRecap } from "@/lib/services/gameEngine";

/**
 * Review-before-save screen. Nothing here is persisted yet — confirming a
 * win condition on Round In Progress only gets you here; the game only
 * actually completes (status='completed' etc.) when SAVE & FINISH GAME is
 * pressed, via the same finishGame() used everywhere else. There's still
 * only one completion pathway, this is just a client-side staging step
 * in front of it.
 */
export function GameOverPreview({
  game,
  players,
  winnerAlignment,
  narratorName,
  onBack,
}: {
  game: Game;
  players: GamePlayerWithDetails[];
  winnerAlignment: Alignment;
  narratorName: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<NightRecap | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNightRecapAction(game.id, game.current_round)
      .then((r) => {
        if (!cancelled) setRecap(r);
      })
      .catch(() => {
        // Final recap is a nice-to-have here — the game over screen still
        // works fine without it if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [game.id, game.current_round]);

  const alivePlayers = players.filter((p) => p.alive);
  const aliveMafia = alivePlayers.filter((p) => p.current_alignment === "mafia");
  const recruitsLeft = game.godfather_recruits_allowed - game.godfather_recruits_used;

  function doSave() {
    setError(null);
    startTransition(async () => {
      try {
        await finishGameAction(game.id, winnerAlignment);
        router.push("/play?saved=1");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2 border-gold/40 text-center">
        <p className="text-sm uppercase tracking-widest text-gold">GAME OVER</p>
        <p className="font-heading text-2xl text-foreground">
          {winnerAlignment === "mafia" ? "Mafia Victory" : "Civilian Victory"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge tone="gold">{gameTitle(game)}</Badge>
          {game.is_test && <Badge tone="gold">TEST</Badge>}
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted">Duration</p>
            <p className="text-lg font-semibold text-foreground">
              <GameTimer startedAt={game.started_at} />
            </p>
          </div>
          <div>
            <p className="text-muted">Narrator</p>
            <p className="text-lg font-semibold text-foreground">{narratorName}</p>
          </div>
          <div>
            <p className="text-muted">Total Players</p>
            <p className="text-lg font-semibold text-foreground">{players.length}</p>
          </div>
          <div>
            <p className="text-muted">Surviving Players</p>
            <p className="text-lg font-semibold text-foreground">{alivePlayers.length}</p>
          </div>
          <div>
            <p className="text-muted">Surviving Mafia</p>
            <p className="text-lg font-semibold text-foreground">{aliveMafia.length}</p>
          </div>
          <div>
            <p className="text-muted">Recruits Used / Left</p>
            <p className="text-lg font-semibold text-foreground">
              {game.godfather_recruits_used} / {recruitsLeft}
            </p>
          </div>
        </div>
      </Card>

      {recap && (
        <div>
          <CardTitle>Final Night Recap</CardTitle>
          <div className="mt-2">
            <NightRecapCards recap={recap} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-soft">{error}</p>}

      <div className="space-y-2">
        <Button className="w-full" disabled={pending} onClick={doSave}>
          {pending ? "Saving..." : "SAVE & FINISH GAME"}
        </Button>
        <Button variant="ghost" className="w-full" disabled={pending} onClick={onBack}>
          Back to Round In Progress
        </Button>
      </div>
    </div>
  );
}
