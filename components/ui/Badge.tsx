import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "gold" | "mafia" | "civilian" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  gold: "bg-gold/15 text-gold-soft border-gold/30",
  mafia: "bg-mafia/15 text-red-soft border-mafia/30",
  civilian: "bg-civilian/15 text-civilian border-civilian/30",
  muted: "bg-surface-raised text-muted border-border",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
