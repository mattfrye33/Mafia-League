"use client";

import { useMemo, useState, useTransition } from "react";
import { createDraftGameAction } from "@/app/play/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { emptyRoleCounts, recommendedRoleCounts, totalAssigned, ROLE_SLUGS, type RoleSlug } from "@/lib/gameSetup";
import type { RoleCounts, TestPlayer } from "@/types/domain";
import { YEAR_LABELS, type Profile } from "@/types/domain";
import { cn, initials } from "@/lib/utils";

interface RoleInfo {
  id: string;
  slug: string;
  name: string;
}

// Composite keys ("p:<id>" / "t:<id>") let one Set track both real profiles
// and test players through a single selection/step-2-count flow.
const profileKey = (id: string) => `p:${id}`;
const testKey = (id: string) => `t:${id}`;

export function NewGameWizard({
  players,
  roles,
  testPlayers,
}: {
  players: Profile[];
  roles: RoleInfo[];
  testPlayers: TestPlayer[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isTest, setIsTest] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<RoleCounts>(emptyRoleCounts());
  const [hasCustomized, setHasCustomized] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roleLabel = useMemo(() => {
    const bySlug = new Map(roles.map((r) => [r.slug, r.name]));
    return (slug: RoleSlug) => bySlug.get(slug) ?? slug[0].toUpperCase() + slug.slice(1);
  }, [roles]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setGameType(next: boolean) {
    setIsTest(next);
    if (!next) {
      // Test players can never be part of an Official Game — drop them the
      // moment the toggle switches back, not just at submit time.
      setSelected((prev) => new Set(Array.from(prev).filter((k) => !k.startsWith("t:"))));
    }
  }

  function goToStep2() {
    if (!hasCustomized) {
      setCounts(recommendedRoleCounts(selected.size));
    }
    setStep(2);
  }

  function resetToRecommended() {
    setCounts(recommendedRoleCounts(selected.size));
    setHasCustomized(false);
  }

  function setCount(key: keyof RoleCounts, value: number) {
    setHasCustomized(true);
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  const assigned = totalAssigned(counts);
  const rolesMatch = assigned === selected.size;

  function handleSubmit() {
    setError(null);
    const profileIds = Array.from(selected).filter((k) => k.startsWith("p:")).map((k) => k.slice(2));
    const testPlayerIds = Array.from(selected).filter((k) => k.startsWith("t:")).map((k) => k.slice(2));
    startTransition(async () => {
      try {
        await createDraftGameAction(profileIds, testPlayerIds, counts, isTest);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create game.");
      }
    });
  }

  if (step === 1) {
    return (
      <div className="space-y-4 pb-24">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Select Players</h1>
          <p className="mt-1 text-sm text-muted">Tap everyone who&apos;s playing tonight.</p>
        </div>

        <div className="flex overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setGameType(false)}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-colors",
              !isTest ? "bg-gold text-black" : "bg-surface text-muted",
            )}
          >
            Official Game
          </button>
          <button
            type="button"
            onClick={() => setGameType(true)}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-colors",
              isTest ? "bg-mafia text-white" : "bg-surface text-muted",
            )}
          >
            Test Game
          </button>
        </div>
        {isTest && (
          <p className="text-xs text-muted">
            Test games run through the exact same setup and Narrator flow but never count toward league stats,
            leaderboards, or Mafia Hours, and don&apos;t take an official game number.
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Players</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {players.map((p) => {
              const key = profileKey(p.id);
              const isSelected = selected.has(key);
              return (
                <PlayerTile
                  key={key}
                  isSelected={isSelected}
                  onClick={() => toggle(key)}
                  name={p.nickname}
                  subtitle={YEAR_LABELS[p.year]}
                />
              );
            })}
          </div>
        </div>

        {isTest && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Test Players</p>
            {testPlayers.length === 0 ? (
              <p className="text-sm text-muted">
                No test players yet — an Admin can add them from the Admin page.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {testPlayers.map((tp) => {
                  const key = testKey(tp.id);
                  const isSelected = selected.has(key);
                  return (
                    <PlayerTile
                      key={key}
                      isSelected={isSelected}
                      onClick={() => toggle(key)}
                      name={tp.nickname || tp.full_name}
                      subtitle="TEST"
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <p className="font-heading text-lg text-foreground">{selected.size} Players Selected</p>
            <Button disabled={selected.size === 0} onClick={goToStep2}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <h1 className="font-heading text-2xl text-foreground">Configure Roles</h1>
        {isTest && <Badge tone="gold">TEST</Badge>}
      </div>
      <p className="-mt-2 text-sm text-muted">Recommended counts are pre-filled — adjust as needed.</p>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Recommended for {selected.size} players</p>
          <Button variant="secondary" onClick={resetToRecommended}>
            Reset to Recommended
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {ROLE_SLUGS.map((slug) => (
          <RoleCountRow
            key={slug}
            label={roleLabel(slug)}
            value={counts[slug]}
            onChange={(v) => setCount(slug, v)}
          />
        ))}
      </div>

      <Card className="border-gold/20">
        <RoleCountRow
          label="Godfather Recruits Allowed"
          value={counts.godfatherRecruits}
          onChange={(v) => setCount("godfatherRecruits", v)}
        />
        <p className="mt-2 text-xs text-muted">
          Not a starting role — how many recruits the Godfather can make during the game.
        </p>
      </Card>

      {error && <p className="text-sm text-red-soft">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p
              className={cn(
                "font-heading text-lg",
                rolesMatch ? "text-civilian" : "text-red-soft",
              )}
            >
              {assigned} / {selected.size} Roles Assigned
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!rolesMatch || pending} onClick={handleSubmit}>
              {pending ? "Creating..." : "Randomize & Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerTile({
  isSelected,
  onClick,
  name,
  subtitle,
}: {
  isSelected: boolean;
  onClick: () => void;
  name: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors",
        isSelected ? "border-gold bg-gold/10" : "border-border bg-surface hover:border-border",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border font-heading text-lg",
          isSelected ? "border-gold text-gold" : "border-border text-muted",
        )}
      >
        {initials(name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
    </button>
  );
}

function RoleCountRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <p className="font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg text-foreground hover:border-gold/50"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center font-heading text-lg text-foreground">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg text-foreground hover:border-gold/50"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
