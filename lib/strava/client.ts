import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptStravaToken, encryptStravaToken } from "@/lib/strava/tokens";

type ConnectionRow = {
  user_id: string;
  strava_athlete_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
  scopes: string;
  last_synced_at: string | null;
};

export class StravaReconnectRequired extends Error {}
export class StravaUnavailable extends Error {}
export class ActivitySaveFailed extends Error {}

export async function getStravaConnection(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("strava_connections")
    .select("user_id,strava_athlete_id,access_token_encrypted,refresh_token_encrypted,expires_at,scopes,last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { admin, connection: data as ConnectionRow | null };
}

export async function getValidStravaAccessToken(userId: string) {
  const { admin, connection } = await getStravaConnection(userId);
  if (!connection) throw new StravaReconnectRequired("Connect Strava to sync your activities.");

  const expiry = Date.parse(connection.expires_at);
  if (Number.isFinite(expiry) && expiry > Date.now() + 60 * 60 * 1000) {
    return { accessToken: decryptStravaToken(connection.access_token_encrypted), connection, admin };
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new StravaUnavailable("Strava is not configured.");

  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: decryptStravaToken(connection.refresh_token_encrypted),
  });

  let response: Response;
  try {
    response = await fetch("https://www.strava.com/oauth/token", { method: "POST", body: form, cache: "no-store" });
  } catch {
    throw new StravaUnavailable("Unable to retrieve activities from Strava.");
  }

  if (response.status === 400 || response.status === 401) {
    await admin.from("strava_connections").delete().eq("user_id", userId);
    throw new StravaReconnectRequired("Your Strava connection has expired. Please reconnect your account.");
  }
  if (!response.ok) throw new StravaUnavailable("Unable to refresh your Strava connection.");

  const tokenPayload: unknown = await response.json();
  if (!isTokenResponse(tokenPayload)) throw new StravaUnavailable("Unable to refresh your Strava connection.");
  const { error } = await admin.from("strava_connections").update({
    access_token_encrypted: encryptStravaToken(tokenPayload.access_token),
    refresh_token_encrypted: encryptStravaToken(tokenPayload.refresh_token),
    expires_at: new Date(tokenPayload.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (error) throw new StravaUnavailable("Unable to refresh your Strava connection.");

  return {
    accessToken: tokenPayload.access_token,
    connection: { ...connection, expires_at: new Date(tokenPayload.expires_at * 1000).toISOString() },
    admin,
  };
}

export function isTokenResponse(value: unknown): value is {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id?: string | number };
  scope?: string;
} {
  if (!value || typeof value !== "object") return false;
  const token = value as Record<string, unknown>;
  return typeof token.access_token === "string" && token.access_token.length > 0 &&
    typeof token.refresh_token === "string" && token.refresh_token.length > 0 &&
    typeof token.expires_at === "number" && Number.isFinite(token.expires_at);
}

