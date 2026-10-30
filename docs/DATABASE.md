# Database — Supabase

## V3 schema history

V3 introduced `public.running_activities` with `id` (UUID), `date` (DATE), `distance` (kilometers), `duration` (seconds), `pace` (seconds per kilometer), optional `notes`, optional V2 `legacy_id`, and `created_at`. The original V3 table allowed a shared anonymous dataset; V4 replaces that access model with per-user RLS.

## V4 setup and migration

Use a Supabase project with **Email** enabled under Authentication → Providers. Then:

1. Run [`supabase/migrations/20261030_v4_auth_strava.sql`](../supabase/migrations/20261030_v4_auth_strava.sql) in the Supabase SQL Editor. It adds ownership/source columns, per-user policies, the duplicate keys, and the Strava connection table. Existing V3 activities remain unowned and are hidden by the new RLS policies.
2. Start the app, create the account that should own the existing V3 shared data, and confirm its email if required.
3. In Supabase Authentication → Users, copy that account's UUID. If the V3 table has existing rows, run the following in SQL Editor after replacing the placeholder:

   ```sql
   update public.running_activities
   set user_id = 'PASTE_FIRST_ACCOUNT_UUID_HERE'::uuid
   where user_id is null;

   alter table public.running_activities
     alter column user_id set not null;
   ```

   This assigns all old shared V3 records to the selected owner. If the table is empty, skip the `UPDATE` and run only `ALTER COLUMN ... SET NOT NULL`.
4. Copy `.env.example` to `.env.local`, set the Supabase URL and anon key plus server-only keys as needed, then restart Next.js.

Do not leave old shared records unowned if you want them retained: they will be inaccessible to users until assigned. Do not assign the old rows to an arbitrary user if multiple accounts already exist.

## V4 schema

The migration updates `running_activities`:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner, references `auth.users(id)` |
| `date` | `date` | Run date |
| `distance` | `numeric(8,2)` | Kilometers |
| `duration` | `integer` | Seconds |
| `pace` | `numeric(10,2)` | Seconds per kilometer |
| `notes` | `text` | Optional activity name/note |
| `source` | `text` | `manual` or `strava` |
| `external_id` | `text` | Strava activity ID; null for manual activities |
| `legacy_id` | `text` | V2 browser ID used for safe import |
| `created_at` | `timestamptz` | Database insertion time |

`(user_id, source, external_id)` is unique for non-null external IDs, preventing repeated Strava imports. `(user_id, legacy_id)` is unique for non-null old browser IDs, preventing repeat V2 migration. Manual entries have no `external_id`.

The migration also creates `public.strava_connections`, keyed by `user_id`, with Strava athlete ID, encrypted access and refresh tokens, token expiry, granted scopes, and last sync time. This table has RLS enabled but no `anon`/`authenticated` grants or policies; only the server-side service-role client can access it.

## Row Level Security

Running activities have RLS enabled and separate `SELECT`, `INSERT`, and `DELETE` policies for `authenticated`. Each requires `user_id = auth.uid()`. The application also adds an explicit `user_id` filter in server routes. Anonymous access is revoked. Users cannot read or change another user's activities.

Strava connection tokens are encrypted in the application before storage and are only queried with the server-only `SUPABASE_SERVICE_ROLE_KEY`, after the route verifies the Supabase user. The service-role key and Strava tokens must never be sent to a client component.

## Operations

- `GET /api/activities`: read the signed-in user's activities.
- `POST /api/activities`: validate an activity, calculate pace on the server, and insert with the authenticated user's ID and `source = 'manual'`.
- `DELETE /api/activities/[id]`: delete only a row owned by the signed-in user.
- `POST /api/activities/import`: import V2 browser records with per-user `legacy_id` idempotency, then verify before clearing the old browser copy.
- `GET /api/strava/status`: return connection status without tokens.
- `POST /api/strava/sync`: sync normalized Strava runs using the current user's Strava connection.

Statistics and Gemini training context use the authenticated user's database records. Strava runs and manual runs share the same table and statistics.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

The anon key is used by Supabase Auth in the browser. RLS constrains all activity data. `SUPABASE_SERVICE_ROLE_KEY` is used only by server routes for the token table; never prefix it with `NEXT_PUBLIC_`.

## Security notes

The V4 policies isolate all activity rows by Supabase user ID. Strava OAuth state is checked on callback, tokens are encrypted using AES-256-GCM, and token exchange, refresh, sync, and revocation happen on the server. See [Strava Integration](./STRAVA-INTEGRATION.md).
