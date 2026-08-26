import { Card, CardTitle } from "@/components/ui/Card";
import { participantDisplay, roleDisplayLabel } from "@/lib/utils";
import type { GamePlayerWithDetails } from "@/types/domain";

/** Living Mafia-aligned roster — shown wherever the Narrator needs a quick
 * reminder of who's currently on the Mafia side, dirty roles included. */
export function CurrentMafiaRoster({ players }: { players: GamePlayerWithDetails[] }) {
  const mafia = players.filter((p) => p.alive && p.current_alignment === "mafia");
  if (mafia.length === 0) return null;

  return (
    <Card>
      <CardTitle>Current Mafia</CardTitle>
      <ul className="mt-2 space-y-1 text-sm text-foreground">
        {mafia.map((p) => (
          <li key={p.id}>
            {participantDisplay(p).name} — {roleDisplayLabel(p)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
