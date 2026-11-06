-- App users table — stores email, voice phrase, and role in one visible table
-- Run this in Supabase SQL Editor

create table if not exists app_users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  voice_phrase text,
  role text not null default 'patient' check (role in ('patient', 'clinician')),
  created_at timestamptz not null default now()
);

alter table app_users enable row level security;

-- Authenticated users can read all app_users (needed for voice login lookup)
create policy "Authenticated can read app_users"
  on app_users for select to authenticated using (true);

-- Users can update their own row
create policy "Users can update own row"
  on app_users for update to authenticated
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

-- Users can insert their own row
create policy "Users can insert own row"
  on app_users for insert to authenticated
  with check (auth_id = auth.uid());

-- Service role bypasses RLS for voice login (reads by email before auth)
