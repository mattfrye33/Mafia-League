import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { BIO_MAX_LENGTH, PLAYER_YEARS, type PermissionLevel, type PlayerYear, type Profile } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

export async function getProfile(supabase: Client, id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data as Profile | null;
}

export async function listProfiles(supabase: Client): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });
  throwIfError(error);
  return (data ?? []) as Profile[];
}

export async function listActiveProfiles(supabase: Client): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("active", true)
    .order("full_name", { ascending: true });
  throwIfError(error);
  return (data ?? []) as Profile[];
}

export interface CreateProfileInput {
  id: string;
  full_name: string;
  nickname: string;
  year: PlayerYear;
  avatar_url?: string | null;
}

export async function createProfile(supabase: Client, input: CreateProfileInput) {
  const { error } = await supabase.from("profiles").insert(input);
  throwIfError(error);
}

export interface UpdateOwnProfileInput {
  full_name?: string;
  nickname?: string;
  year?: PlayerYear;
  avatar_url?: string | null;
  bio?: string | null;
}

export async function updateOwnProfile(supabase: Client, id: string, input: UpdateOwnProfileInput) {
  const { error } = await supabase.from("profiles").update(input).eq("id", id);
  throwIfError(error);
}

export async function setPermissionLevel(
  supabase: Client,
  id: string,
  permission_level: PermissionLevel,
) {
  const { error } = await supabase.from("profiles").update({ permission_level }).eq("id", id);
  throwIfError(error);
}

export async function setActive(supabase: Client, id: string, active: boolean) {
  const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
  throwIfError(error);
}

/** Admin-only removal of an inappropriate/broken photo — clears the DB
 * reference so it stops displaying anywhere. The underlying storage file is
 * left in place rather than hunting down its exact extension to delete it;
 * an orphaned, unreferenced file in a private per-league bucket isn't worth
 * the extra complexity here. */
export async function removeAvatar(supabase: Client, id: string) {
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", id);
  throwIfError(error);
}

export interface AdminProfileEditInput {
  full_name: string;
  nickname: string;
  year: PlayerYear;
  bio: string | null;
}

function validateAdminProfileEditInput(input: AdminProfileEditInput) {
  const full_name = input.full_name.trim();
  const nickname = input.nickname.trim();
  if (!full_name) throw new Error("Full name is required.");
  if (!nickname) throw new Error("Nickname is required.");
  if (!PLAYER_YEARS.includes(input.year)) throw new Error("Invalid year.");
  const bio = input.bio?.trim() || null;
  if (bio && bio.length > BIO_MAX_LENGTH) {
    throw new Error(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
  }
  return { full_name, nickname, year: input.year, bio };
}

/**
 * Admin-only edit of another player's basic profile fields — full name,
 * nickname, year, bio. Never email, password, Supabase Auth identity, user
 * id, permission_level, or active (those stay behind their own explicitly
 * admin-gated paths, e.g. setPermissionLevel/setActive above). Editing these
 * fields never touches game_players/game_actions, so career stats, history,
 * and badges — which link by profile id, never by name — are unaffected.
 *
 * RLS (profiles_update_self_or_admin) already permits an admin to update any
 * profile row, but `callerIsAdmin` must be proven by the caller (via
 * requireProfile("admin")) before this runs, as defense-in-depth beyond RLS
 * alone — this function refuses to run without it.
 */
export async function updateProfileAsAdmin(
  supabase: Client,
  callerIsAdmin: boolean,
  targetId: string,
  input: AdminProfileEditInput,
): Promise<void> {
  if (!callerIsAdmin) throw new Error("Only an admin can edit another player's profile.");
  const clean = validateAdminProfileEditInput(input);
  const { error } = await supabase.from("profiles").update(clean).eq("id", targetId);
  throwIfError(error);
}
