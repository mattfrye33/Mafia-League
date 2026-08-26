import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { listTestGames } from "@/lib/services/games";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DeleteTestGameButton } from "@/components/games/DeleteTestGameButton";
import { gameTitle } from "@/lib/utils";

export default async function TestGamesPage() {
  const { supabase } = await requireProfile("narrator");
  const games = await listTestGames(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Test Games</h1>
        <p className="mt-1 text-sm text-muted">
          Never counted toward league stats, Mafia Hours, or official numbering. Safe to create, play through, and
          delete freely.
        </p>
      </div>

      {games.length === 0 ? (
        <EmptyState
          title="No test games yet"
          body="Create one from Play → Create New Game → Test Game."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((game) => (
            <Card key={game.id} className="flex items-center justify-between">
              <div>
                <Link href={`/play/games/${game.id}`} className="font-semibold text-foreground hover:text-gold">
                  {gameTitle(game)}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="gold">TEST</Badge>
                  <Badge tone="muted">{game.status}</Badge>
                </div>
              </div>
              <DeleteTestGameButton gameId={game.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
