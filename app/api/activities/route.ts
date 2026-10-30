import { NextResponse } from "next/server";
import { ACTIVITY_COLUMNS, validateRunInput } from "@/lib/activities";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Please log in to view activities." }, { status: 401 });
    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("running_activities")
      .select(ACTIVITY_COLUMNS)
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ activities: data });
  } catch {
    return NextResponse.json(
      { error: "Unable to load running activities. Please try again.", code: "DATABASE_UNAVAILABLE" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please enter valid running activity details.", code: "INVALID_ACTIVITY" }, { status: 400 });
  }

  const activity = validateRunInput(body);
  if (!activity) {
    return NextResponse.json({ error: "Please enter a valid date, distance, and duration.", code: "INVALID_ACTIVITY" }, { status: 400 });
  }

  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Please log in to add activities." }, { status: 401 });
    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("running_activities")
      .insert({ ...activity, user_id: user.id, source: "manual" })
      .select(ACTIVITY_COLUMNS)
      .single();

    if (error) throw error;
    return NextResponse.json({ activity: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to save this activity. Please try again.", code: "DATABASE_SAVE_FAILED" },
      { status: 503 },
    );
  }
}
