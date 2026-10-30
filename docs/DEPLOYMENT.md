# Vercel Deployment Checklist

This project is a standard Next.js App Router deployment. Vercel detects Next.js automatically; leave the framework preset and build command at their defaults (`Next.js` and `npm run build`). A custom `vercel.json` is not needed.

## Before deployment

- [ ] Review the working tree and commit the intended app changes.
- [ ] Confirm no real secrets are committed. `.env.local` must stay local and ignored by Git.
- [ ] Confirm `.env.example` contains only empty placeholders.
- [ ] Run `npx tsc --noEmit --incremental false`.
- [ ] Run `npm run build`.
- [ ] Note: this repository has no automated test script or test suite configured.
- [ ] Apply the V4 SQL migration to the production Supabase project.
- [ ] If retaining V3 activity rows, assign them to the intended account as described in [DATABASE.md](./DATABASE.md).
- [ ] Check RLS ownership using two separate accounts before using real user data.

## Configure Vercel

1. Connect the repository to the intended Vercel project, or select the existing project linked to this repository.
2. Confirm the project root is the repository root and the framework is detected as Next.js.
3. Add variables in **Project Settings > Environment Variables**. Local `.env.local` values are not uploaded automatically.
4. Add the values to the Vercel environments where they are needed. Production requires Production values. Add Preview values only if Preview deployments should access the services.
5. Trigger a deployment from the intended branch or commit. Review the build log and production deployment URL.

Required for account login and activity storage:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for Strava integration:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` (full URL ending in `/api/strava/callback`)
- `STRAVA_TOKEN_ENCRYPTION_KEY` (Base64 encoded random 32-byte key)

Optional:

- `GEMINI_API_KEY` (the rule-based recommendation remains available without it)

Keep the token encryption key stable. Changing it makes stored Strava tokens unreadable. Never add the service-role key, Strava secret, or encryption key to a `NEXT_PUBLIC_` variable.

## Configure production callbacks

Choose the stable production domain before configuring callbacks. Use the same domain consistently for sign-in and Strava OAuth.

In Supabase Auth URL Configuration:

- Set the Site URL to the production origin, for example `https://your-domain.example`.
- Add `https://your-domain.example/auth/callback` to the allowed redirect URLs.

In the Strava Developer Dashboard:

- Set the callback domain to the production hostname, without the protocol or path.
- Register the full callback URL `https://your-domain.example/api/strava/callback`.
- Set Vercel's `STRAVA_REDIRECT_URI` to that exact URL.

OAuth begins and returns on the same stable host. Preview URLs are temporary and will not work for OAuth unless their hostname and callback are also registered and the Preview environment variables match.

## After deployment

- [ ] Open `/` and confirm the public landing page loads.
- [ ] Create an account at `/register`, confirm email if required, then log in at `/login`.
- [ ] Confirm login opens `/dashboard` and logout returns to `/login`.
- [ ] Create a manual run and confirm it appears after refresh; delete it and confirm it stays deleted.
- [ ] Confirm one account cannot access another account's activities.
- [ ] Generate an AI recommendation, or confirm the rule-based result works when Gemini is not configured.
- [ ] If Strava is configured, connect, sync, repeat sync to check duplicate handling, and disconnect.
- [ ] Check Vercel function logs and browser console for runtime errors.

Local verification for this deployment preparation: TypeScript check and production build completed successfully. Landing, login, and register returned HTTP 200 in a local production-server smoke check. The unauthenticated dashboard redirected to login. External Supabase, Strava, and Gemini behavior must still be verified against the production configuration.
