import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { listAllGames, isOfficialCompletedGame } from "@/lib/services/games";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminDeleteGameButton } from "@/components/admin/AdminDeleteGameButton";
import { RepairNumberingButton } from "@/components/admin/RepairNumberingButton";
import { gameTitle, formatDuration } from "@/lib/utils";

const STATUS_TONE: Record<string, "mafia" | "gold" | "muted"> = {
  draft: "gold",
  active: "mafia",
  paused: "muted",
  completed: "muted",
  cancelled: "muted",
};

export default async function AdminGamesPage() {
  const { supabase } = await requireProfile("admin");
  const games = await listAllGames(supabase);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Game Management</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Test games can be deleted freely. Draft/cancelled official games can be cleaned up too. Deleting an
            active, paused, or completed official game requires typing its exact title to confirm.
          </p>
        </div>
        <RepairNumberingButton />
      </div>

      {games.length === 0 ? (
        <EmptyState title="No games yet" />
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const qualifies = isOfficialCompletedGame(game);
            return (
              <Card key={game.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base text-foreground">{gameTitle(game)}</CardTitle>
                    {game.is_test ? <Badge tone="gold">TEST</Badge> : <Badge tone="muted">OFFICIAL</Badge>}
                    <Badge tone={STATUS_TONE[game.status] ?? "muted"}>{game.status}</Badge>
                    <Badge tone={qualifies ? "civilian" : "muted"}>
                      Qualifies for stats: {qualifies ? "YES" : "NO"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">
                    ID {game.id.slice(0, 8)} &middot; Created {new Date(game.created_at).toLocaleString()} &middot;{" "}
                    {game.participantCount} players &middot; {formatDuration(game.official_duration_seconds ?? 0)}
                    {game.winner_alignment && <> &middot; Winner: {game.winner_alignment === "mafia" ? "Mafia" : "Civilians"}</>}
                    {" "}&middot; Narrated by {game.narratorName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {qualifies && (
                    <Link href={`/games/${game.id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                  )}
                  <Link href={`/admin/games/${game.id}`}>
                    <Button variant="secondary">Repair</Button>
                  </Link>
                  <AdminDeleteGameButton game={game} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
