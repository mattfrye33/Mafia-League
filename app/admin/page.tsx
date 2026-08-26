import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { listProfiles } from "@/lib/services/profiles";
import { getLeagueSettingsAdmin } from "@/lib/services/league";
import { listTestPlayers } from "@/lib/services/testPlayers";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlayerPermissionTable } from "@/components/admin/PlayerPermissionTable";
import { LeagueSettingsForm } from "@/components/admin/LeagueSettingsForm";
import { TestPlayersPanel } from "@/components/admin/TestPlayersPanel";

export default async function AdminPage() {
  const { supabase, profile } = await requireProfile("admin");
  const [players, settings, testPlayers] = await Promise.all([
    listProfiles(supabase),
    getLeagueSettingsAdmin(supabase),
    listTestPlayers(supabase),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Admin</h1>
        <p className="mt-1 text-sm text-muted">League settings, accounts, and permissions.</p>
      </div>

      <Card>
        <CardTitle>League Settings</CardTitle>
        <div className="mt-4">
          <LeagueSettingsForm settings={settings} />
        </div>
      </Card>

      <Card>
        <CardTitle>Accounts &amp; Permissions</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Narrator access can only be granted here — it can never be self-assigned.
        </p>
        <div className="mt-4">
          <PlayerPermissionTable players={players} currentUserId={profile.id} />
        </div>
      </Card>

      <Card>
        <CardTitle>Test Players</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Login-less fake players for Test Games only. They can never join an Official Game, appear on the
          leaderboard, or receive official stats.
        </p>
        <div className="mt-4">
          <TestPlayersPanel testPlayers={testPlayers} />
        </div>
      </Card>

      <Card className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Game Management</CardTitle>
          <p className="mt-1 text-sm text-muted">View every game, and delete test, cancelled, or invalid games.</p>
        </div>
        <Link href="/admin/games">
          <Button variant="secondary">Manage Games</Button>
        </Link>
      </Card>
    </div>
  );
}
