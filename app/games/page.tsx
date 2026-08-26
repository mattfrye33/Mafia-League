import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { listOfficialGames } from "@/lib/services/games";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDuration } from "@/lib/utils";

export default async function GamesPage() {
  const { supabase } = await requireProfile();
  const games = await listOfficialGames(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Games Archive</h1>
        <p className="mt-1 text-sm text-muted">Completed league games, most recent first.</p>
      </div>

      {games.length === 0 ? (
        <EmptyState title="No completed games yet" body="Once a Narrator finishes an official game, its summary will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.id}`}>
              <Card className="h-full transition hover:border-gold/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">Game #{game.league_number ?? "—"}</CardTitle>
                  <Badge tone={game.winner_alignment === "mafia" ? "mafia" : "civilian"}>
                    {game.winner_alignment === "mafia" ? "Mafia Won" : "Civilians Won"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p>{game.ended_at ? new Date(game.ended_at).toLocaleDateString() : "—"}</p>
                  <p>{game.participantCount} players</p>
                  <p>{formatDuration(game.official_duration_seconds ?? 0)}</p>
                  <p>Narrated by {game.narratorName}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
