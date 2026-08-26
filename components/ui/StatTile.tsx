export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted/70">{hint}</div>}
    </div>
  );
}
