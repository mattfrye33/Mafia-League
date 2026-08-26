"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, Field, inputClass } from "@/components/ui/AuthShell";
import { Button } from "@/components/ui/Button";
import { PLAYER_YEARS, YEAR_LABELS, type PlayerYear } from "@/types/domain";

export default function JoinPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [year, setYear] = useState<PlayerYear>("other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/join-league", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode, fullName, nickname, year }),
    });
    const body = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell title="Join the league" subtitle="Enter the private access code from your Narrator or Admin.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Access Code">
          <input
            required
            className={inputClass}
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Full Name">
          <input required className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Nickname">
          <input required className={inputClass} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Field label="Year">
          <select
            className={inputClass}
            value={year}
            onChange={(e) => setYear(e.target.value as PlayerYear)}
          >
            {PLAYER_YEARS.map((y) => (
              <option key={y} value={y}>
                {YEAR_LABELS[y]}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-red-soft">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Joining..." : "Join League"}
        </Button>
      </form>
    </AuthShell>
  );
}
