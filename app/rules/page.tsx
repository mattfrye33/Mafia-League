import { requireProfile } from "@/lib/auth";
import { getCurrentRules } from "@/lib/services/rules";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function RulesPage() {
  const { supabase } = await requireProfile();
  const rules = await getCurrentRules(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Official Rules</h1>
          <p className="mt-1 text-sm text-muted">The single source of truth when disagreements happen.</p>
        </div>
        {rules && <Badge tone="gold">Version {rules.version}</Badge>}
      </div>

      <div className="space-y-4">
        {rules?.content.map((section) => (
          <Card key={section.section}>
            <h2 className="font-heading text-lg text-gold-soft">{section.section}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{section.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
