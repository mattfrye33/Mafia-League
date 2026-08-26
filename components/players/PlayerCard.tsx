import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { YEAR_LABELS, type Profile } from "@/types/domain";
import { initials } from "@/lib/utils";

export function PlayerCard({ profile }: { profile: Profile }) {
  return (
    <Link href={`/players/${profile.id}`}>
      <Card className="flex items-center gap-4 transition-colors hover:border-gold/40">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised font-heading text-lg text-gold">
          {initials(profile.nickname || profile.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{profile.nickname}</p>
          <p className="truncate text-sm text-muted">
            {profile.full_name} &middot; {YEAR_LABELS[profile.year]}
          </p>
        </div>
        <PermissionBadge level={profile.permission_level} />
      </Card>
    </Link>
  );
}
