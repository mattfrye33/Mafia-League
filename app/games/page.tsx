import { requireProfile } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function GamesPage() {
  await requireProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Games Archive</h1>
        <p className="mt-1 text-sm text-muted">Completed league games, most recent first.</p>
      </div>
      <EmptyState
        title="No completed games yet"
        body="Once a Narrator finishes a game, its summary will appear here."
      />
    </div>
  );
}
