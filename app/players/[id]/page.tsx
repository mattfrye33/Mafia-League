import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getProfile } from "@/lib/services/profiles";
import { getPlayerCareerStats, getRecentGames } from "@/lib/services/careerStats";
import { getPlayerBadges, getFeaturedBadges } from "@/lib/services/badges";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { FeaturedBadges } from "@/components/players/FeaturedBadges";
import { AchievementsGrid } from "@/components/players/AchievementsGrid";
import { YEAR_LABELS } from "@/types/domain";
import { formatDuration, formatPct, roleDisplayLabel } from "@/lib/utils";

export default async function PlayerProfilePage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const player = await getProfile(supabase, id);

  if (!player) notFound();

  const [stats, recentGames, { earned, locked }, featuredBadges] = await Promise.all([
    getPlayerCareerStats(supabase, id),
    getRecentGames(supabase, id),
    getPlayerBadges(supabase, id),
    getFeaturedBadges(supabase, id),
  ]);

  const name = player.nickname || player.full_name;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar url={player.avatar_url} name={name} size="lg" />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-heading text-2xl text-foreground">{player.full_name}</h1>
            <PermissionBadge level={player.permission_level} />
          </div>
          <p className="text-sm text-muted">
            &ldquo;{player.nickname}&rdquo; &middot; {YEAR_LABELS[player.year]}
            {!player.active && " · Inactive"}
          </p>
          {player.bio && <p className="max-w-md text-sm text-foreground/90">{player.bio}</p>}
          <FeaturedBadges badges={featuredBadges} />
        </div>
      </div>

      <Card>
        <CardTitle>Career</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Games Played" value={stats.gamesPlayed} />
          <StatTile label="Wins" value={stats.wins} />
          <StatTile label="Losses" value={stats.losses} />
          <StatTile label="Win %" value={formatPct(stats.wins, stats.gamesPlayed)} />
          <StatTile label="Mafia Hours" value={formatDuration(stats.totalMafiaHoursSeconds)} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Mafia Stats</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label="Mafia Games" value={stats.mafiaGames} />
            <StatTile label="Mafia Wins" value={stats.mafiaWins} />
            <StatTile label="Mafia Win %" value={formatPct(stats.mafiaWins, stats.mafiaGames)} />
            <StatTile label="Godfather Games" value={stats.godfatherGames} />
            <StatTile label="Godfather Wins" value={stats.godfatherWins} />
            <StatTile label="Successful Recruits" value={stats.successfulRecruits} />
            <StatTile label="Successful Snipes" value={stats.successfulSnipes} />
            <StatTile label="Times Recruited" value={stats.timesRecruited} />
          </div>
        </Card>

        <Card>
          <CardTitle>Civilian Stats</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label="Civilian Games" value={stats.civilianGames} />
            <StatTile label="Civilian Wins" value={stats.civilianWins} />
            <StatTile label="Civilian Win %" value={formatPct(stats.civilianWins, stats.civilianGames)} />
          </div>
        </Card>

        <Card>
          <CardTitle>Role Stats</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label="Cop Games" value={stats.copGames} />
            <StatTile label="Medic Games" value={stats.medicGames} />
            <StatTile label="Priest Games" value={stats.priestGames} />
            <StatTile label="Kamikaze Games" value={stats.kamikazeGames} />
            <StatTile label="Silencer Games" value={stats.silencerGames} />
            <StatTile label="Civilian Games" value={stats.civilianRoleGames} />
          </div>
        </Card>

        <Card>
          <CardTitle>Other</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label="Times Recruited" value={stats.timesRecruited} />
            <StatTile label="Medic Saves" value={stats.medicSaves} />
            <StatTile label="Priest Uses" value={stats.priestUses} />
            <StatTile label="Kamikaze Kills" value={stats.kamikazeKills} />
            <StatTile label="Times Silenced" value={stats.timesSilenced} />
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Games</CardTitle>
          <div className="mt-4">
            {recentGames.length === 0 ? (
              <EmptyState title="No games played yet" />
            ) : (
              <div className="space-y-2">
                {recentGames.map((g) => (
                  <Link
                    key={g.gameId}
                    href={`/games/${g.gameId}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm hover:border-gold/40"
                  >
                    <span className="text-foreground">
                      Game #{g.leagueNumber ?? "—"} &middot;{" "}
                      {roleDisplayLabel({
                        role: { name: g.roleName, slug: g.roleSlug },
                        original_alignment: g.originalAlignment,
                        current_alignment: g.currentAlignment,
                      })}
                    </span>
                    <span className={g.won ? "text-civilian" : "text-red-soft"}>{g.won ? "Won" : "Lost"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Role History</CardTitle>
          <div className="mt-4">
            {recentGames.length === 0 ? (
              <EmptyState title="No games played yet" />
            ) : (
              <div className="space-y-2">
                {recentGames.map((g) => (
                  <div
                    key={g.gameId}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm"
                  >
                    <span className="text-muted">Game #{g.leagueNumber ?? "—"}</span>
                    <span className="text-foreground">
                      Base: {g.roleName}
                      {g.originalAlignment !== g.currentAlignment && (
                        <>
                          {" "}
                          &rarr;{" "}
                          {roleDisplayLabel({
                            role: { name: g.roleName, slug: g.roleSlug },
                            original_alignment: g.originalAlignment,
                            current_alignment: g.currentAlignment,
                          })}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <AchievementsGrid earned={earned} locked={locked} />
    </div>
  );
}
