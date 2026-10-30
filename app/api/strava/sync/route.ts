import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { ActivitySaveFailed, StravaReconnectRequired, StravaUnavailable, getValidStravaAccessToken } from "@/lib/strava/client";
import { normalizeStravaActivity, type StravaActivity } from "@/lib/strava/normalize";

export const runtime = "nodejs";
const PAGE_SIZE = 100;

export async function POST() {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Please log in before syncing Strava." }, { status: 401 });

  let tokenContext: Awaited<ReturnType<typeof getValidStravaAccessToken>>;
  try {
    tokenContext = await getValidStravaAccessToken(auth.user.id);
  } catch (error) {
    if (error instanceof StravaReconnectRequired) return NextResponse.json({ error: "Your Strava connection has expired. Please reconnect your account.", code: "STRAVA_RECONNECT" }, { status: 401 });
    return NextResponse.json({ error: "Unable to retrieve activities from Strava. Please try again later.", code: "STRAVA_UNAVAILABLE" }, { status: 502 });
  }

  const { accessToken, connection, admin } = tokenContext;
  const queryAfter = connection.last_synced_at
    ? Math.max(0, Math.floor(Date.parse(connection.last_synced_at) / 1000) - 7 * 24 * 60 * 60)
    : null;
  let newActivities = 0;
  let alreadySynced = 0;
  let runCount = 0;
  let page = 1;

  try {
    while (true) {
      const apiUrl = new URL("https://www.strava.com/api/v3/athlete/activities");
      apiUrl.searchParams.set("page", String(page));
      apiUrl.searchParams.set("per_page", String(PAGE_SIZE));
      if (queryAfter) apiUrl.searchParams.set("after", String(queryAfter));

      const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      if (response.status === 401) {
        await admin.from("strava_connections").delete().eq("user_id", auth.user.id);
        return NextResponse.json({ error: "Your Strava connection has expired. Please reconnect your account.", code: "STRAVA_RECONNECT" }, { status: 401 });
      }
      if (!response.ok) throw new StravaUnavailable();

      const activities: unknown = await response.json();
      if (!Array.isArray(activities)) throw new StravaUnavailable();
      const records = activities
        .filter((activity): activity is StravaActivity => Boolean(activity && typeof activity === "object"))
        .map((activity) => normalizeStravaActivity(activity, auth.user.id))
        .filter((activity): activity is NonNullable<typeof activity> => activity !== null);

      runCount += records.length;
      if (records.length) {
        const { data, error } = await auth.supabase
          .from("running_activities")
          .upsert(records, { onConflict: "user_id,source,external_id", ignoreDuplicates: true })
          .select("id");
        if (error) throw new ActivitySaveFailed();
        const inserted = data?.length ?? 0;
        newActivities += inserted;
        alreadySynced += records.length - inserted;
      }

      if (activities.length < PAGE_SIZE) break;
      page += 1;
    }

    const { error: syncUpdateError } = await admin.from("strava_connections")
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", auth.user.id);
    if (syncUpdateError) throw new ActivitySaveFailed();

    return NextResponse.json({ newActivities, alreadySynced, runCount, lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof ActivitySaveFailed) {
      return NextResponse.json({ error: "Activities were retrieved but could not be saved.", code: "DATABASE_SAVE_FAILED" }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to retrieve activities from Strava. Please try again later.", code: "STRAVA_UNAVAILABLE" }, { status: 502 });
  }
}
