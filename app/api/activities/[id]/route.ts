import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Unable to delete this activity. Please try again.", code: "INVALID_ACTIVITY_ID" }, { status: 400 });
  }

  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Please log in to delete activities." }, { status: 401 });
    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("running_activities")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "This running activity was not found.", code: "ACTIVITY_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete this activity. Please try again.", code: "DATABASE_DELETE_FAILED" },
      { status: 503 },
    );
  }
}
