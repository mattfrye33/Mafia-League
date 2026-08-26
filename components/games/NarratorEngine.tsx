"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recruitPlayerAction,
  setMafiaKillTargetAction,
  skipNightStepAction,
  copInvestigateAction,
  crossCheckCopsAction,
  medicProtectAction,
  silenceTargetAction,
  resolveNightAction,
  undoLastActionAction,
  getNightRecapAction,
} from "@/app/play/engineActions";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PlayerPicker } from "@/components/games/PlayerPicker";
import { KamikazeFollowUp } from "@/components/games/KamikazeFollowUp";
import { CurrentMafiaRoster } from "@/components/games/CurrentMafiaRoster";
import { NightRecapCards } from "@/components/games/NightRecapCards";
import { RoundInProgress } from "@/components/games/RoundInProgress";
import { GameTimer } from "@/components/games/GameTimer";
import { gameTitle, participantDisplay, roleDisplayLabel } from "@/lib/utils";
import type { Game, GamePhase, GamePlayerWithDetails } from "@/types/domain";
import type { NightRecap } from "@/lib/services/gameEngine";

type UiState =
  | { kind: "normal" }
  | { kind: "kamikaze"; gamePlayerId: string; thenShowRecap: boolean }
  | { kind: "recap" };

export function NarratorEngine({
  game,
  players,
  narratorName,
}: {
  game: Game;
  players: GamePlayerWithDetails[];
  narratorName: string;
}) {
  const router = useRouter();
  const [uiState, setUiState] = useState<UiState>({ kind: "normal" });
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [undoPending, startUndoTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleUndo() {
    setUndoMessage(null);
    startUndoTransition(async () => {
      const description = await undoLastActionAction(game.id);
      setUndoMessage(description ?? "Nothing to undo.");
      router.refresh();
    });
  }

  const recruitsLeft = game.godfather_recruits_allowed - game.godfather_recruits_used;

  const header = (
    <Card className="border-gold/30 text-center">
      <p className="text-sm uppercase tracking-widest text-gold">{gameTitle(game)}</p>
      <Badge tone="mafia" className="mt-2">
        LIVE
      </Badge>
      <p className="mt-3 font-heading text-4xl text-foreground">
        <GameTimer startedAt={game.started_at} />
      </p>
      <p className="mt-1 text-sm text-muted">
        Round {game.current_round} · Recruits Left: {recruitsLeft}
      </p>
    </Card>
  );

  const undoBar = (
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" disabled={undoPending} onClick={handleUndo}>
        {undoPending ? "Undoing..." : "Undo Last Action"}
      </Button>
      {undoMessage && <p className="text-xs text-muted">{undoMessage}</p>}
    </div>
  );

  if (uiState.kind === "kamikaze") {
    const { gamePlayerId, thenShowRecap } = uiState;
    return (
      <div className="space-y-4">
        {header}
        <KamikazeFollowUp
          gameId={game.id}
          kamikazeGamePlayerId={gamePlayerId}
          players={players}
          onResolved={() => {
            if (thenShowRecap) setUiState({ kind: "recap" });
            else {
              setUiState({ kind: "normal" });
              refresh();
            }
          }}
        />
      </div>
    );
  }

  if (uiState.kind === "recap") {
    return (
      <div className="space-y-4">
        {header}
        <NightRecapScreen
          game={game}
          onContinue={() => {
            setUiState({ kind: "normal" });
            refresh();
          }}
        />
      </div>
    );
  }

  let stepContent: React.ReactNode;
  switch (game.phase) {
    case "night_godfather":
      stepContent = <GodfatherStep key={`${game.current_round}-godfather`} game={game} players={players} onDone={refresh} />;
      break;
    case "night_cop":
      stepContent = <CopStep key={`${game.current_round}-cop`} game={game} players={players} onDone={refresh} />;
      break;
    case "night_medic":
      stepContent = <MedicStep key={`${game.current_round}-medic`} game={game} players={players} onDone={refresh} />;
      break;
    case "night_silencer":
      stepContent = <SilencerStep key={`${game.current_round}-silencer`} game={game} players={players} onDone={refresh} />;
      break;
    case "night_resolve":
      stepContent = (
        <NightResolveStep
          key={`${game.current_round}-resolve`}
          game={game}
          onKamikaze={(id) => setUiState({ kind: "kamikaze", gamePlayerId: id, thenShowRecap: true })}
          onResolved={() => setUiState({ kind: "recap" })}
        />
      );
      break;
    default:
      stepContent = (
        <RoundInProgress
          game={game}
          players={players}
          narratorName={narratorName}
          onKamikaze={(id) => setUiState({ kind: "kamikaze", gamePlayerId: id, thenShowRecap: false })}
          onRefresh={refresh}
        />
      );
  }

  return (
    <div className="space-y-4">
      {header}
      {undoBar}
      {stepContent}
    </div>
  );
}

function ActionConfirmation({ message, onContinue, label }: { message: string; onContinue: () => void; label?: string }) {
  return (
    <Card className="space-y-3 text-center">
      <p className="text-sm text-foreground">{message}</p>
      <Button onClick={onContinue}>{label ?? "Continue"}</Button>
    </Card>
  );
}

/** Shared "no eligible actor" screen for a night step — always logs a real
 * skip_action (so it's undoable and shows up in the recap) rather than just
 * silently jumping the phase forward client-side. */
function IneligibleStepNotice({
  title,
  message,
  game,
  currentPhase,
  nextPhase,
  onDone,
}: {
  title: string;
  message: string;
  game: Game;
  currentPhase: GamePhase;
  nextPhase: GamePhase;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="space-y-3 text-center">
      <CardTitle>{title}</CardTitle>
      <p className="text-sm text-muted">{message}</p>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await skipNightStepAction(game.id, currentPhase, nextPhase);
            onDone();
          })
        }
      >
        Continue
      </Button>
    </Card>
  );
}

