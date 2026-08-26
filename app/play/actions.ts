"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  createDraftGame,
  rerollGameRoles,
  updateGamePlayerRole,
  startGame,
  deleteTestGame,
} from "@/lib/services/games";
import type { RoleCounts } from "@/types/domain";

export async function createDraftGameAction(
  profileIds: string[],
  testPlayerIds: string[],
  roleCounts: RoleCounts,
  isTest: boolean,
) {
  const { supabase, profile } = await requireProfile("narrator");
  const gameId = await createDraftGame(supabase, {
    narratorId: profile.id,
    profileIds,
    testPlayerIds,
    roleCounts,
    isTest,
  });
  redirect(`/play/games/${gameId}`);
}

export async function rerollGameRolesAction(gameId: string) {
  const { supabase } = await requireProfile("narrator");
  await rerollGameRoles(supabase, gameId);
  revalidatePath(`/play/games/${gameId}`);
}

export async function updateGamePlayerRoleAction(gamePlayerId: string, roleId: string, gameId: string) {
  const { supabase } = await requireProfile("narrator");
  await updateGamePlayerRole(supabase, gamePlayerId, roleId);
  revalidatePath(`/play/games/${gameId}`);
}

export async function startGameAction(gameId: string) {
  const { supabase } = await requireProfile("narrator");
  await startGame(supabase, gameId);
  revalidatePath(`/play/games/${gameId}`);
}

export async function deleteTestGameAction(gameId: string) {
  const { supabase } = await requireProfile("narrator");
  await deleteTestGame(supabase, gameId);
  revalidatePath("/play");
  revalidatePath("/play/test-games");
}
