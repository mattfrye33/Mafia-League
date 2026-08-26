import { requireProfile } from "@/lib/auth";
import { getPlayerBadges, getFeaturedBadges } from "@/lib/services/badges";
import { ProfileForm } from "@/components/players/ProfileForm";
import { FeaturedBadgePicker } from "@/components/players/FeaturedBadgePicker";

export default async function ProfilePage() {
  const { supabase, profile } = await requireProfile();
  const [{ earned }, featured] = await Promise.all([
    getPlayerBadges(supabase, profile.id),
    getFeaturedBadges(supabase, profile.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Your Profile</h1>
        <p className="mt-1 text-sm text-muted">Update your league profile. Career stats are read-only.</p>
      </div>
      <ProfileForm profile={profile} />
      <FeaturedBadgePicker earnedBadges={earned} initialFeaturedIds={featured.map((b) => b.id)} />
    </div>
  );
}
