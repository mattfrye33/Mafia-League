import { requireProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/players/ProfileForm";

export default async function ProfilePage() {
  const { profile } = await requireProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Your Profile</h1>
        <p className="mt-1 text-sm text-muted">Update your league profile. Career stats are read-only.</p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
