"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { setPermissionLevel, setActive, removeAvatar } from "@/lib/services/profiles";
import { updateLeagueSettingsAdmin } from "@/lib/services/league";
import {
  createTestPlayer,
  generateTestPlayers,
  deleteTestPlayer,
  deleteAllTestPlayers,
} from "@/lib/services/testPlayers";
import { deleteGame } from "@/lib/services/games";
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

export async function deleteGameAdminAction(gameId: string) {
  const { supabase } = await requireProfile("admin");
  await deleteGame(supabase, gameId);
  revalidatePath("/admin/games");
  revalidatePath("/play");
  revalidatePath("/play/test-games");
}
