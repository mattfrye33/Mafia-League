"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updatePlayerPermission, updatePlayerActive, removeAvatarAction } from "@/app/admin/actions";
import { PERMISSION_LEVELS, YEAR_LABELS, type PermissionLevel, type Profile } from "@/types/domain";
import { PermissionBadge } from "@/components/ui/PermissionBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function PlayerPermissionTable({ players, currentUserId }: { players: Profile[]; currentUserId: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-raised text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Year</th>
            <th className="px-4 py-3">Permission</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {players.map((p) => (
            <PlayerRow key={p.id} player={p} isSelf={p.id === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerRow({ player, isSelf }: { player: Profile; isSelf: boolean }) {
  const [level, setLevel] = useState<PermissionLevel>(player.permission_level);
  const [active, setActiveState] = useState(player.active);
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLevelChange(next: PermissionLevel) {
    setError(null);
    const prev = level;
    setLevel(next);
    startTransition(async () => {
      try {
        await updatePlayerPermission(player.id, next);
      } catch (err) {
        setLevel(prev);
        setError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handleActiveToggle() {
    setError(null);
    const prev = active;
    setActiveState(!prev);
    startTransition(async () => {
      try {
        await updatePlayerActive(player.id, !prev);
      } catch (err) {
        setActiveState(prev);
        setError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  function handleRemoveAvatar() {
    setError(null);
    const prev = avatarUrl;
    setAvatarUrl(null);
    startTransition(async () => {
      try {
        await removeAvatarAction(player.id);
      } catch (err) {
        setAvatarUrl(prev);
        setError(err instanceof Error ? err.message : "Failed to remove photo.");
      }
    });
  }

  return (
    <tr className="align-middle">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl} name={player.nickname || player.full_name} size="sm" />
          <div>
            <p className="font-medium text-foreground">{player.nickname}</p>
            <p className="text-xs text-muted">{player.full_name}</p>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={pending}
                className="text-xs text-red-soft hover:text-red"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-soft">{error}</p>}
      </td>
      <td className="px-4 py-3 text-muted">{YEAR_LABELS[player.year]}</td>
      <td className="px-4 py-3">
        {isSelf ? (
          <PermissionBadge level={level} />
        ) : (
          <select
            className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
            value={level}
            disabled={pending}
            onChange={(e) => handleLevelChange(e.target.value as PermissionLevel)}
          >
            {PERMISSION_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3 text-muted">{active ? "Active" : "Deactivated"}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/admin/players/${player.id}`}>
            <Button variant="secondary">Edit Profile</Button>
          </Link>
          {!isSelf && (
            <Button variant={active ? "danger" : "secondary"} disabled={pending} onClick={handleActiveToggle}>
              {active ? "Deactivate" : "Reactivate"}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
