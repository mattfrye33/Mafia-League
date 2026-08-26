import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getProfile } from "@/lib/services/profiles";
import { Card, CardTitle } from "@/components/ui/Card";
import { AdminEditProfileForm } from "@/components/admin/AdminEditProfileForm";

export default async function AdminPlayerProfilePage({ params }: PageProps<"/admin/players/[id]">) {
  const { id } = await params;
  const { supabase } = await requireProfile("admin");

  const player = await getProfile(supabase, id);
  if (!player) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted hover:text-gold">
          &larr; Admin
        </Link>
        <h1 className="mt-2 font-heading text-2xl text-foreground">Edit Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Fix typos or update basic profile info for {player.full_name}. Email, password, and account access are not
          editable here.
        </p>
      </div>

      <Card className="max-w-md">
        <CardTitle>Basic Info</CardTitle>
        <div className="mt-4">
          <AdminEditProfileForm player={player} />
        </div>
      </Card>
    </div>
  );
}
