"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="font-heading text-xl text-foreground">Something went wrong</h1>
      <p className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-left text-sm text-red-soft">
        {error.message || "Unknown error"}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black hover:bg-gold-soft"
      >
        Try again
      </button>
    </div>
  );
}
