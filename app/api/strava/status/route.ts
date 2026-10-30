import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { getStravaConnection } from "@/lib/strava/client";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Please log in to view Strava status." }, { status: 401 });
  try {
    const { connection } = await getStravaConnection(auth.user.id);
    return NextResponse.json({
      connection: connection ? {
        connected: true,
        athleteId: connection.strava_athlete_id,
        lastSyncedAt: connection.last_synced_at,
      } : { connected: false, athleteId: null, lastSyncedAt: null },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load Strava connection status." }, { status: 503 });
  }
}
