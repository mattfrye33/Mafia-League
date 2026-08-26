import { requireProfile } from "@/lib/auth";
import { listAllGames } from "@/lib/services/games";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminDeleteGameButton } from "@/components/admin/AdminDeleteGameButton";
import { gameTitle } from "@/lib/utils";

const STATUS_TONE: Record<string, "mafia" | "gold" | "muted"> = {
  draft: "gold",
  active: "mafia",
  paused: "muted",
  completed: "muted",
  cancelled: "muted",
};

export default async function AdminGamesPage() {
  const { supabase } = await requireProfile("admin");
  const games = await listAllGames(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Game Management</h1>
        <p className="mt-1 text-sm text-muted">
          Test games can be deleted freely. Draft/cancelled official games can be cleaned up too. Deleting an active,
          paused, or completed official game requires typing its exact title to confirm.
        </p>
      </div>

      {games.length === 0 ? (
        <EmptyState title="No games yet" />
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <Card key={game.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{gameTitle(game)}</CardTitle>
                  {game.is_test && <Badge tone="gold">TEST</Badge>}
                  <Badge tone={STATUS_TONE[game.status] ?? "muted"}>{game.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">Created {new Date(game.created_at).toLocaleString()}</p>
              </div>
              <AdminDeleteGameButton game={game} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
