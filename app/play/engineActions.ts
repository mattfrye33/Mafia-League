"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import * as engine from "@/lib/services/gameEngine";
import type { DeathReason, GamePhase, Alignment } from "@/types/domain";

async function withNarrator() {
  const { supabase, profile } = await requireProfile("narrator");
  return { supabase, narratorId: profile.id };
}

function revalidateGame(gameId: string) {
  revalidatePath(`/play/games/${gameId}`);
}

export async function recruitPlayerAction(gameId: string, godfatherGamePlayerId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  await engine.recruitPlayer(supabase, gameId, godfatherGamePlayerId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
}

export async function setMafiaKillTargetAction(gameId: string, godfatherGamePlayerId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  await engine.setMafiaKillTarget(supabase, gameId, godfatherGamePlayerId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
}

export async function skipNightStepAction(gameId: string, currentPhase: GamePhase, nextPhase: GamePhase) {
  const { supabase, narratorId } = await withNarrator();
  await engine.skipNightStep(supabase, gameId, currentPhase, nextPhase, narratorId);
  revalidateGame(gameId);
}

export async function copInvestigateAction(gameId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.copInvestigate(supabase, gameId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function medicProtectAction(gameId: string, medicGamePlayerId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  await engine.medicProtect(supabase, gameId, medicGamePlayerId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
}

export async function silenceTargetAction(gameId: string, silencerGamePlayerId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  await engine.silenceTarget(supabase, gameId, silencerGamePlayerId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
}

export async function resolveNightAction(gameId: string) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.resolveNight(supabase, gameId, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function resolveKamikazeAction(gameId: string, kamikazeGamePlayerId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.resolveKamikaze(supabase, gameId, kamikazeGamePlayerId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function voteEliminateAction(gameId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.voteEliminate(supabase, gameId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function confirmSnipeAction(gameId: string, targetGamePlayerId: string, responsibleGamePlayerId: string | null) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.confirmSnipe(supabase, gameId, targetGamePlayerId, responsibleGamePlayerId, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function denySnipeAction(gameId: string, targetGamePlayerId: string, responsibleGamePlayerId: string | null) {
  const { supabase, narratorId } = await withNarrator();
  await engine.denySnipe(supabase, gameId, targetGamePlayerId, responsibleGamePlayerId, narratorId);
  revalidateGame(gameId);
}

export async function manualDeathAction(gameId: string, targetGamePlayerId: string, reason: DeathReason) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.manualDeath(supabase, gameId, targetGamePlayerId, reason, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function applyPriestUseAction(gameId: string, priestGamePlayerId: string, targetGamePlayerId: string) {
  const { supabase, narratorId } = await withNarrator();
  const result = await engine.applyPriestUse(supabase, gameId, priestGamePlayerId, targetGamePlayerId, narratorId);
  revalidateGame(gameId);
  return result;
}

export async function advanceToNextNightAction(gameId: string) {
  const { supabase, narratorId } = await withNarrator();
  await engine.advanceToNextNight(supabase, gameId, narratorId);
  revalidateGame(gameId);
}

export async function finishGameAction(gameId: string, winnerAlignment: Alignment) {
  const { supabase, narratorId } = await withNarrator();
  await engine.finishGame(supabase, gameId, winnerAlignment, narratorId);
  revalidateGame(gameId);
  revalidatePath("/play");
  revalidatePath("/play/test-games");
}

export async function undoLastActionAction(gameId: string) {
  const { supabase } = await withNarrator();
  const description = await engine.undoLastAction(supabase, gameId);
  revalidateGame(gameId);
  return description;
}

export async function getNightRecapAction(gameId: string, round: number) {
  const { supabase } = await withNarrator();
  return engine.getNightRecap(supabase, gameId, round);
}
