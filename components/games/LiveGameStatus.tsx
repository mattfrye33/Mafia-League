import { GameTimer } from "@/components/games/GameTimer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { gameTitle } from "@/lib/utils";
import type { Game } from "@/types/domain";

const STATUS_LABEL: Record<string, string> = {
  draft: "SETTING UP",
  active: "LIVE",
  paused: "PAUSED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

/** Player-facing view — status/timer only. Roles are never fetched here. */
export function LiveGameStatus({ game }: { game: Game }) {
  return (
    <Card className="border-gold/30 text-center">
      <p className="text-sm uppercase tracking-widest text-gold">{gameTitle(game)}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        {game.is_test && <Badge tone="gold">TEST</Badge>}
        <Badge tone={game.status === "active" ? "mafia" : "muted"}>
          {STATUS_LABEL[game.status] ?? game.status.toUpperCase()}
        </Badge>
      </div>
      {game.started_at && (
        <p className="mt-3 font-heading text-4xl text-foreground">
          <GameTimer startedAt={game.started_at} />
        </p>
      )}
      <p className="mt-1 text-sm text-muted">Round {game.current_round}</p>
    </Card>
  );
}
