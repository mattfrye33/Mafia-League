"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { setFeaturedBadges } from "@/lib/services/badges";

export async function setFeaturedBadgesAction(badgeIds: string[]) {
  const { supabase, profile } = await requireProfile();
  await setFeaturedBadges(supabase, profile.id, badgeIds);
  revalidatePath("/profile");
  revalidatePath(`/players/${profile.id}`);
}
