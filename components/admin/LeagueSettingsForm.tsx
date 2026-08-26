"use client";

import { useState, useTransition } from "react";
import { updateLeagueSettings } from "@/app/admin/actions";
import { Field, inputClass } from "@/components/ui/AuthShell";
import { Button } from "@/components/ui/Button";

interface LeagueSettings {
  league_name: string;
  access_code: string;
  current_season: string;
}

export function LeagueSettingsForm({ settings }: { settings: LeagueSettings }) {
  const [leagueName, setLeagueName] = useState(settings.league_name);
  const [accessCode, setAccessCode] = useState(settings.access_code);
  const [season, setSeason] = useState(settings.current_season);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateLeagueSettings({ league_name: leagueName, access_code: accessCode, current_season: season });
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Field label="League Name">
        <input className={inputClass} value={leagueName} onChange={(e) => setLeagueName(e.target.value)} />
      </Field>
      <Field label="Current Season">
        <input className={inputClass} value={season} onChange={(e) => setSeason(e.target.value)} />
      </Field>
      <Field label="Access Code">
        <input className={inputClass} value={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-soft">{error}</p>}
      {success && <p className="text-sm text-civilian">Saved.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save League Settings"}
      </Button>
    </form>
  );
}
