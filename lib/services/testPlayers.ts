import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { TestPlayer } from "@/types/domain";
import { throwIfError } from "@/lib/supabase/errors";

type Client = SupabaseClient<Database>;

export async function listTestPlayers(supabase: Client): Promise<TestPlayer[]> {
  const { data, error } = await supabase
    .from("test_players")
    .select("*")
    .order("created_at", { ascending: true });
  throwIfError(error);
  return (data ?? []) as TestPlayer[];
}

export async function createTestPlayer(
  supabase: Client,
  input: { full_name: string; nickname?: string | null; createdBy: string },
): Promise<void> {
  const { error } = await supabase.from("test_players").insert({
    full_name: input.full_name,
    nickname: input.nickname ?? null,
    created_by: input.createdBy,
  });
  throwIfError(error);
}

/** Adds `count` more test players, numbered after however many already exist,
 * so repeated use never collides with existing names. */
export async function generateTestPlayers(supabase: Client, createdBy: string, count = 12): Promise<void> {
  const existing = await listTestPlayers(supabase);
  const startIndex = existing.length + 1;
  const rows = Array.from({ length: count }, (_, i) => ({
    full_name: `Test Player ${startIndex + i}`,
    nickname: null,
    created_by: createdBy,
  }));
  const { error } = await supabase.from("test_players").insert(rows);
  throwIfError(error);
}

export async function deleteTestPlayer(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("test_players").delete().eq("id", id);
  throwIfError(error);
}

/** Deletes every test player. Cascades to remove them from any test games
 * they're currently seated in. */
export async function deleteAllTestPlayers(supabase: Client): Promise<void> {
  const { error } = await supabase.from("test_players").delete().not("id", "is", null);
  throwIfError(error);
}
