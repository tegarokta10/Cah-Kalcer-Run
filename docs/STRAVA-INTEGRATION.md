# Strava Integration

## OAuth flow

```text
Signed-in user
    ↓ GET /api/strava/connect
Strava authorization (activity:read_all)
    ↓ callback with code + state
GET /api/strava/callback validates state cookie
    ↓ server POST /oauth/token
Encrypted tokens saved in strava_connections
    ↓
Dashboard receives only connection status
```

The Strava app callback URI must exactly match `STRAVA_REDIRECT_URI`, for example `http://localhost:3000/api/strava/callback`. Register `localhost` as the callback domain in the Strava application settings. OAuth state is random, short-lived, HttpOnly, and SameSite=Lax.

The application requests only `activity:read_all`, which provides the user's visible activities including activities set to Only You. No `activity:write` permission is requested. Strava documents `activity:read` for Everyone/Followers and `activity:read_all` for those plus Only You activities. See [Strava OAuth scopes](https://developers.strava.com/docs/authentication/).

## Token storage and refresh

The callback exchanges the one-time authorization code on the server. The access token, refresh token, athlete ID, scopes, and expiry are stored in `strava_connections`. Tokens are encrypted as AES-256-GCM strings using the server-only `STRAVA_TOKEN_ENCRYPTION_KEY`.

Before syncing, the server checks expiry. If the access token will expire within an hour, it uses the refresh token grant and saves the newly returned token pair and expiry. Strava may rotate refresh tokens, so the latest returned refresh token always replaces the old one. If Strava rejects a refresh token, the stored connection is removed and the user is asked to reconnect. Token behavior follows [Strava's authentication guide](https://developers.strava.com/docs/authentication/).

## Activity API and sync

The server calls `GET https://www.strava.com/api/v3/athlete/activities` with a bearer token and paginates in pages of 100. Initial sync imports the available history. Later syncs use the last successful sync time with a seven-day overlap; database uniqueness makes repeats safe. Strava's activity-list endpoint and fields are documented in the [API reference](https://developers.strava.com/docs/reference/).

Only `type = Run` or `sport_type` Run, TrailRun, or VirtualRun records are imported. Cycling, walking, hiking, swimming, and other activities are excluded.

## Activity mapping

| Strava field | Application/database field | Conversion |
| --- | --- | --- |
| `id` | `external_id` | String form of Strava ID |
| `start_date_local` (fallback `start_date`) | `date` | First `YYYY-MM-DD` date portion |
| `distance` | `distance` | meters ÷ 1000, rounded to 2 decimal kilometers |
| `elapsed_time` | `duration` | Stored unchanged in seconds |
| `elapsed_time` and normalized distance | `pace` | seconds ÷ kilometers, seconds per kilometer |
| `name` | `notes` | Truncated to 120 characters |
| constant | `source` | `strava` |
| authenticated Supabase session | `user_id` | Set by the server, never from Strava/client input |

Manual activities use `source = manual` and `external_id = NULL`. A partial unique index on `(user_id, source, external_id)` prevents a Strava activity from being imported twice. Strava records and manual records both contribute to dashboard statistics and Gemini context.

## Sync and disconnect

`POST /api/strava/sync` verifies the Supabase user, gets or refreshes that user's token, filters and normalizes runs, and inserts with conflict-ignore semantics. The response contains new and already-synced counts, never raw Strava payloads or tokens.

Disconnect attempts Strava token revocation, then removes the local encrypted connection record. It does not delete imported running activities. If revocation fails, the app leaves the connection stored and asks the user to retry.

## Environment

```env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback
STRAVA_TOKEN_ENCRYPTION_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The client secret, encryption key, service-role key, access tokens, and refresh tokens are server-only. Never use `NEXT_PUBLIC_` for them.
