import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getGame, getGamePlayers, getGameHighlights, isOfficialCompletedGame } from "@/lib/services/games";
import { getProfile } from "@/lib/services/profiles";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { formatDuration, participantDisplay, roleDisplayLabel } from "@/lib/utils";
import { DEATH_REASON_LABELS } from "@/types/domain";

export default async function GameSummaryPage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const game = await getGame(supabase, id);
  if (!game || !isOfficialCompletedGame(game)) notFound();

  const [players, highlights, narrator] = await Promise.all([
    getGamePlayers(supabase, id),
    getGameHighlights(supabase, id),
    getProfile(supabase, game.narrator_id),
  ]);

  const narratorName = narrator ? narrator.nickname || narrator.full_name : "Unknown";
  const mafiaWon = game.winner_alignment === "mafia";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/games" className="text-xs text-muted hover:text-gold">
          &larr; Games Archive
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl text-foreground">Game #{game.league_number ?? "—"}</h1>
          <Badge tone={mafiaWon ? "mafia" : "civilian"}>{mafiaWon ? "Mafia Won" : "Civilians Won"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {game.ended_at ? new Date(game.ended_at).toLocaleString() : "—"} &middot; Narrated by {narratorName}
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Players" value={players.length} />
          <StatTile label="Duration" value={formatDuration(game.official_duration_seconds ?? 0)} />
          <StatTile label="Rounds" value={game.current_round} />
          <StatTile label="Winner" value={mafiaWon ? "Mafia" : "Civilians"} />
        </div>
      </Card>

      <Card>
        <CardTitle>Participants</CardTitle>
        <div className="mt-4 space-y-2">
          {players.map((p) => {
            const { name } = participantDisplay(p);
            const won = p.current_alignment === game.winner_alignment;
            const h = highlights.get(p.id);
            const notes: string[] = [];
            if (h?.recruited) notes.push("Recruited");
            if (h?.successfulSnipe) notes.push("Successful Snipe");
            if (h?.medicSave) notes.push("Medic Save");
            if (h?.priestUsed) notes.push("Priest Used");
            if (h?.kamikazeKill) notes.push("Kamikaze Kill");
            if (h?.silenced) notes.push("Silenced");

            return (
              <div key={p.id} className="rounded-lg border border-border bg-surface-raised px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="ml-2 text-sm text-muted">{roleDisplayLabel(p)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={p.alive ? "civilian" : "muted"}>
                      {p.alive ? "Survived" : `Eliminated${p.death_reason ? ` (${DEATH_REASON_LABELS[p.death_reason]})` : ""}`}
                    </Badge>
                    <Badge tone={won ? "gold" : "muted"}>{won ? "Won" : "Lost"}</Badge>
                  </div>
                </div>
                {notes.length > 0 && <p className="mt-2 text-xs text-gold">{notes.join(" · ")}</p>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
