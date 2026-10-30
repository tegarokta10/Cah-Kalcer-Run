import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptStravaToken } from "@/lib/strava/tokens";

export const runtime = "nodejs";

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Please log in to disconnect Strava." }, { status: 401 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: connection, error: readError } = await admin.from("strava_connections")
      .select("refresh_token_encrypted").eq("user_id", auth.user.id).maybeSingle();
    if (readError) throw readError;
    if (!connection) return NextResponse.json({ disconnected: true });

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Strava client is not configured.");
    const form = new URLSearchParams({ token: decryptStravaToken(connection.refresh_token_encrypted), token_type_hint: "refresh_token" });
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const revokeResponse = await fetch("https://www.strava.com/oauth/revoke", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
      body: form,
      cache: "no-store",
    });
    if (!revokeResponse.ok) {
      return NextResponse.json({ error: "Unable to revoke the Strava connection. Please try again." }, { status: 502 });
    }

    const { error: deleteError } = await admin.from("strava_connections").delete().eq("user_id", auth.user.id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ disconnected: true });
  } catch {
    return NextResponse.json({ error: "Unable to disconnect Strava. Please try again." }, { status: 503 });
  }
}
