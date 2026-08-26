import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { PermissionLevel, PlayerYear, Profile } from "@/types/domain";
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
