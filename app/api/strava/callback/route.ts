import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { encryptStravaToken } from "@/lib/strava/tokens";
import { isTokenResponse } from "@/lib/strava/client";

export const runtime = "nodejs";
const STATE_COOKIE = "strava_oauth_state";

function callbackRedirect(origin: string, result: string) {
  const response = NextResponse.redirect(new URL(`/?strava=${encodeURIComponent(result)}`, origin));
  response.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/strava/callback", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value ?? "";
  const returnedState = url.searchParams.get("state") ?? "";
  const stateMatches = expectedState.length === returnedState.length && expectedState.length > 0 &&
    timingSafeEqual(Buffer.from(expectedState), Buffer.from(returnedState));
  if (!stateMatches) {
    console.warn("Strava OAuth callback failed at state validation. Check that the browser returned to the same host used to start OAuth.");
    return callbackRedirect(url.origin, "state_invalid");
  }

  if (url.searchParams.get("error") === "access_denied") return callbackRedirect(url.origin, "cancelled");
  const code = url.searchParams.get("code");
  if (!code) return callbackRedirect(url.origin, "authorization_code_missing");

  let stage = "session_check";
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.redirect(new URL("/login?error=session_expired", url.origin));

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) return callbackRedirect(url.origin, "strava_credentials_missing");

    stage = "token_exchange";
    const form = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" });
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", { method: "POST", body: form, cache: "no-store" });
    if (!tokenResponse.ok) {
      console.warn(`Strava OAuth token exchange failed with HTTP ${tokenResponse.status}.`);
      return callbackRedirect(url.origin, "token_exchange_failed");
    }
    const token: unknown = await tokenResponse.json();
    if (!isTokenResponse(token) || !token.athlete?.id || typeof token.scope !== "string") return callbackRedirect(url.origin, "token_response_invalid");
    const grantedScopes = token.scope.split(/[ ,]+/);
    if (!grantedScopes.includes("activity:read_all")) return callbackRedirect(url.origin, "scope_insufficient");

    stage = "token_encryption";
    const accessTokenEncrypted = encryptStravaToken(token.access_token);
    const refreshTokenEncrypted = encryptStravaToken(token.refresh_token);
    stage = "connection_storage";
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("strava_connections").upsert({
      user_id: auth.user.id,
      strava_athlete_id: String(token.athlete.id),
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      scopes: grantedScopes.join(" "),
      last_synced_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) {
      console.error(`Could not store Strava connection in Supabase (code ${error.code ?? "unknown"}).`);
      return callbackRedirect(url.origin, "connection_storage_failed");
    }
    return callbackRedirect(url.origin, "connected");
  } catch (error) {
    console.error(`Strava OAuth failed during ${stage}.`, error instanceof Error ? error.message : "Unknown error");
    const result = stage === "token_encryption" ? "token_encryption_config_error" :
      stage === "connection_storage" ? "connection_storage_failed" : "connect_failed";
    return callbackRedirect(url.origin, result);
  }
}
