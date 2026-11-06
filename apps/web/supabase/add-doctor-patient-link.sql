-- Add doctor_id and user_id columns to patients table
-- doctor_id: links a patient to their assigned doctor (auth.users.id)
-- user_id: links a patient record to the patient's own auth account

ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add check_in_date and pain_level columns to check_ins table
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS pain_level TEXT;

-- Index for fast lookups by doctor
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
