import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createProfile } from "@/lib/services/profiles";
import { verifyAccessCode } from "@/lib/services/league";
import { PLAYER_YEARS } from "@/types/domain";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const accessCode = typeof body?.accessCode === "string" ? body.accessCode.trim() : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
    const year = typeof body?.year === "string" ? body.year : "other";

    if (!accessCode || !fullName || !nickname) {
      return NextResponse.json({ error: "Full name, nickname, and access code are required." }, { status: 400 });
    }
    if (!PLAYER_YEARS.includes(year)) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 });
    }

    const codeIsValid = await verifyAccessCode(supabase, accessCode);
    if (!codeIsValid) {
      return NextResponse.json({ error: "That access code isn't valid." }, { status: 403 });
    }

    await createProfile(supabase, {
      id: user.id,
      full_name: fullName,
      nickname,
      year: year as (typeof PLAYER_YEARS)[number],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Always log the real Postgres/Postgrest error server-side (visible in
    // the `npm run dev` terminal) even though the client only gets a message.
    console.error("[join-league]", err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    const alreadyExists = message.includes("duplicate key");
    return NextResponse.json(
      { error: alreadyExists ? "You already have a profile." : message },
      { status: alreadyExists ? 409 : 500 },
    );
  }
}
