"use client";

// Catches errors thrown by the root layout itself (e.g. the session/profile
// lookup used to render the nav) — a normal error.tsx cannot catch those
// because it renders inside the layout, not around it.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0b0b0d", color: "#f2f0ea", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center", padding: "0 16px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h1>
          <p
            style={{
              marginTop: 16,
              padding: "12px 16px",
              border: "1px solid #2a2a2e",
              background: "#1c1c1f",
              borderRadius: 8,
              textAlign: "left",
              fontSize: 14,
              color: "#b23a48",
              wordBreak: "break-word",
            }}
          >
            {error.message || "Unknown error"}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#c9a227",
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
