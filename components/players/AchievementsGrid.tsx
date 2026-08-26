import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Badge } from "@/types/domain";

export function AchievementsGrid({ earned, locked }: { earned: Badge[]; locked: Badge[] }) {
  return (
    <Card>
      <CardTitle>Achievements</CardTitle>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {earned.map((badge) => (
          <div key={badge.id} className="rounded-lg border border-gold/30 bg-gold/5 p-3">
            <p className="font-heading text-sm text-gold-soft">{badge.name}</p>
            <p className="mt-1 text-xs text-muted">{badge.description}</p>
          </div>
        ))}
        {locked.map((badge) => (
          <div key={badge.id} className={cn("rounded-lg border border-border bg-surface-raised p-3 opacity-50")}>
            <p className="font-heading text-sm text-muted">{badge.name}</p>
            <p className="mt-1 text-xs text-muted/70">{badge.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
