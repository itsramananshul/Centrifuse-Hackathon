-- Fix: allow emergency alerts without a check-in
-- Emergency alerts are triggered directly by patients, not from a check-in.

-- 1. Make check_in_id nullable
ALTER TABLE alerts ALTER COLUMN check_in_id DROP NOT NULL;

-- 2. Add 'emergency' to the allowed type values
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN ('adverse_event', 'high_dropout_risk',
                  'medication_nonadherence', 'symptom_escalation',
                  'emergency'));
