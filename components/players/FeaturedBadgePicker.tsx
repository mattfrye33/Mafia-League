"use client";

import { useState, useTransition } from "react";
import { setFeaturedBadgesAction } from "@/app/profile/actions";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Badge } from "@/types/domain";

export function FeaturedBadgePicker({ earnedBadges, initialFeaturedIds }: { earnedBadges: Badge[]; initialFeaturedIds: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialFeaturedIds);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggle(id: string) {
    setSuccess(false);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await setFeaturedBadgesAction(selected);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  if (earnedBadges.length === 0) {
    return (
      <Card>
        <CardTitle>Featured Badges</CardTitle>
        <p className="mt-2 text-sm text-muted">Earn a badge by playing official games to feature it here.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <CardTitle>Featured Badges</CardTitle>
        <p className="mt-1 text-xs text-muted">Choose up to 3 to show at the top of your profile.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {earnedBadges.map((badge) => {
          const isSelected = selected.includes(badge.id);
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => toggle(badge.id)}
              disabled={!isSelected && selected.length >= 3}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                isSelected ? "border-gold bg-gold/15 text-gold-soft" : "border-border bg-surface-raised text-muted",
              )}
            >
              {badge.name}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-soft">{error}</p>}
      {success && <p className="text-sm text-civilian">Featured badges saved.</p>}
      <Button disabled={pending} onClick={handleSave}>
        {pending ? "Saving..." : "Save Featured Badges"}
      </Button>
    </Card>
  );
}
