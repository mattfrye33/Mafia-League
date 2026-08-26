import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatDuration, formatPct } from "@/lib/utils";
import type { LeagueSummary } from "@/lib/services/leagueStats";

export function LeagueSummaryCards({ summary }: { summary: LeagueSummary }) {
  return (
    <Card className="border-gold/30">
      <CardTitle className="text-gold-soft">ALL-TIME LEAGUE STATS</CardTitle>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Games Played" value={summary.gamesPlayed} />
        <StatTile label="Mafia Wins" value={summary.mafiaWins} />
        <StatTile label="Civilian Wins" value={summary.civilianWins} />
        <StatTile label="Mafia Win %" value={formatPct(summary.mafiaWins, summary.gamesPlayed)} />
        <StatTile label="Civilian Win %" value={formatPct(summary.civilianWins, summary.gamesPlayed)} />
        <StatTile label="Total Mafia Hours" value={formatDuration(summary.totalMafiaHoursSeconds)} />
        <StatTile label="Average Game" value={formatDuration(summary.avgGameDurationSeconds)} />
        <StatTile label="Longest Game" value={formatDuration(summary.longestGameSeconds)} />
        <StatTile label="Shortest Game" value={formatDuration(summary.shortestGameSeconds)} />
        <StatTile label="Total Players" value={summary.totalPlayers} />
      </div>
    </Card>
  );
}
