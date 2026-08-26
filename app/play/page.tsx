import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { listOpenGames } from "@/lib/services/games";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { gameTitle } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  draft: "Setting Up",
  active: "Live",
  paused: "Paused",
};

export default async function PlayPage({ searchParams }: PageProps<"/play">) {
  const { supabase, profile } = await requireProfile();
  const canNarrate = profile.permission_level === "narrator" || profile.permission_level === "admin";
  const openGames = await listOpenGames(supabase);
  const params = await searchParams;
  const justSaved = params?.saved === "1";

  return (
    <div className="space-y-6">
      {justSaved && (
        <Card className="space-y-3 border-civilian/40 text-center">
          <p className="font-heading text-lg text-civilian">Game saved successfully.</p>
          <div className="flex justify-center gap-2">
            <Link href="/">
              <Button variant="secondary">Return Home</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Play</h1>
          <p className="mt-1 text-sm text-muted">
            {canNarrate
              ? "Create and run a live Narrator-guided game."
              : "Games you're currently playing in."}
          </p>
        </div>
        {canNarrate && (
          <div className="flex gap-2">
            <Link href="/play/test-games">
              <Button variant="secondary">Test Games</Button>
            </Link>
            <Link href="/play/new">
              <Button>Create New Game</Button>
            </Link>
          </div>
        )}
      </div>

      {openGames.length === 0 ? (
        <EmptyState
          title={canNarrate ? "No games in progress" : "Nothing live right now"}
          body={
            canNarrate
              ? "Tap Create New Game to select players and set up roles."
              : "Ask a Narrator to start a game — you'll see it here once one is running."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {openGames.map((game) => (
            <Link key={game.id} href={`/play/games/${game.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-gold/40">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{gameTitle(game)}</CardTitle>
                    {game.is_test && <Badge tone="gold">TEST</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {game.status === "draft" ? "Setup in progress" : `Round ${game.current_round}`}
                  </p>
                </div>
                <Badge tone={game.status === "active" ? "mafia" : "gold"}>
                  {STATUS_LABEL[game.status] ?? game.status}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
