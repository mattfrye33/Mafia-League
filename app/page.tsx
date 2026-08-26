import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getLeaguePublicInfo } from "@/lib/services/league";
import { listActiveProfiles } from "@/lib/services/profiles";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function HomePage() {
  const { supabase, profile } = await requireProfile();
  const [league, roster] = await Promise.all([
    getLeaguePublicInfo(supabase),
    listActiveProfiles(supabase),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-widest text-gold">{league.current_season}</p>
        <h1 className="mt-1 font-heading text-3xl text-foreground md:text-4xl">
          {league.league_name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Welcome back, {profile.nickname || profile.full_name}.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Active Players" value={roster.length} />
        <StatTile label="Games Played" value={0} hint="Season total" />
        <StatTile label="Mafia Hours" value="0h 0m" hint="League total" />
        <StatTile label="Latest Game" value="—" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Win Leaders</CardTitle>
          <div className="mt-4">
            <EmptyState
              title="No games recorded yet"
              body="Once games are played, top win percentages will show up here."
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Most Successful Godfather</CardTitle>
          <div className="mt-4">
            <EmptyState
              title="No Godfather stats yet"
              body="Recruits and snipes will be tracked automatically once games are played."
            />
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl text-foreground">Recent Games</h2>
          <Link href="/games" className="text-sm text-gold hover:text-gold-soft">
            View all
          </Link>
        </div>
        <EmptyState
          title="No completed games yet"
          body="Narrators can start the first official league game from the Play tab."
        />
      </section>

      {(profile.permission_level === "narrator" || profile.permission_level === "admin") && (
        <section>
          <Card className="flex flex-col items-start gap-3 border-gold/30 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Narrator Tools</CardTitle>
              <p className="mt-1 text-sm text-muted">Set up and run a live game from the Play tab.</p>
            </div>
            <Link href="/play">
              <Button>Go to Play</Button>
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}
