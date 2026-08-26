import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getGame, getGamePlayers, isGameParticipant } from "@/lib/services/games";
import { getProfile } from "@/lib/services/profiles";
import { listRoles } from "@/lib/services/rules";
import { GameSetupReview } from "@/components/games/GameSetupReview";
import { ActiveGameScreen } from "@/components/games/ActiveGameScreen";
import { NarratorEngine } from "@/components/games/NarratorEngine";
import { LiveGameStatus } from "@/components/games/LiveGameStatus";

export default async function GameControlPage({ params }: PageProps<"/play/games/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const game = await getGame(supabase, id);
  if (!game) notFound();

  const isNarrator = profile.permission_level === "narrator" || profile.permission_level === "admin";

  if (!isNarrator) {
    const participant = await isGameParticipant(supabase, id, profile.id);
    if (!participant) notFound();
    return <LiveGameStatus game={game} />;
  }

  if (game.status === "draft") {
    const [players, roles] = await Promise.all([getGamePlayers(supabase, id), listRoles(supabase)]);
    return <GameSetupReview game={game} players={players} roleOptions={roles} />;
  }

  const players = await getGamePlayers(supabase, id);

  if (game.status === "active") {
    const narrator = await getProfile(supabase, game.narrator_id);
    const narratorName = narrator?.nickname || narrator?.full_name || "Narrator";
    return <NarratorEngine game={game} players={players} narratorName={narratorName} />;
  }

  return <ActiveGameScreen game={game} players={players} />;
}
