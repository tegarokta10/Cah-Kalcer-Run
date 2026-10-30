# Vercel Deployment Checklist

Use this checklist to deploy V4 manually. Do not use Vercel Preview URLs for Strava OAuth unless each URL is also configured in the Strava Developer Dashboard. Start OAuth and receive its callback on the same stable host.

## Before Deployment

- [ ] `npm install`
- [ ] Tests pass (no test script or test suite is currently configured)
- [ ] TypeScript check passes with `npx tsc --noEmit`
- [ ] `npm run build` passes
- [ ] No real secrets are committed to the repository
- [ ] `.env.example` lists all variables with empty placeholders
- [ ] `.gitignore` excludes local env files, `node_modules`, and `.next`
- [ ] Supabase V4 database migration has been applied
- [ ] Existing V3 activities have an intentional owner backfill; optionally make `user_id` NOT NULL after backfill
- [ ] RLS policies are verified for per-user activity ownership
- [ ] Strava OAuth and sync have been tested with a configured Strava app
- [ ] Gemini has been tested, or rule-based fallback has been confirmed without a key

## Vercel Configuration

- [ ] Repository connected to the correct Vercel project
- [ ] Framework preset is Next.js; build command is `npm run build`
- [ ] Environment variables added without committing their values
- [ ] Production environment selected for production credentials
- [ ] Build succeeds in Vercel

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For Strava integration, also set:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` (the full production callback URL, such as `https://your-domain.example/api/strava/callback`)
- `STRAVA_TOKEN_ENCRYPTION_KEY` (Base64 encoded random 32-byte key; retain the same value)

`GEMINI_API_KEY` is optional. Without it, the app uses its rule-based recommendation fallback.

## Supabase Production

- [ ] Production project URL and anon/publishable key configured in Vercel
- [ ] V4 migration applied to the production database
- [ ] Supabase Auth Site URL set to the production domain
- [ ] `/auth/callback` added to allowed redirect URLs
- [ ] RLS enabled for `running_activities` and `strava_connections`
- [ ] Account ownership verified with two separate users
- [ ] Existing V3 rows backfilled only to the intended account before requiring `user_id`

## Strava Production

- [ ] Production callback domain configured in Strava Developer Dashboard
- [ ] `STRAVA_REDIRECT_URI` exactly matches the registered production callback URL
- [ ] OAuth connect and callback tested on the same stable production host
- [ ] Activity sync tested
- [ ] Repeated sync tested for duplicate prevention
- [ ] Disconnect tested
- [ ] Encryption key stored securely and backed up; changing it makes existing encrypted tokens unreadable
- [ ] Initial sync duration checked with the intended Strava account; the current route paginates available history in one request

## Post Deployment

- [ ] Homepage works
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Manual run creation and deletion persistence work
- [ ] AI recommendation works, or fallback appears when Gemini is unavailable
- [ ] Strava connect works
- [ ] Strava sync works
- [ ] Strava disconnect works
- [ ] Account A cannot access Account B data
- [ ] No production console errors
