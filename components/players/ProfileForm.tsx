"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/ui/AuthShell";
import { Button } from "@/components/ui/Button";
import { PLAYER_YEARS, YEAR_LABELS, type PlayerYear, type Profile } from "@/types/domain";
import { initials } from "@/lib/utils";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [year, setYear] = useState<PlayerYear>(profile.year);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, nickname, year, avatar_url: avatarUrl })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-raised font-heading text-xl text-gold">
            {initials(nickname || fullName)}
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Change photo"}
          </Button>
        </div>
      </div>

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

      {error && <p className="text-sm text-red-soft">{error}</p>}
      {success && <p className="text-sm text-civilian">Profile updated.</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
