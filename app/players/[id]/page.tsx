import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getProfile } from "@/lib/services/profiles";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EMPTY_CAREER_STATS, YEAR_LABELS } from "@/types/domain";
import { formatDuration, formatPct, initials } from "@/lib/utils";

export default async function PlayerProfilePage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const player = await getProfile(supabase, id);

  if (!player) notFound();

  // Career statistics are derived from completed games (Phase 3/4). Until
  // then every profile shows a real, honest zero state rather than fake data.
  const stats = EMPTY_CAREER_STATS;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised font-heading text-2xl text-gold">
          {initials(player.nickname || player.full_name)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl text-foreground">{player.full_name}</h1>
            <PermissionBadge level={player.permission_level} />
          </div>
          <p className="text-sm text-muted">
            &ldquo;{player.nickname}&rdquo; &middot; {YEAR_LABELS[player.year]}
            {!player.active && " · Inactive"}
          </p>
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
            <StatTile label="Medic Saves" value={stats.medicSaves} />
            <StatTile label="Priest Uses" value={stats.priestUses} />
            <StatTile label="Kamikaze Kills" value={stats.kamikazeKills} />
            <StatTile label="Times Silenced" value={stats.timesSilenced} />
          </div>
        </Card>

        <Card>
          <CardTitle>Recent Games</CardTitle>
          <div className="mt-4">
            <EmptyState title="No games played yet" />
          </div>
        </Card>
      </div>
    </div>
  );
}
