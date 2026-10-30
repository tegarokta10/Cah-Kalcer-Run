import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { validateRunInput } from "@/lib/activities";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Unable to import old activities. Please try again.", code: "INVALID_IMPORT" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("activities" in body) || !Array.isArray(body.activities) || body.activities.length === 0 || body.activities.length > 500) {
    return NextResponse.json({ error: "No valid previous running activities were found to import.", code: "INVALID_IMPORT" }, { status: 400 });
  }

  const records: Array<{
    legacy_id: string;
    date: string;
    distance: number;
    duration: number;
    pace: number;
    notes?: string;
  }> = [];
  for (const legacy of body.activities) {
    if (!legacy || typeof legacy !== "object" || !("id" in legacy) || typeof legacy.id !== "string" || legacy.id.length === 0) {
      return NextResponse.json({ error: "Unable to import old activities. Some saved data is invalid.", code: "INVALID_IMPORT" }, { status: 400 });
    }
    const activity = validateRunInput(legacy);
    if (!activity) {
      return NextResponse.json({ error: "Unable to import old activities. Some saved data is invalid.", code: "INVALID_IMPORT" }, { status: 400 });
    }
    records.push({ legacy_id: legacy.id, ...activity });
  }

  const legacyIds = [...new Set(records.map((record) => record.legacy_id))];
  if (legacyIds.length !== records.length) {
    return NextResponse.json({ error: "Unable to import old activities because duplicate IDs were found.", code: "DUPLICATE_LEGACY_IDS" }, { status: 400 });
  }

  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Please log in to import activities." }, { status: 401 });
    const { supabase, user } = auth;
    const { error: insertError } = await supabase
      .from("running_activities")
      .upsert(records.map((record) => ({ ...record, user_id: user.id, source: "manual" })), { onConflict: "user_id,legacy_id", ignoreDuplicates: true });
    if (insertError) throw insertError;

    // Verify every source ID is present before the browser removes its old copy.
    const { data, error: verifyError } = await supabase
      .from("running_activities")
      .select("legacy_id")
      .eq("user_id", user.id)
      .in("legacy_id", legacyIds);
    if (verifyError) throw verifyError;
    const verified = new Set((data ?? []).map((row) => row.legacy_id));
    if (legacyIds.some((legacyId) => !verified.has(legacyId))) throw new Error("Import verification failed.");

    return NextResponse.json({ importedCount: legacyIds.length, verified: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to import old activities. Your browser copy has been kept safe.", code: "DATABASE_IMPORT_FAILED" },
      { status: 503 },
    );
  }
}
