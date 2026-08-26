import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profiles";
import type { PermissionLevel, Profile } from "@/types/domain";

const RANK: Record<PermissionLevel, number> = { player: 0, narrator: 1, admin: 2 };

/** Current auth user + league profile, or null if signed out / no profile yet. */
export async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null as Profile | null };

  const profile = await getProfile(supabase, user.id);
  return { supabase, user, profile };
}

/** Redirects to /login (no session) or /join (session, no profile yet). Use in server components/pages. */
export async function requireProfile(minLevel: PermissionLevel = "player") {
  const { supabase, user, profile } = await getSessionContext();

  if (!user) redirect("/login");
  if (!profile) redirect("/join");
  if (!profile.active) redirect("/login?deactivated=1");
  if (RANK[profile.permission_level] < RANK[minLevel]) redirect("/");

  return { supabase, user, profile };
}
