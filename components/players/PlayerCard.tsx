import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { Avatar } from "@/components/ui/Avatar";
import { YEAR_LABELS, type Profile } from "@/types/domain";

export function PlayerCard({ profile }: { profile: Profile }) {
  const name = profile.nickname || profile.full_name;
  return (
    <Link href={`/players/${profile.id}`}>
      <Card className="flex items-center gap-4 transition-colors hover:border-gold/40">
        <Avatar url={profile.avatar_url} name={name} />
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
