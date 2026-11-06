-- Add doctor_id column to patients table for doctor-patient assignment
-- Run this in Supabase SQL Editor

ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
