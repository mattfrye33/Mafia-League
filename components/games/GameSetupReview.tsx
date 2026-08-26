"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  rerollGameRolesAction,
  updateGamePlayerRoleAction,
  startGameAction,
} from "@/app/play/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { gameTitle, initials, participantDisplay } from "@/lib/utils";
import { roleReviewRank } from "@/lib/gameSetup";
import type { Game, GamePlayerWithDetails } from "@/types/domain";

interface RoleOption {
  id: string;
  name: string;
}

export function GameSetupReview({
  game,
  players,
  roleOptions,
}: {
  game: Game;
  players: GamePlayerWithDetails[];
  roleOptions: RoleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function reroll() {
    startTransition(async () => {
      await rerollGameRolesAction(game.id);
      router.refresh();
    });
  }

  function changeRole(gamePlayerId: string, roleId: string) {
    startTransition(async () => {
      await updateGamePlayerRoleAction(gamePlayerId, roleId, game.id);
      router.refresh();
    });
  }

  function start() {
    startTransition(async () => {
      await startGameAction(game.id);
      router.refresh();
    });
  }

  // Fixed Narrator order (Godfather, Cop, Medic, Priest, Silencer, Kamikaze,
  // then Civilian), grouped by role — display/sort only, this never touches
  // who was actually assigned which role.
  const sorted = [...players].sort((a, b) => {
    const rankDiff = roleReviewRank(a.role.slug) - roleReviewRank(b.role.slug);
    if (rankDiff !== 0) return rankDiff;
    return participantDisplay(a).name.localeCompare(participantDisplay(b).name, undefined, { numeric: true });
  });

  const groups: { role: GamePlayerWithDetails["role"]; players: GamePlayerWithDetails[] }[] = [];
  for (const gp of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.role.id === gp.role.id) {
      lastGroup.players.push(gp);
    } else {
      groups.push({ role: gp.role, players: [gp] });
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl text-foreground">{gameTitle(game)}</h1>
            {game.is_test && <Badge tone="gold">TEST</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">Review roles before starting. Only you can see this.</p>
        </div>
        <Button variant="secondary" disabled={pending} onClick={reroll}>
          Reroll All
        </Button>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.role.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {group.players.length > 1 ? `${group.role.name}s` : group.role.name}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.players.map((gp) => {
                const { name, isTest } = participantDisplay(gp);
                return (
                  <Card key={gp.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised font-heading text-sm text-gold">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={gp.role.default_alignment === "mafia" ? "mafia" : "civilian"}>
                          {gp.role.name}
                        </Badge>
                        {isTest && <Badge tone="muted">TEST</Badge>}
                      </div>
                    </div>
                    <select
                      className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-xs text-foreground"
                      value={gp.base_role_id}
                      disabled={pending}
                      onChange={(e) => changeRole(gp.id, e.target.value)}
                    >
                      {roleOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardTitle>Godfather Recruits Allowed</CardTitle>
        <p className="mt-2 text-lg font-semibold text-foreground">{game.godfather_recruits_allowed}</p>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-sm text-muted">{players.length} players ready</p>
          <Button disabled={pending} onClick={start}>
            {pending ? "Starting..." : "Start Game"}
          </Button>
        </div>
      </div>
    </div>
  );
}
