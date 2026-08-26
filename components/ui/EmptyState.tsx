export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
      <p className="font-heading text-lg text-muted">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-sm text-sm text-muted/70">{body}</p>}
    </div>
  );
}