function GodfatherStep({
  game,
  players,
  onDone,
}: {
  game: Game;
  players: GamePlayerWithDetails[];
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "recruit" | "kill">("menu");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const godfather = players.find((p) => p.role.slug === "godfather");
  const living = players.filter((p) => p.alive);

  if (!godfather || !godfather.alive) {
    const message = !godfather
      ? "No Godfather in this game."
      : `${participantDisplay(godfather).name} was the Godfather but is no longer alive — Mafia has no action tonight.`;
    return (
      <div className="space-y-4">
        <IneligibleStepNotice
          title="Godfather"
          message={message}
          game={game}
          currentPhase="night_godfather"
          nextPhase="night_cop"
          onDone={onDone}
        />
        <CurrentMafiaRoster players={players} />
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="space-y-4">
        <ActionConfirmation message={confirmation} onContinue={onDone} />
        <CurrentMafiaRoster players={players} />
      </div>
    );
  }

  const recruitsRemaining = game.godfather_recruits_allowed - game.godfather_recruits_used;
  const eligibleTargets = living.filter((p) => p.id !== godfather.id && p.current_alignment === "civilian");

  function doSkip() {
    setError(null);
    startTransition(async () => {
      try {
        await skipNightStepAction(game.id, "night_godfather", "night_cop");
        setConfirmation("Godfather skipped their action.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function doRecruit() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        await recruitPlayerAction(game.id, godfather!.id, targetId);
        const target = living.find((p) => p.id === targetId)!;
        setConfirmation(
          `Recruit attempted on ${participantDisplay(target).name}. If the Cops catch it tonight, it won't stick.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function doKill() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        await setMafiaKillTargetAction(game.id, godfather!.id, targetId);
        const target = living.find((p) => p.id === targetId)!;
        setConfirmation(`Kill target set: ${participantDisplay(target).name}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <CardTitle>Godfather</CardTitle>
          <p className="font-heading text-lg text-foreground">{participantDisplay(godfather).name}</p>
          <p className="mt-1 text-sm text-muted">What are we doing?</p>
        </div>
        {mode === "menu" && (
          <div className="flex flex-wrap gap-2">
            {recruitsRemaining > 0 && <Button onClick={() => setMode("recruit")}>Recruit ({recruitsRemaining} left)</Button>}
            <Button variant="secondary" onClick={() => setMode("kill")}>
              Kill
            </Button>
            <Button variant="ghost" disabled={pending} onClick={doSkip}>
              Skip Action
            </Button>
          </div>
        )}
        {mode === "recruit" && (
          <div className="space-y-3">
            <PlayerPicker
              options={eligibleTargets.map((p) => ({ id: p.id, name: participantDisplay(p).name, subtitle: p.role.name }))}
              selectedId={selected}
              onSelect={setSelected}
              disabled={pending}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setMode("menu");
                  setSelected(null);
                }}
              >
                Back
              </Button>
              <Button disabled={!selected || pending} onClick={doRecruit}>
                Confirm Recruit
              </Button>
            </div>
          </div>
        )}
        {mode === "kill" && (
          <div className="space-y-3">
            <PlayerPicker
              options={eligibleTargets.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
              selectedId={selected}
              onSelect={setSelected}
              disabled={pending}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setMode("menu");
                  setSelected(null);
                }}
              >
                Back
              </Button>
              <Button variant="danger" disabled={!selected || pending} onClick={doKill}>
                Confirm Kill Target
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-soft">{error}</p>}
      </Card>
      <CurrentMafiaRoster players={players} />
    </div>
  );
}

interface CopConfirmation {
  name: string;
  result: "MAFIA" | "NOT MAFIA";
  isGodfather: boolean;
  checkCount?: number;
}

function CopStep({ game, players, onDone }: { game: Game; players: GamePlayerWithDetails[]; onDone: () => void }) {
  const [mode, setMode] = useState<"menu" | "investigate">("menu");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CopConfirmation | null>(null);
  const [crossCheckResult, setCrossCheckResult] = useState<"MAFIA_FOUND" | "NO_MAFIA_FOUND" | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const living = players.filter((p) => p.alive);
  const livingCops = living.filter((p) => p.role.slug === "cop");
  const anyCops = players.some((p) => p.role.slug === "cop");

  if (livingCops.length === 0) {
    return (
      <IneligibleStepNotice
        title="Cop"
        message={anyCops ? "No living Cop remains." : "No Cop in this game."}
        game={game}
        currentPhase="night_cop"
        nextPhase="night_medic"
        onDone={onDone}
      />
    );
  }

  if (skipped) return <ActionConfirmation message="Cop skipped their action." onContinue={onDone} />;

  if (crossCheckResult) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">Cops Cross Check</p>
        <p className={`font-heading text-2xl ${crossCheckResult === "MAFIA_FOUND" ? "text-red-soft" : "text-civilian"}`}>
          {crossCheckResult === "MAFIA_FOUND" ? "MAFIA FOUND" : "NO MAFIA FOUND"}
        </p>
        <p className="text-sm text-foreground">
          {crossCheckResult === "MAFIA_FOUND" ? "At least one Cop is Mafia-aligned." : "The Cops are clean."}
        </p>
        <Button onClick={onDone}>Continue</Button>
      </Card>
    );
  }

  if (confirmation) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">Cops Checked</p>
        <p className="font-heading text-xl text-foreground">{confirmation.name}</p>
        <p
          className={`font-heading text-2xl ${confirmation.result === "MAFIA" ? "text-red-soft" : "text-civilian"}`}
        >
          RESULT TO GIVE COPS: {confirmation.result}
        </p>
        {confirmation.isGodfather && <Badge tone="gold">GODFATHER CHECK: {confirmation.checkCount} / 2</Badge>}
        <Button onClick={onDone}>Continue</Button>
      </Card>
    );
  }

  // Any living player can be checked, including another Cop — Cops are
  // allowed to cross-check each other (e.g. a clean Cop investigating a
  // recruited/Dirty Cop). Only current_alignment decides the result.
  const targets = living;

  function doInvestigate() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        const result = await copInvestigateAction(game.id, targetId);
        const target = living.find((p) => p.id === targetId)!;
        setConfirmation({
          name: participantDisplay(target).name,
          result: result.result,
          isGodfather: result.isGodfather,
          checkCount: result.checkCount,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function doCrossCheck() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await crossCheckCopsAction(game.id);
        setCrossCheckResult(result.result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function doSkip() {
    setError(null);
    startTransition(async () => {
      try {
        await skipNightStepAction(game.id, "night_cop", "night_medic");
        setSkipped(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>{livingCops.length > 1 ? "Cops" : "Cop"}</CardTitle>
        <p className="font-heading text-lg text-foreground">{livingCops.map((c) => participantDisplay(c).name).join(" + ")}</p>
        <p className="mt-1 text-sm text-muted">What are the Cops doing?</p>
      </div>
      {mode === "menu" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMode("investigate")}>Investigate Player</Button>
          <Button variant="secondary" disabled={pending} onClick={doCrossCheck}>
            {pending ? "Checking..." : "Cross Check Cops"}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={doSkip}>
            Skip Action
          </Button>
        </div>
      )}
      {mode === "investigate" && (
        <div className="space-y-3">
          <PlayerPicker
            options={targets.map((p) => ({
              id: p.id,
              name: participantDisplay(p).name,
              subtitle: p.role.slug === "cop" ? "Cop" : undefined,
            }))}
            selectedId={selected}
            onSelect={setSelected}
            disabled={pending}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setMode("menu");
                setSelected(null);
              }}
            >
              Back
            </Button>
            <Button disabled={!selected || pending} onClick={doInvestigate}>
              Confirm Investigate
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-soft">{error}</p>}
    </Card>
  );
}

function MedicStep({ game, players, onDone }: { game: Game; players: GamePlayerWithDetails[]; onDone: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const living = players.filter((p) => p.alive);
  const medicHolder = players.find((p) => p.role.slug === "medic");
  const medic = medicHolder && medicHolder.alive && medicHolder.current_alignment === "civilian" ? medicHolder : undefined;

  if (!medic) {
    const message = !medicHolder
      ? "No Medic in this game."
      : !medicHolder.alive
        ? "No living Medic remains."
        : `${participantDisplay(medicHolder).name} has been recruited and is now ${roleDisplayLabel(medicHolder)} — no Civilian protection tonight.`;
    return (
      <IneligibleStepNotice
        title="Medic"
        message={message}
        game={game}
        currentPhase="night_medic"
        nextPhase="night_silencer"
        onDone={onDone}
      />
    );
  }

  if (confirmation) return <ActionConfirmation message={confirmation} onContinue={onDone} />;

  const selfSaveUsed = medic.self_save_count >= 1;

  function doProtect() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        await medicProtectAction(game.id, medic!.id, targetId);
        const target = living.find((p) => p.id === targetId)!;
        setConfirmation(`Medic will protect ${participantDisplay(target).name}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function doSkip() {
    setError(null);
    startTransition(async () => {
      try {
        await skipNightStepAction(game.id, "night_medic", "night_silencer");
        setConfirmation("Medic skipped their action.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>Medic</CardTitle>
        <p className="font-heading text-lg text-foreground">{participantDisplay(medic).name}</p>
        <p className="mt-1 text-sm text-muted">Who is the Medic protecting?</p>
      </div>
      <PlayerPicker
        options={living.map((p) => ({
          id: p.id,
          name: participantDisplay(p).name,
          subtitle: p.id === medic.id ? (selfSaveUsed ? "Self-save used" : "Self-save") : undefined,
        }))}
        selectedId={selected}
        onSelect={(id) => {
          if (id === medic.id && selfSaveUsed) return;
          setSelected(id);
        }}
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button variant="ghost" disabled={pending} onClick={doSkip}>
          Skip Action
        </Button>
        <Button disabled={!selected || pending} onClick={doProtect}>
          Confirm Protect
        </Button>
      </div>
      {error && <p className="text-sm text-red-soft">{error}</p>}
    </Card>
  );
}

function SilencerStep({ game, players, onDone }: { game: Game; players: GamePlayerWithDetails[]; onDone: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const living = players.filter((p) => p.alive);
  const silencer = living.find((p) => p.role.slug === "silencer");
  const anySilencer = players.some((p) => p.role.slug === "silencer");

  if (!silencer) {
    return (
      <IneligibleStepNotice
        title="Silencer"
        message={anySilencer ? "No living Silencer remains." : "No Silencer in this game."}
        game={game}
        currentPhase="night_silencer"
        nextPhase="night_resolve"
        onDone={onDone}
      />
    );
  }

  if (confirmation) return <ActionConfirmation message={confirmation} onContinue={onDone} />;

  const targets = living.filter((p) => p.id !== silencer.id);

  function doSilence() {
    if (!selected) return;
    setError(null);
    const targetId = selected;
    startTransition(async () => {
      try {
        await silenceTargetAction(game.id, silencer!.id, targetId);
        const target = living.find((p) => p.id === targetId)!;
        setConfirmation(`${participantDisplay(target).name} will be silenced.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function doSkip() {
    setError(null);
    startTransition(async () => {
      try {
        await skipNightStepAction(game.id, "night_silencer", "night_resolve");
        setConfirmation("Silencer skipped their action.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>Silencer</CardTitle>
        <p className="font-heading text-lg text-foreground">{participantDisplay(silencer).name}</p>
        <p className="mt-1 text-sm text-muted">Who is the Silencer silencing?</p>
      </div>
      <PlayerPicker
        options={targets.map((p) => ({ id: p.id, name: participantDisplay(p).name }))}
        selectedId={selected}
        onSelect={setSelected}
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button variant="ghost" disabled={pending} onClick={doSkip}>
          Skip Action
        </Button>
        <Button disabled={!selected || pending} onClick={doSilence}>
          Confirm Silence
        </Button>
      </div>
      {error && <p className="text-sm text-red-soft">{error}</p>}
    </Card>
  );
}

function NightResolveStep({
  game,
  onKamikaze,
  onResolved,
}: {
  game: Game;
  onKamikaze: (gamePlayerId: string) => void;
  onResolved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doResolve() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resolveNightAction(game.id);
        if (result.kamikazeTriggered) {
          onKamikaze(result.kamikazeTriggered.gamePlayerId);
        } else {
          onResolved();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="space-y-4 text-center">
      <CardTitle>Resolve Night</CardTitle>
      <p className="text-sm text-muted">Reveal the outcome of tonight&apos;s Mafia kill attempt.</p>
      <Button disabled={pending} onClick={doResolve}>
        {pending ? "Resolving..." : "Resolve Night"}
      </Button>
      {error && <p className="text-sm text-red-soft">{error}</p>}
    </Card>
  );
}

function NightRecapScreen({ game, onContinue }: { game: Game; onContinue: () => void }) {
  const [recap, setRecap] = useState<NightRecap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNightRecapAction(game.id, game.current_round)
      .then((r) => {
        if (!cancelled) setRecap(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load recap.");
      });
    return () => {
      cancelled = true;
    };
  }, [game.id, game.current_round]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-heading text-xl text-gold">NIGHT {game.current_round} RECAP</p>
      </div>
      {error && <p className="text-sm text-red-soft">{error}</p>}
      {!recap && !error && <p className="text-center text-sm text-muted">Loading recap...</p>}
      {recap && <NightRecapCards recap={recap} />}
      <Button className="w-full" onClick={onContinue}>
        CONTINUE TO DAY
      </Button>
    </div>
  );
}
