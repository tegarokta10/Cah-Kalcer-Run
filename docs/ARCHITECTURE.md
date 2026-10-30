# Architecture

## Architecture History

### V1 — LocalStorage + Rules

```text
Browser dashboard
      ↓
localStorage (activities and runner profile)
      ↓
Running statistics and rule-based recommendation
```

V1 stored running activity data in the browser. It did not use a backend, account, database, or AI service.

### V2 — LocalStorage + Gemini

```text
Browser dashboard and localStorage
      ↓ user clicks Generate AI Recommendation
Compact training context
      ↓ POST /api/recommendation
Next.js server route → Gemini API
      ↓
Validated AI output or V1 rule-based fallback
```

V2 kept local activities and profile. The browser sent only a compact running summary to a server-side Gemini route. The Gemini key stayed in server environment configuration. AI requests were user-triggered and the rule-based suggestion remained available on failure.

### V3 — Supabase + Gemini

```text
                         Browser
                   ┌───────┴────────┐
                   ↓                ↓
             Next.js UI        localStorage
                   │           profile + V2 import only
                   ↓
       /api/activities (CRUD/import)
                   ↓
       Supabase running_activities
                   ↓
        Statistics and AI context
                   ↓
       /api/recommendation → Gemini
                   ↓
       AI result or V1 rule fallback
```

### Responsibilities

- **Dashboard (`app/page.tsx`)**: submits forms, displays activity and loading/error states, calculates statistics from rows returned by Supabase, and triggers AI on click.
- **Activity routes (`app/api/activities`)**: validate and create, read, delete, or import activities on the server.
- **Supabase client (`lib/supabase/server.ts`)**: creates a server-only Supabase JavaScript client from environment variables.
- **Supabase**: source of truth for running activities. It returns rows used by statistics and the Gemini training context.
- **Gemini route (`app/api/recommendation/route.ts`)**: validates the summary, calls Gemini using a structured response schema, and returns a friendly error on failure.
- **Rule logic (`lib/running.ts`)**: supplies the baseline recommendation if there are no AI results or a request fails.
- **LocalStorage**: retains only the runner's experience preference and the unimported V2 `runningActivities` key until migration is verified.

### Migration flow

On page load, the browser looks for old V2 activity data. It asks before importing. The API inserts with unique `legacy_id` values and verifies every ID. The browser removes the old activity key only after verification and a successful read from Supabase. A failed migration leaves the old copy in place; a retry is safe.

### Security limitation

V3 intentionally has no authentication. The SQL policies permit anonymous read/insert/delete, so all visitors to the same configured project share one dataset. This is a development/portfolio architecture and is not suitable for personal data or public multi-user deployment. See [Database](./DATABASE.md).

## V4 — Supabase Auth + User-Owned Supabase + Strava + Gemini

```text
Browser
  ├─ Supabase Auth (email/password session cookies)
  └─ Dashboard
       ├─ authenticated Next.js activity routes
       │      └─ Supabase activities (RLS: auth.uid() = user_id)
       ├─ Strava connect/sync routes
       │      ├─ Strava OAuth/API (server only)
       │      └─ encrypted token table (service role, server only)
       └─ Gemini route
              └─ reads this user's Supabase activities → Gemini
```

### Responsibilities

- **Supabase Auth**: email/password sign-up, login, logout, session refresh, and current user.
- **Middleware**: protects the dashboard and refreshes auth cookies. API routes independently verify the user.
- **Activity routes**: attach the authenticated user's ID on manual/imported writes; RLS and explicit filters limit data to that user.
- **Strava routes and `lib/strava`**: handle OAuth state, code exchange, token encryption/refresh, read-only activity sync, normalization, and disconnect. Tokens never reach the browser.
- **Supabase activities**: one source of truth for manual and Strava running records, with source and external IDs for history and duplicate prevention.
- **Gemini route**: queries the current user's database rows and builds its context server-side; it does not trust an activity list sent by the client.
- **Migration**: V3 shared rows need an explicit owner backfill. V2 browser data can be imported by the signed-in user with a per-user unique legacy ID.

For setup and table policies, see [Database](./DATABASE.md). For OAuth and token details, see [Strava Integration](./STRAVA-INTEGRATION.md).
