# Kaapisoda Supabase Setup

Kaapisoda still works with `localStorage` when Supabase is not configured. Add Supabase only when you want login and cross-device cloud save.

## 1. Create A Supabase Project

Create a Supabase project and copy:

- Project URL
- anon public key

Put them in `config.js`:

```js
window.KAAPISODA_SUPABASE = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key"
};
```

Do not put a `service_role` key in the browser.

## 2. Enable Email Auth

In Supabase Auth, enable email/password signups.

## 3. Create Cloud Save Table

Run this SQL in the Supabase SQL editor:

```sql
create table public.kaapisoda_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"users":[],"currentUserId":null}',
  updated_at timestamptz not null default now()
);

alter table public.kaapisoda_profiles enable row level security;

create policy "Users can read own Kaapisoda save"
on public.kaapisoda_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own Kaapisoda save"
on public.kaapisoda_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own Kaapisoda save"
on public.kaapisoda_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Current Behavior

- If Supabase config is blank, the app stays local-only.
- Sign up/sign in uses Supabase Auth.
- When signed in, Kaapisoda stores the whole MVP save payload in `kaapisoda_profiles.payload`.
- If a cloud save exists, it loads after sign in.
- If no cloud save exists, the user is sent into profile creation.
- The Duo tab stores only share-safe progress summaries in separate Duo tables.

## 4. Create Duo Tables

The Duo tab uses separate share-safe tables. It does not expose full save payloads or journal notes.

Run this after the profile table SQL above:

```sql
create table public.kaapisoda_duos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.kaapisoda_duo_members (
  duo_id uuid not null references public.kaapisoda_duos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (duo_id, user_id)
);

create table public.kaapisoda_duo_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  pronouns text,
  avatar text not null default 'scout',
  kingdom_name text not null,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  best_streak integer not null default 0,
  building_count integer not null default 0,
  last_action_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.kaapisoda_duos enable row level security;
alter table public.kaapisoda_duo_members enable row level security;
alter table public.kaapisoda_duo_summaries enable row level security;

create or replace function public.is_kaapisoda_duo_member(check_duo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kaapisoda_duo_members
    where duo_id = check_duo_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.shares_kaapisoda_duo_with(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kaapisoda_duo_members viewer
    join public.kaapisoda_duo_members owner
      on owner.duo_id = viewer.duo_id
    where viewer.user_id = auth.uid()
      and owner.user_id = check_user_id
  );
$$;

create policy "authenticated users can create duo spaces"
on public.kaapisoda_duos
for insert
to authenticated
with check (created_by = auth.uid());

create policy "authenticated users can find duo codes"
on public.kaapisoda_duos
for select
to authenticated
using (true);

create policy "authenticated users can join duos as themselves"
on public.kaapisoda_duo_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "members can see their duo memberships"
on public.kaapisoda_duo_members
for select
to authenticated
using (user_id = auth.uid() or public.is_kaapisoda_duo_member(duo_id));

create policy "users can upsert their own duo summary"
on public.kaapisoda_duo_summaries
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users can update their own duo summary"
on public.kaapisoda_duo_summaries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "duo members can read each other's summaries"
on public.kaapisoda_duo_summaries
for select
to authenticated
using (user_id = auth.uid() or public.shares_kaapisoda_duo_with(user_id));
```
