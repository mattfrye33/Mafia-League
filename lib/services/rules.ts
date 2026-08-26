import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { RulesVersion } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

export async function getCurrentRules(supabase: Client): Promise<RulesVersion | null> {
  const { data, error } = await supabase
    .from("rules_versions")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  throwIfError(error);
  return data as unknown as RulesVersion | null;
}

export async function listRoles(supabase: Client) {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  throwIfError(error);
  return data ?? [];
}
