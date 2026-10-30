# Cah Kalcer Coach

A running tracker for beginner runners. The project evolved from local tracking (V1), through Gemini recommendations (V2) and Supabase storage (V3), to user-owned data and read-only Strava sync (V4).

## Current Version

V4 — Strava Integration

### V4 Features

- Supabase email/password authentication
- User-owned running activities with Row Level Security
- Strava OAuth with read-only activity scope
- Strava activity import and normalization
- Duplicate prevention across repeated syncs
- Persistent manual and Strava running data
- Gemini AI recommendation and rule-based fallback
- V2 browser-data migration

## Setup

You need Node.js 20 or newer and npm.

1. Create a Supabase project and enable Email authentication.
2. Run the V4 SQL migration in [docs/DATABASE.md](./docs/DATABASE.md).
3. If your V3 database has rows, follow the owner backfill in that guide after creating the first account.
4. In Supabase Auth URL Configuration, allow `http://localhost:3000/auth/callback` for email confirmation.
5. Register a Strava API application. Set its authorization callback domain to `localhost` for local development and add `http://localhost:3000/api/strava/callback` as the redirect URI.
6. Copy `.env.example` to `.env.local` and fill in the Supabase, Strava, and token-encryption variables. `GEMINI_API_KEY` is optional.
7. Install and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Restart Next.js after editing `.env.local`.

Create a random 32-byte encryption key for `STRAVA_TOKEN_ENCRYPTION_KEY`, encoded as Base64. For example, run this in a terminal and copy its output into `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never commit `.env.local`. Do not expose the Strava client secret, token encryption key, or Supabase service-role key to the browser.

## First use

1. Sign up or log in.
2. If the browser contains V2 activities, choose whether to import them into your account.
3. Add a manual run or choose **Connect Strava**, approve read access, then use **Sync activities**.
4. Imported activities are marked Strava; disconnecting Strava keeps already imported runs.

## Verify the app

```bash
npm run build
```

Then follow the manual checks in [docs/V4.md](./docs/V4.md). Full OAuth and database tests require a configured Supabase project and Strava application.

## Documentation

### Development History

- [V1 — Running Tracker](./docs/V1.md)
- [V2 — AI Recommendation](./docs/V2.md)
- [V3 — Persistent Database](./docs/V3.md)
- [V4 — Strava Integration](./docs/V4.md)

### Technical Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Database](./docs/DATABASE.md)
- [AI Recommendation](./docs/AI-RECOMMENDATION.md)
- [Strava Integration](./docs/STRAVA-INTEGRATION.md)

## Tech stack

- Next.js App Router, React, and TypeScript
- Supabase Auth, PostgreSQL, and Row Level Security
- Official Strava OAuth 2.0 and API v3
- Official Google GenAI JavaScript SDK (`@google/genai`)

Strava sync is read-only. The app does not post or edit Strava activities and has no social features or AI agent.
