-- User profiles table for voice phrase storage
-- Run this in Supabase SQL Editor

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  voice_phrase text,
  created_at timestamptz not null default now()
);

-- RLS: users can read/update their own profile, service role can read all
alter table user_profiles enable row level security;

create policy "Users can read own profile"
  on user_profiles for select to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on user_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Users can insert own profile"
  on user_profiles for insert to authenticated
  with check (id = auth.uid());

-- Allow service role (used by voice login API) to read any profile by email
-- This is handled by the service_role key which bypasses RLS
