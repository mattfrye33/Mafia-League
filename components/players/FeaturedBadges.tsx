import { Badge as UiBadge } from "@/components/ui/Badge";
import type { Badge } from "@/types/domain";

export function FeaturedBadges({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
      {badges.map((badge) => (
        <UiBadge key={badge.id} tone="gold" className="px-3 py-1 text-sm">
          {badge.name}
        </UiBadge>
      ))}
    </div>
  );
}
