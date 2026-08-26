import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getGame, getGamePlayers } from "@/lib/services/games";
import { throwIfError } from "@/lib/supabase/errors";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { participantDisplay, roleDisplayLabel } from "@/lib/utils";
import { GameRepairForm } from "@/components/admin/GameRepairForm";

export default async function AdminGameRepairPage({ params }: PageProps<"/admin/games/[id]">) {
  const { id } = await params;
  const { supabase } = await requireProfile("admin");

  const game = await getGame(supabase, id);
  if (!game) notFound();

  const [players, { count: actionCount, error: actionsError }] = await Promise.all([
    getGamePlayers(supabase, id),
    supabase.from("game_actions").select("id", { count: "exact", head: true }).eq("game_id", id),
  ]);
  throwIfError(actionsError);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Repair / Archive Game</h1>
        <p className="mt-1 text-sm text-muted">
          Internal ID: <span className="text-foreground">{game.id}</span>
        </p>
      </div>

      <Card>
        <CardTitle>What We Have On Record</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Participants" value={players.length} />
          <StatTile label="Recorded Actions" value={actionCount ?? 0} />
          <StatTile label="Status" value={game.status} />
          <StatTile label="League Number" value={game.league_number ?? "—"} />
        </div>
        {players.length === 0 && (
          <p className="mt-4 text-sm text-red-soft">
            No participants exist for this game in the database. It cannot be repaired or archived into league
            history — if this was a real game, its data was never saved or was already removed, and it can only be
            recovered from a Supabase database backup, if one exists.
          </p>
        )}
        {players.length > 0 && (actionCount ?? 0) === 0 && (
          <p className="mt-4 text-sm text-gold">
            Participants exist but no actions were recorded. You can still mark this game Official/Completed with a
            winner and duration, but detailed stats that depend on the action log (Medic saves, successful snipes,
            Priest uses, Kamikaze kills, times silenced) cannot be derived and will correctly show as zero — don&apos;t
            fabricate them.
          </p>
        )}
      </Card>

      {players.length > 0 && (
        <Card>
          <CardTitle>Recorded Participants</CardTitle>
          <div className="mt-4 space-y-1">
            {players.map((p) => {
              const { name } = participantDisplay(p);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="text-muted">
                    {roleDisplayLabel(p)} &middot; {p.alive ? "Alive" : "Dead"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Repair Game-Level Fields</CardTitle>
        <p className="mt-1 text-xs text-muted">
          Only game-level fields can be edited here (status, official/test, winner, duration, league number).
          Participants and recorded actions can never be added or edited from this screen.
        </p>
        <GameRepairForm game={game} />
      </Card>
    </div>
  );
}
