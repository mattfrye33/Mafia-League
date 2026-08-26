"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  setPermissionLevel,
  setActive,
  removeAvatar,
  updateProfileAsAdmin,
  type AdminProfileEditInput,
} from "@/lib/services/profiles";
import { updateLeagueSettingsAdmin } from "@/lib/services/league";
import {
  createTestPlayer,
  generateTestPlayers,
  deleteTestPlayer,
  deleteAllTestPlayers,
} from "@/lib/services/testPlayers";
import { deleteGame, repairGame, repairOfficialGameNumbers, type GameRepairPatch } from "@/lib/services/games";
import type { PermissionLevel } from "@/types/domain";

export async function updatePlayerPermission(playerId: string, level: PermissionLevel) {
  const { supabase, profile } = await requireProfile("admin");
  if (playerId === profile.id) {
    throw new Error("You can't change your own permission level.");
  }
  await setPermissionLevel(supabase, playerId, level);
  revalidatePath("/admin");
}

export async function updatePlayerActive(playerId: string, active: boolean) {
  const { supabase, profile } = await requireProfile("admin");
  if (playerId === profile.id) {
    throw new Error("You can't deactivate your own account.");
  }
  await setActive(supabase, playerId, active);
  revalidatePath("/admin");
}

export async function updateLeagueSettings(input: {
  league_name: string;
  access_code: string;
  current_season: string;
}) {
  const { supabase } = await requireProfile("admin");
  await updateLeagueSettingsAdmin(supabase, input);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createTestPlayerAction(fullName: string, nickname: string) {
  const { supabase, profile } = await requireProfile("admin");
  await createTestPlayer(supabase, { full_name: fullName, nickname: nickname || null, createdBy: profile.id });
  revalidatePath("/admin");
  revalidatePath("/play/new");
}

export async function generateTestPlayersAction() {
  const { supabase, profile } = await requireProfile("admin");
  await generateTestPlayers(supabase, profile.id, 12);
  revalidatePath("/admin");
  revalidatePath("/play/new");
}

export async function deleteTestPlayerAction(id: string) {
  const { supabase } = await requireProfile("admin");
  await deleteTestPlayer(supabase, id);
  revalidatePath("/admin");
  revalidatePath("/play/new");
}

export async function deleteAllTestPlayersAction() {
  const { supabase } = await requireProfile("admin");
  await deleteAllTestPlayers(supabase);
  revalidatePath("/admin");
  revalidatePath("/play/new");
}

export async function removeAvatarAction(playerId: string) {
  const { supabase } = await requireProfile("admin");
  await removeAvatar(supabase, playerId);
  revalidatePath("/admin");
  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
}

/** Admin-only edit of another player's basic profile fields (name, nickname,
 * year, bio) — never email/password/auth identity/permission/active. This
 * action's own admin check IS the enforcement point: updateProfileAsAdmin()
 * refuses to run without proof the caller is an admin, and requireProfile
 * here is exactly that proof, so a non-admin can never reach the update even
 * if RLS alone would technically allow it for a real admin session. */
export async function updatePlayerProfileAction(playerId: string, input: AdminProfileEditInput) {
  const { supabase, profile } = await requireProfile("admin");
  await updateProfileAsAdmin(supabase, profile.permission_level === "admin", playerId, input);
  revalidatePath("/admin");
  revalidatePath(`/admin/players/${playerId}`);
  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/leaderboard");
}

function revalidateGameHistory(gameId?: string) {
  revalidatePath("/admin/games");
  revalidatePath("/play");
  revalidatePath("/play/test-games");
  revalidatePath("/games");
  revalidatePath("/leaderboard");
  revalidatePath("/players");
  if (gameId) revalidatePath(`/games/${gameId}`);
}

export async function deleteGameAdminAction(gameId: string) {
  const { supabase } = await requireProfile("admin");
  await deleteGame(supabase, gameId);
  revalidateGameHistory(gameId);
}

/** Admin-only reset: renumbers every official game sequentially from #1 and
 * guarantees every test game's league_number is NULL. See lib/services/games.ts. */
export async function repairOfficialGameNumbersAction(): Promise<number> {
  const { supabase } = await requireProfile("admin");
  const count = await repairOfficialGameNumbers(supabase);
  revalidateGameHistory();
  return count;
}

/** Admin-only repair of an already-played game's game-level fields (status,
 * official/test, winner, duration, league number) — never fabricates
 * participants or actions. */
export async function repairGameAction(gameId: string, patch: GameRepairPatch) {
  const { supabase } = await requireProfile("admin");
  await repairGame(supabase, gameId, patch);
  revalidateGameHistory(gameId);
}
