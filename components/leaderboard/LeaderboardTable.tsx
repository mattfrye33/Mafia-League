"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { cn, formatDuration, formatPct } from "@/lib/utils";
import type { PlayerCareerStats } from "@/types/domain";

export interface LeaderboardRow {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  stats: PlayerCareerStats | null;
}

type Group = "primary" | "specialty";

type Category = { key: string; label: string; group: Group } & (
  | {
      kind: "rate";
      numerator: (s: PlayerCareerStats) => number;
      denominator: (s: PlayerCareerStats) => number;
      extra: (s: PlayerCareerStats) => string;
    }
  | { kind: "count"; value: (s: PlayerCareerStats) => number }
  | { kind: "duration"; value: (s: PlayerCareerStats) => number }
);

// Percentages always carry their sample size in `extra` so a 1-for-1 record
// never reads the same as a real 10-game trend.
const CATEGORIES: Category[] = [
  {
    key: "win_pct",
    label: "Win %",
    group: "primary",
    kind: "rate",
    numerator: (s) => s.wins,
    denominator: (s) => s.gamesPlayed,
    extra: (s) => `${s.wins}W – ${s.losses}L · ${s.gamesPlayed} games`,
  },
  {
    key: "mafia_win_pct",
    label: "Mafia Win %",
    group: "primary",
    kind: "rate",
    numerator: (s) => s.mafiaWins,
    denominator: (s) => s.mafiaGames,
    extra: (s) => `${s.mafiaWins}/${s.mafiaGames} games`,
  },
  {
    key: "civilian_win_pct",
    label: "Civilian Win %",
    group: "primary",
    kind: "rate",
    numerator: (s) => s.civilianWins,
    denominator: (s) => s.civilianGames,
    extra: (s) => `${s.civilianWins}/${s.civilianGames} games`,
  },
  {
    key: "godfather",
    label: "Godfather",
    group: "primary",
    kind: "rate",
    numerator: (s) => s.godfatherWins,
    denominator: (s) => s.godfatherGames,
    extra: (s) => `${s.godfatherWins} wins / ${s.godfatherGames} games`,
  },
  { key: "successful_recruits", label: "Successful Recruits", group: "primary", kind: "count", value: (s) => s.successfulRecruits },
  { key: "successful_snipes", label: "Successful Snipes", group: "primary", kind: "count", value: (s) => s.successfulSnipes },
  { key: "medic_saves", label: "Medic Saves", group: "primary", kind: "count", value: (s) => s.medicSaves },
  { key: "kamikaze_kills", label: "Kamikaze Kills", group: "primary", kind: "count", value: (s) => s.kamikazeKills },
  { key: "mafia_hours", label: "Mafia Hours", group: "primary", kind: "duration", value: (s) => s.totalMafiaHoursSeconds },
  { key: "times_recruited", label: "Times Recruited", group: "primary", kind: "count", value: (s) => s.timesRecruited },

  // Specialty leaderboards — fun cumulative/death totals not already covered above.
  { key: "most_mafia_wins", label: "Most Mafia Wins", group: "specialty", kind: "count", value: (s) => s.mafiaWins },
  { key: "most_civilian_wins", label: "Most Civilian Wins", group: "specialty", kind: "count", value: (s) => s.civilianWins },
  { key: "most_godfather_wins", label: "Most Godfather Wins", group: "specialty", kind: "count", value: (s) => s.godfatherWins },
  { key: "most_priest_uses", label: "Most Priest Uses", group: "specialty", kind: "count", value: (s) => s.priestUses },
  { key: "most_silenced", label: "Most Silenced", group: "specialty", kind: "count", value: (s) => s.timesSilenced },
  { key: "most_killed_by_mafia", label: "Most Killed by Mafia", group: "specialty", kind: "count", value: (s) => s.timesKilledByMafia },
  { key: "most_voted_out", label: "Most Voted Out", group: "specialty", kind: "count", value: (s) => s.timesVotedOut },
  { key: "most_sniped", label: "Most Sniped", group: "specialty", kind: "count", value: (s) => s.timesSniped },
];

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key);
  const active = CATEGORIES.find((c) => c.key === activeKey)!;

  const withStats = rows.filter((r): r is LeaderboardRow & { stats: PlayerCareerStats } => Boolean(r.stats));

  const ranked = withStats
    .filter((r) => {
      if (active.kind === "rate") return active.denominator(r.stats) > 0;
      if (active.kind === "count") return active.value(r.stats) > 0;
      return r.stats.gamesPlayed > 0;
    })
    .map((r) => {
      if (active.kind === "rate") {
        const num = active.numerator(r.stats);
        const den = active.denominator(r.stats);
        return { ...r, sortValue: num / den, display: formatPct(num, den), context: active.extra(r.stats) };
      }
      if (active.kind === "count") {
        const value = active.value(r.stats);
        return { ...r, sortValue: value, display: String(value), context: null as string | null };
      }
      const value = active.value(r.stats);
      return { ...r, sortValue: value, display: formatDuration(value), context: null as string | null };
    })
    .sort((a, b) => b.sortValue - a.sortValue);

  const primary = CATEGORIES.filter((c) => c.group === "primary");
  const specialty = CATEGORIES.filter((c) => c.group === "specialty");

  const tabRow = (categories: Category[]) => (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <button
          key={c.key}
          onClick={() => setActiveKey(c.key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            c.key === activeKey
              ? "border-gold/50 bg-gold/15 text-gold-soft"
              : "border-border bg-surface-raised text-muted hover:text-foreground",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Player Leaderboards</p>
        {tabRow(primary)}
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Specialty Leaderboards</p>
        {tabRow(specialty)}
      </div>

      <Card className="p-0">
        {ranked.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">No qualifying players yet for this category.</p>
        ) : (
          <div className="divide-y divide-border">
            {ranked.map((r, i) => (
              <Link
                key={r.playerId}
                href={`/players/${r.playerId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised"
              >
                <span className="w-6 shrink-0 text-center font-heading text-sm text-muted">{i + 1}</span>
                <Avatar url={r.avatarUrl} name={r.name} size="sm" />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{r.name}</span>
                <span className="text-right">
                  <span className="block font-heading text-lg text-gold">{r.display}</span>
                  {r.context && <span className="block text-xs text-muted">{r.context}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
