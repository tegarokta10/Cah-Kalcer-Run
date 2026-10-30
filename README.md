# Cah Kalcer Run

A running tracker for beginner runners, with Supabase accounts and storage, optional Strava activity sync, and optional Gemini recommendations.

## Current version

V4 includes:

- Supabase email and password authentication
- Per-user running activity storage protected by Row Level Security
- Manual run logging and activity history
- Read-only Strava OAuth and activity sync
- Gemini recommendations with a rule-based fallback
- One-time import of older browser-saved activities
- Public landing page, sign up, login, and protected dashboard

## Local development

Requirements: Node.js 20 or newer and npm.

1. Create a Supabase project and enable Email authentication.
2. Apply the V4 migration in [docs/DATABASE.md](./docs/DATABASE.md). If migrating V3 rows, follow its ownership backfill steps.
3. Copy `.env.example` to `.env.local` and add your local configuration. `.env.local` is ignored by Git.
4. For local Strava testing, set the Strava callback domain to `localhost` and the redirect URL to `http://localhost:3000/api/strava/callback`.
5. Install and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public landing page is `/`, account creation is `/register`, login is `/login`, and the signed-in dashboard is `/dashboard`. `/signup` remains as a legacy route.

Generate a Base64 encoded random 32-byte key for `STRAVA_TOKEN_ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep this value stable. Changing it makes previously encrypted Strava tokens unreadable. Never commit `.env.local`, expose server-only keys to the browser, or use the Supabase service-role key as the anon key.

## Deploy to Vercel

Vercel detects this Next.js App Router project automatically. The production build command is `npm run build`; no custom `vercel.json` is required. Follow [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) before promoting a deployment.

Add environment variable names and values in the Vercel project settings for the environments you use. Local `.env.local` values do not automatically transfer to Vercel. At minimum configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For Strava, also configure `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, and `STRAVA_TOKEN_ENCRYPTION_KEY`. `GEMINI_API_KEY` is optional; recommendations retain the rule-based fallback without it.

For production OAuth, set `STRAVA_REDIRECT_URI` to the exact stable production callback URL, such as `https://your-domain.example/api/strava/callback`. Register that callback URL and its domain in Strava. Set the Supabase Auth Site URL to the production domain and allow `https://your-domain.example/auth/callback` in redirect URLs. Preview deployment URLs need their own OAuth configuration if you want to test sign-in confirmation or Strava there.

## Verify before redeploying

```bash
npx tsc --noEmit --incremental false
npm run build
```

There is no automated test script configured. Use [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production smoke checks and [docs/V4.md](./docs/V4.md) for V4 behavior checks. OAuth, database ownership, and AI provider flows need configured external services to verify end to end.

## Documentation

- [Deployment checklist](./docs/DEPLOYMENT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Database and V4 migration](./docs/DATABASE.md)
- [AI recommendation](./docs/AI-RECOMMENDATION.md)
- [Strava integration](./docs/STRAVA-INTEGRATION.md)
- [V1](./docs/V1.md), [V2](./docs/V2.md), [V3](./docs/V3.md), [V4](./docs/V4.md)

## Tech stack

- Next.js App Router, React, TypeScript, and Tailwind CSS tooling
- Supabase Auth, PostgreSQL, and Row Level Security
- Strava OAuth 2.0 and API v3, read-only
- Google GenAI JavaScript SDK
