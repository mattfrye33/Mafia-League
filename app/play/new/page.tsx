import { requireProfile } from "@/lib/auth";
import { listActiveProfiles } from "@/lib/services/profiles";
import { listRoles } from "@/lib/services/rules";
import { listTestPlayers } from "@/lib/services/testPlayers";
import { NewGameWizard } from "@/components/games/NewGameWizard";

export default async function NewGamePage() {
  const { supabase } = await requireProfile("narrator");
  const [players, roles, testPlayers] = await Promise.all([
    listActiveProfiles(supabase),
    listRoles(supabase),
    listTestPlayers(supabase),
  ]);

  return <NewGameWizard players={players} roles={roles} testPlayers={testPlayers} />;
}
