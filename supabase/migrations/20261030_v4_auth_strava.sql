-- V4 adds ownership, activity provenance, and private Strava token storage.
-- Existing V3 rows intentionally keep user_id = NULL until an owner is chosen
-- and the documented backfill is run after creating the first account.

alter table public.running_activities
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text;

alter table public.running_activities
  drop constraint if exists running_activities_legacy_id_key;
drop index if exists public.running_activities_legacy_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'running_activities_source_check'
      and conrelid = 'public.running_activities'::regclass
  ) then
    alter table public.running_activities
      add constraint running_activities_source_check check (source in ('manual', 'strava'));
  end if;
end $$;

create unique index if not exists running_activities_user_legacy_id_key
  on public.running_activities (user_id, legacy_id);

create unique index if not exists running_activities_external_identity_key
  on public.running_activities (user_id, source, external_id);

alter table public.running_activities enable row level security;
revoke all on public.running_activities from anon;
revoke all on public.running_activities from authenticated;
grant usage on schema public to authenticated, service_role;
grant select, insert, delete on public.running_activities to authenticated;

drop policy if exists "Development app can read activities" on public.running_activities;
drop policy if exists "Development app can insert activities" on public.running_activities;
drop policy if exists "Development app can delete activities" on public.running_activities;
drop policy if exists "Users can read their own running activities" on public.running_activities;
drop policy if exists "Users can insert their own running activities" on public.running_activities;
drop policy if exists "Users can delete their own running activities" on public.running_activities;

create policy "Users can read their own running activities"
  on public.running_activities for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own running activities"
  on public.running_activities for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own running activities"
  on public.running_activities for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id text not null unique,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  scopes text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strava_connections enable row level security;
revoke all on public.strava_connections from anon;
revoke all on public.strava_connections from authenticated;
grant select, insert, update, delete on public.strava_connections to service_role;
