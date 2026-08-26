import { requireProfile } from "@/lib/auth";
import { listActiveProfiles } from "@/lib/services/profiles";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function LeaderboardPage() {
  const { supabase } = await requireProfile();
  const players = await listActiveProfiles(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">Ranked by career win percentage once games are recorded.</p>
      </div>

      <Card>
        <CardTitle>Games Played &middot; Wins &middot; Win %</CardTitle>
        <div className="mt-4">
          {players.length === 0 ? (
            <EmptyState title="No players yet" />
          ) : (
            <EmptyState
              title="No games recorded yet"
              body={`${players.length} players are registered and ready — standings appear after the first completed game.`}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
