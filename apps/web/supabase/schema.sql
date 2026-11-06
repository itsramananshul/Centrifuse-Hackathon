-- ============================================================
-- HealthGPS Database Schema
-- Run this in the Supabase SQL Editor to set up the database
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

create table patients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  age integer not null,
  condition text not null,
  trial_id text not null,
  enrolled_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'flagged', 'dropped', 'completed')),
  voice_phrase text,
  latest_check_in_id uuid,
  created_at timestamptz not null default now()
);

create table check_ins (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  timestamp timestamptz not null default now(),
  audio_url text,
  transcript text not null,
  spoken_summary_url text,
  created_at timestamptz not null default now()
);

create table ai_analyses (
  id uuid primary key default uuid_generate_v4(),
  check_in_id uuid not null unique references check_ins(id) on delete cascade,
  summary text not null,
  symptoms jsonb not null default '[]',
  medication_adherence_risk text not null
    check (medication_adherence_risk in ('low', 'medium', 'high')),
  dropout_risk real not null check (dropout_risk >= 0 and dropout_risk <= 1),
  adverse_event boolean not null default false,
  recommended_action text not null,
  created_at timestamptz not null default now()
);

create table alerts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  check_in_id uuid references check_ins(id) on delete cascade,
  type text not null
    check (type in ('adverse_event', 'high_dropout_risk',
                     'medication_nonadherence', 'symptom_escalation',
                     'emergency')),
  severity text not null
    check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

-- Foreign key for latest_check_in_id (deferred to avoid circular dependency)
alter table patients
  add constraint fk_latest_check_in
  foreign key (latest_check_in_id) references check_ins(id) on delete set null;

-- ============================================================
-- Indexes
-- ============================================================

create index idx_check_ins_patient on check_ins(patient_id);
create index idx_alerts_patient on alerts(patient_id);
create index idx_alerts_unacked on alerts(acknowledged) where acknowledged = false;
create index idx_ai_analyses_checkin on ai_analyses(check_in_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table patients enable row level security;
alter table check_ins enable row level security;
alter table ai_analyses enable row level security;
alter table alerts enable row level security;

-- All authenticated users can read all data (clinical monitoring use case)
create policy "Authenticated users can read patients"
  on patients for select to authenticated using (true);

create policy "Authenticated users can insert patients"
  on patients for insert to authenticated with check (true);

create policy "Authenticated users can update patients"
  on patients for update to authenticated using (true) with check (true);

create policy "Authenticated users can read check_ins"
  on check_ins for select to authenticated using (true);

create policy "Authenticated users can insert check_ins"
  on check_ins for insert to authenticated with check (true);

create policy "Authenticated users can read ai_analyses"
  on ai_analyses for select to authenticated using (true);

create policy "Authenticated users can insert ai_analyses"
  on ai_analyses for insert to authenticated with check (true);

create policy "Authenticated users can read alerts"
  on alerts for select to authenticated using (true);

create policy "Authenticated users can insert alerts"
  on alerts for insert to authenticated with check (true);

create policy "Authenticated users can update alerts"
  on alerts for update to authenticated using (true) with check (true);

-- ============================================================
-- Storage (run separately or via dashboard)
-- ============================================================
-- Create a bucket called 'checkin-audio' via the Supabase dashboard
-- Settings: Public bucket, allow authenticated uploads
-- Or use the SQL below:

insert into storage.buckets (id, name, public)
values ('checkin-audio', 'checkin-audio', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload audio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'checkin-audio');

create policy "Anyone can read audio"
  on storage.objects for select
  using (bucket_id = 'checkin-audio');
