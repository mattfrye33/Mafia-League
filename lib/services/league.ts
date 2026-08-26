import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { LeaguePublicInfo } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

export async function getLeaguePublicInfo(supabase: Client): Promise<LeaguePublicInfo> {
  const { data, error } = await supabase.rpc("get_league_public_info");
  throwIfError(error);
  return (data?.[0] as LeaguePublicInfo) ?? { league_name: "Mafia League", current_season: "" };
}

export async function verifyAccessCode(supabase: Client, code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_access_code", { code });
  throwIfError(error);
  return Boolean(data);
}

/** Admin-only: raw row including access_code, gated by RLS. */
export async function getLeagueSettingsAdmin(supabase: Client) {
  const { data, error } = await supabase.from("league_settings").select("*").eq("id", 1).single();
  throwIfError(error);
  return data;
}

export async function updateLeagueSettingsAdmin(
  supabase: Client,
  input: Partial<{ league_name: string; access_code: string; current_season: string }>,
) {
  const { error } = await supabase.from("league_settings").update(input).eq("id", 1);
  throwIfError(error);
}
