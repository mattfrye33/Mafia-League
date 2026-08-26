import { requireProfile } from "@/lib/auth";
import { listActiveProfiles } from "@/lib/services/profiles";
import { getLeagueCareerStats } from "@/lib/services/careerStats";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeaderboardTable, type LeaderboardRow } from "@/components/leaderboard/LeaderboardTable";

export default async function LeaderboardPage() {
  const { supabase } = await requireProfile();

  const [profiles, statsByPlayer] = await Promise.all([listActiveProfiles(supabase), getLeagueCareerStats(supabase)]);

  const rows: LeaderboardRow[] = profiles.map((p) => ({
    playerId: p.id,
    name: p.nickname || p.full_name,
    avatarUrl: p.avatar_url,
    stats: statsByPlayer.get(p.id) ?? null,
  }));

  const hasAnyGames = rows.some((r) => r.stats && r.stats.gamesPlayed > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">Ranked from official completed games only.</p>
      </div>

      {!hasAnyGames ? (
        <EmptyState title="No official games completed yet" body="The leaderboard fills in once games are finished." />
      ) : (
        <LeaderboardTable rows={rows} />
      )}
    </div>
  );
}
