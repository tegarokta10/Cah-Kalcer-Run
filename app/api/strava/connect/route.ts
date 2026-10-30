import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";
const STATE_COOKIE = "strava_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await getAuthenticatedUser();
  if (!auth) return NextResponse.redirect(new URL("/login", url.origin));

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.redirect(new URL("/?strava=connect_config_missing", url.origin));

  const state = randomBytes(32).toString("hex");
  const authorization = new URL("https://www.strava.com/oauth/authorize");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("approval_prompt", "auto");
  authorization.searchParams.set("scope", "activity:read_all");
  authorization.searchParams.set("state", state);

  const response = NextResponse.redirect(authorization);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/strava/callback",
    maxAge: 10 * 60,
  });
  return response;
}
