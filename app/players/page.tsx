import { requireProfile } from "@/lib/auth";
import { listProfiles } from "@/lib/services/profiles";
import { PlayerCard } from "@/components/players/PlayerCard";

export default async function PlayersPage() {
  const { supabase } = await requireProfile();
  const players = await listProfiles(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Players</h1>
        <p className="mt-1 text-sm text-muted">{players.length} registered in the league</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <PlayerCard key={p.id} profile={p} />
        ))}
      </div>
    </div>
  );
}
