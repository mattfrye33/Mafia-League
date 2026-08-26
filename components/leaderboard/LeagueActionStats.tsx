import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import type { LeagueActionTotals } from "@/lib/services/leagueStats";

export function LeagueActionStats({ totals }: { totals: LeagueActionTotals }) {
  return (
    <Card>
      <CardTitle>ALL-TIME ACTION STATS</CardTitle>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Mafia Kills" value={totals.mafiaKills} />
        <StatTile label="Successful Recruits" value={totals.successfulRecruits} />
        <StatTile label="Failed/Caught Recruits" value={totals.caughtRecruits} />
        <StatTile label="Successful Snipes" value={totals.successfulSnipes} />
        <StatTile label="Cop Investigations" value={totals.copInvestigations} />
        <StatTile label="Cop Cross Checks" value={totals.copCrossChecks} />
        <StatTile label="Mafia Found by Cops" value={totals.mafiaFoundByCops} />
        <StatTile label="Medic Saves" value={totals.medicSaves} />
        <StatTile label="Priest Uses" value={totals.priestUses} />
        <StatTile label="Kamikaze Kills" value={totals.kamikazeKills} />
        <StatTile label="Silences" value={totals.silences} />
        <StatTile label="Vote Eliminations" value={totals.voteEliminations} />
        <StatTile label="Manual Deaths" value={totals.manualDeaths} />
      </div>
    </Card>
  );
}
