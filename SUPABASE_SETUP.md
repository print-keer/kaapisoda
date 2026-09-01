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
- If no cloud save exists, the current local save is uploaded.

## Later Duo Upgrade

The current cloud save is private per login. For friend progress, add public/share-safe profile fields and friend codes in a separate table instead of exposing the whole private save payload.
