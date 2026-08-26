import { Badge } from "@/components/ui/Badge";
import type { PermissionLevel } from "@/types/domain";

const LABELS: Record<PermissionLevel, string> = {
  player: "Player",
  narrator: "Narrator",
  admin: "Admin",
};

export function PermissionBadge({ level }: { level: PermissionLevel }) {
  return <Badge tone={level === "admin" ? "gold" : level === "narrator" ? "mafia" : "muted"}>{LABELS[level]}</Badge>;
}
