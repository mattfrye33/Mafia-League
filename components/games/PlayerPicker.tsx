"use client";

import { cn, initials } from "@/lib/utils";

export interface PickerOption {
  id: string;
  name: string;
  subtitle?: string;
}

export function PlayerPicker({
  options,
  selectedId,
  onSelect,
  disabled,
}: {
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) {
    return <p className="text-sm text-muted">No eligible players.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors disabled:opacity-50",
              isSelected ? "border-gold bg-gold/10" : "border-border bg-surface hover:border-border",
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border font-heading text-lg",
                isSelected ? "border-gold text-gold" : "border-border text-muted",
              )}
            >
              {initials(opt.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{opt.name}</p>
              {opt.subtitle && <p className="truncate text-xs text-muted">{opt.subtitle}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
