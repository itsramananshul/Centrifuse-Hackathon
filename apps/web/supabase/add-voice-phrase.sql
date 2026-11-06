-- Add voice_phrase column to patients table
-- Run this in Supabase SQL Editor if schema.sql was already applied

alter table patients add column if not exists voice_phrase text;

-- Set example phrases for seed patients
update patients set voice_phrase = 'Blue Mango Seven' where name = 'Sarah Chen';
update patients set voice_phrase = 'Red Tiger Four' where name = 'James Rodriguez';
update patients set voice_phrase = 'Green Falcon Nine' where name = 'Emily Okafor';
update patients set voice_phrase = 'Silver Eagle Two' where name = 'Michael Torres';
update patients set voice_phrase = 'Golden Hawk Five' where name = 'Aisha Patel';
