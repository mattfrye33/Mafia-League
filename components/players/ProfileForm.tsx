"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass } from "@/components/ui/AuthShell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_UPLOAD_BYTES, resizeImageToSquareJpeg } from "@/lib/clientImage";
import { BIO_MAX_LENGTH, PLAYER_YEARS, YEAR_LABELS, type PlayerYear, type Profile } from "@/types/domain";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [year, setYear] = useState<PlayerYear>(profile.year);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setError(null);

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
      setError("That image is too large — please choose one under 8MB.");
      return;
    }

    setUploading(true);
    try {
      const resized = await resizeImageToSquareJpeg(file);
      const supabase = createClient();
      const path = `${profile.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, resized, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, nickname, year, avatar_url: avatarUrl, bio: bio.trim() || null })
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
        <Avatar url={avatarUrl} name={nickname || fullName} size="lg" />
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_AVATAR_TYPES.join(",")}
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
      <Field label={`Bio (${bio.length}/${BIO_MAX_LENGTH})`}>
        <textarea
          className={inputClass}
          rows={3}
          maxLength={BIO_MAX_LENGTH}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short line about yourself..."
        />
      </Field>

      {error && <p className="text-sm text-red-soft">{error}</p>}
      {success && <p className="text-sm text-civilian">Profile updated.</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
