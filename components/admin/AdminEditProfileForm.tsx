"use client";

import { useState, useTransition } from "react";
import { updatePlayerProfileAction } from "@/app/admin/actions";
import { Field, inputClass } from "@/components/ui/AuthShell";
import { Button } from "@/components/ui/Button";
import { BIO_MAX_LENGTH, PLAYER_YEARS, YEAR_LABELS, type PlayerYear, type Profile } from "@/types/domain";

export function AdminEditProfileForm({ player }: { player: Profile }) {
  const [fullName, setFullName] = useState(player.full_name);
  const [nickname, setNickname] = useState(player.nickname);
  const [year, setYear] = useState<PlayerYear>(player.year);
  const [bio, setBio] = useState(player.bio ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updatePlayerProfileAction(player.id, {
          full_name: fullName,
          nickname,
          year,
          bio: bio.trim() || null,
        });
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save changes.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full Name">
        <input required className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Field label="Nickname">
        <input required className={inputClass} value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </Field>
      <Field label="Year">
        <select className={inputClass} value={year} onChange={(e) => setYear(e.target.value as PlayerYear)}>
          {PLAYER_YEARS.map((y) => (
            <option key={y} value={y}>
              {YEAR_LABELS[y]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`Bio (${bio.length}/${BIO_MAX_LENGTH})`}>
        <textarea
          className={inputClass}
          rows={3}
          maxLength={BIO_MAX_LENGTH}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short line about this player..."
        />
      </Field>

      {error && <p className="text-sm text-red-soft">{error}</p>}
      {success && <p className="text-sm text-civilian">Profile updated.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
