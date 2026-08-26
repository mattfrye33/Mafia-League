"use client";

import { useState, useTransition } from "react";
import {
  voteEliminateAction,
  confirmSnipeAction,
  denySnipeAction,
  applyPriestUseAction,
  manualDeathAction,
  advanceToNextNightAction,
} from "@/app/play/engineActions";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlayerPicker } from "@/components/games/PlayerPicker";
import { CurrentMafiaRoster } from "@/components/games/CurrentMafiaRoster";
import { GameOverPreview } from "@/components/games/GameOverPreview";
import { checkWinCondition } from "@/lib/winCondition";
import { participantDisplay } from "@/lib/utils";
import {
  DEATH_REASONS,
  DEATH_REASON_LABELS,
  type Alignment,
  type DeathReason,
  type Game,
  type GamePlayerWithDetails,
} from "@/types/domain";

interface DeathActionResult {
  kamikazeTriggered?: { gamePlayerId: string };
}

type Panel = "vote" | "snipe" | "priest" | "manualDeath" | null;

export function RoundInProgress({
  game,
  players,
  narratorName,
  onKamikaze,
  onRefresh,
}: {
  game: Game;
  players: GamePlayerWithDetails[];
  narratorName: string;
  onKamikaze: (gamePlayerId: string) => void;
  onRefresh: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [pendingWinner, setPendingWinner] = useState<Alignment | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const living = players.filter((p) => p.alive);
  const silenced = living.filter((p) => p.silenced_until_round === game.current_round);
  const winner = checkWinCondition(players);

  function handleDeathResult(result: DeathActionResult) {
    setPanel(null);
    if (result.kamikazeTriggered) onKamikaze(result.kamikazeTriggered.gamePlayerId);
    else onRefresh();
  }

  function doNextNight() {
    setError(null);
    startTransition(async () => {
      try {
        await advanceToNextNightAction(game.id);
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (pendingWinner) {
    return (
      <GameOverPreview
        game={game}
        players={players}
        winnerAlignment={pendingWinner}
        narratorName={narratorName}
        onBack={() => setPendingWinner(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Round {game.current_round} In Progress</CardTitle>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted">Living Players</p>
            <p className="text-lg font-semibold text-foreground">{living.length}</p>
          </div>
          <div>
            <p className="text-muted">Silenced</p>
            <p className="text-lg font-semibold text-foreground">
              {silenced.length > 0 ? silenced.map((p) => participantDisplay(p).name).join(", ") : "—"}
            </p>
          </div>
        </div>
      </Card>

      <CurrentMafiaRoster players={players} />

      {winner && (
        <Card className="space-y-3 border-gold/40 text-center">
          <p className="font-heading text-lg text-gold">
            {winner === "mafia" ? "MAFIA WIN CONDITION REACHED" : "CIVILIAN WIN CONDITION REACHED"}
          </p>
          <p className="text-sm text-muted">
            {winner === "mafia"
              ? "Living Mafia-aligned players are equal to or outnumber Civilians."
              : "Zero Mafia-aligned players remain."}
          </p>
          <Button onClick={() => setPendingWinner(winner)}>
            End Game — {winner === "mafia" ? "Mafia" : "Civilian"} Victory?
          </Button>
        </Card>
      )}

      {panel === null && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setPanel("vote")}>
            Vote
          </Button>
          <Button variant="secondary" onClick={() => setPanel("snipe")}>
            Snipe
          </Button>
          <Button variant="secondary" onClick={() => setPanel("priest")}>
            Priest
          </Button>
          <Button variant="secondary" onClick={() => setPanel("manualDeath")}>
            Manual Death
          </Button>
          <Button disabled={pending} onClick={doNextNight} className="col-span-2">
            {pending ? "Advancing..." : "Next Night"}
          </Button>
        </div>
      )}

      {panel === "vote" && <VotePanel game={game} living={living} onCancel={() => setPanel(null)} onResult={handleDeathResult} />}
      {panel === "snipe" && (
        <SnipePanel
          game={game}
          living={living}
          onCancel={() => setPanel(null)}
          onResult={handleDeathResult}
          onDenied={() => setPanel(null)}
        />
      )}
      {panel === "priest" && (
        <PriestPanel
          game={game}
          living={living}
          onCancel={() => setPanel(null)}
          onDone={() => {
            setPanel(null);
            onRefresh();
          }}
        />
      )}
      {panel === "manualDeath" && (
        <ManualDeathPanel game={game} living={living} onCancel={() => setPanel(null)} onResult={handleDeathResult} />
      )}

      {error && <p className="text-sm text-red-soft">{error}</p>}
    </div>
  );
}

function VotePanel({
  game,
  living,
  onCancel,
  onResult,
}: {
  game: Game;
  living: GamePlayerWithDetails[];
  onCancel: () => void;
  onResult: (result: DeathActionResult) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        const result = await voteEliminateAction(game.id, targetId);
        onResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <CardTitle>Who was voted out?</CardTitle>
      <PlayerPicker
        options={living.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
        selectedId={selected}
        onSelect={setSelected}
        disabled={pending}
      />
      {error && <p className="text-sm text-red-soft">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" disabled={!selected || pending} onClick={confirm}>
          Confirm Vote
        </Button>
      </div>
    </Card>
  );
}

function SnipePanel({
  game,
  living,
  onCancel,
  onResult,
  onDenied,
}: {
  game: Game;
  living: GamePlayerWithDetails[];
  onCancel: () => void;
  onResult: (result: DeathActionResult) => void;
  onDenied: () => void;
}) {
  const [responsible, setResponsible] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mafiaPlayers = living.filter((p) => p.current_alignment === "mafia");

  function confirm() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmSnipeAction(game.id, target, responsible);
        onResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function deny() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      try {
        await denySnipeAction(game.id, target, responsible);
        onDenied();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <CardTitle>Snipe</CardTitle>
      {mafiaPlayers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Responsible (optional)</p>
          <PlayerPicker
            options={mafiaPlayers.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
            selectedId={responsible}
            onSelect={(id) => setResponsible(id === responsible ? null : id)}
            disabled={pending}
          />
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Target</p>
        <PlayerPicker
          options={living.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
          selectedId={target}
          onSelect={setTarget}
          disabled={pending}
        />
      </div>
      {error && <p className="text-sm text-red-soft">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="secondary" disabled={!target || pending} onClick={deny}>
          Deny Snipe
        </Button>
        <Button variant="danger" disabled={!target || pending} onClick={confirm}>
          Confirm Snipe
        </Button>
      </div>
    </Card>
  );
}

function PriestPanel({
  game,
  living,
  onCancel,
  onDone,
}: {
  game: Game;
  living: GamePlayerWithDetails[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [claimant, setClaimant] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ targetName: string; publicLabel: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (reveal) {
    return (
      <Card className="space-y-3 text-center">
        <CardTitle>Priest Reveal</CardTitle>
        <p className="text-sm text-foreground">
          {reveal.targetName}: {reveal.publicLabel}
        </p>
        <Button onClick={onDone}>Continue</Button>
      </Card>
    );
  }

  if (!claimant) {
    return (
      <Card className="space-y-4">
        <CardTitle>Who is claiming Priest?</CardTitle>
        <PlayerPicker
          options={living.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
          selectedId={claimant}
          onSelect={(id) => {
            const player = living.find((p) => p.id === id);
            if (!player) return;
            if (player.role.slug !== "priest") {
              setError(`${participantDisplay(player).name} is not the Priest.`);
              return;
            }
            if (player.role_ability_used) {
              setError(`${participantDisplay(player).name} has already used Priest.`);
              return;
            }
            setError(null);
            setClaimant(id);
          }}
          disabled={pending}
        />
        {error && <p className="text-sm text-red-soft">{error}</p>}
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </Card>
    );
  }

  function confirm() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyPriestUseAction(game.id, claimant!, target);
        setReveal({ targetName: result.targetName, publicLabel: result.publicLabel });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <CardTitle>ABILITY CONFIRMED — Who is being Priested?</CardTitle>
      <PlayerPicker
        options={living.filter((p) => p.id !== claimant).map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
        selectedId={target}
        onSelect={setTarget}
        disabled={pending}
      />
      {error && <p className="text-sm text-red-soft">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button disabled={!target || pending} onClick={confirm}>
          Confirm
        </Button>
      </div>
    </Card>
  );
}

function ManualDeathPanel({
  game,
  living,
  onCancel,
  onResult,
}: {
  game: Game;
  living: GamePlayerWithDetails[];
  onCancel: () => void;
  onResult: (result: DeathActionResult) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState<DeathReason>("manual");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!target) return;
    setError(null);
    const targetId = target;
    startTransition(async () => {
      try {
        const result = await manualDeathAction(game.id, targetId, reason);
        onResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <CardTitle>Manual Death</CardTitle>
      <PlayerPicker
        options={living.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
        selectedId={target}
        onSelect={setTarget}
        disabled={pending}
      />
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Reason</p>
        <select
          className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          value={reason}
          onChange={(e) => setReason(e.target.value as DeathReason)}
          disabled={pending}
        >
          {DEATH_REASONS.map((r) => (
            <option key={r} value={r}>
              {DEATH_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-soft">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" disabled={!target || pending} onClick={confirm}>
          Confirm Death
        </Button>
      </div>
    </Card>
  );
}
