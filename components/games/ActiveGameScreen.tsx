import { GameTimer } from "@/components/games/GameTimer";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { gameTitle, initials, participantDisplay, roleDisplayLabel } from "@/lib/utils";
import type { Game, GamePlayerWithDetails } from "@/types/domain";

const STATUS_LABEL: Record<string, string> = {
  active: "LIVE",
  paused: "PAUSED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

export function ActiveGameScreen({ game, players }: { game: Game; players: GamePlayerWithDetails[] }) {
  const sorted = [...players].sort((a, b) =>
    participantDisplay(a).name.localeCompare(participantDisplay(b).name),
  );

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 text-center">
        <p className="text-sm uppercase tracking-widest text-gold">{gameTitle(game)}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {game.is_test && <Badge tone="gold">TEST</Badge>}
          <Badge tone={game.status === "active" ? "mafia" : "muted"}>
            {STATUS_LABEL[game.status] ?? game.status.toUpperCase()}
          </Badge>
        </div>
        <p className="mt-3 font-heading text-4xl text-foreground">
          <GameTimer startedAt={game.started_at} />
        </p>
        <p className="mt-1 text-sm text-muted">Round {game.current_round}</p>
      </Card>

      <div>
        <CardTitle>Roster</CardTitle>
        <p className="mb-3 mt-1 text-xs text-muted">Narrator/Admin view only.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {sorted.map((gp) => {
            const { name, isTest } = participantDisplay(gp);
            return (
              <Card key={gp.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised font-heading text-sm text-gold">
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={gp.current_alignment === "mafia" ? "mafia" : "civilian"}>{roleDisplayLabel(gp)}</Badge>
                    {isTest && <Badge tone="muted">TEST</Badge>}
                    {!gp.alive && <Badge tone="muted">Eliminated</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
