import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
  return NextResponse.json({ user: { id: auth.user.id, email: auth.user.email ?? "" } });
}
