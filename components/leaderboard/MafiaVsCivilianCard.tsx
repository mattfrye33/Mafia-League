import { Card, CardTitle } from "@/components/ui/Card";
import { formatPct } from "@/lib/utils";
import type { LeagueSummary } from "@/lib/services/leagueStats";

export function MafiaVsCivilianCard({ summary }: { summary: LeagueSummary }) {
  const total = summary.mafiaWins + summary.civilianWins;
  const mafiaShare = total ? (summary.mafiaWins / total) * 100 : 50;

  return (
    <Card>
      <CardTitle>Mafia vs Civilian Record</CardTitle>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-heading text-lg text-red-soft">MAFIA</p>
          <p className="font-heading text-3xl text-foreground">{summary.mafiaWins}</p>
          <p className="text-sm text-muted">Wins &middot; {formatPct(summary.mafiaWins, summary.gamesPlayed)}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg text-civilian">CIVILIANS</p>
          <p className="font-heading text-3xl text-foreground">{summary.civilianWins}</p>
          <p className="text-sm text-muted">Wins &middot; {formatPct(summary.civilianWins, summary.gamesPlayed)}</p>
        </div>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full bg-mafia" style={{ width: `${mafiaShare}%` }} />
        <div className="h-full bg-civilian" style={{ width: `${100 - mafiaShare}%` }} />
      </div>
    </Card>
  );
}
