-- ============================================================
-- HealthGPS Seed Data
-- Run this AFTER schema.sql to populate demo data
-- ============================================================

-- Patients
insert into patients (id, name, age, condition, trial_id, enrolled_at, status) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Sarah Chen', 34, 'Rheumatoid Arthritis', 'TRIAL-RA-2024', '2024-11-15T00:00:00Z', 'active'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'James Rodriguez', 52, 'Chronic Heart Failure', 'TRIAL-CHF-2024', '2024-10-01T00:00:00Z', 'flagged'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Emily Okafor', 28, 'Type 2 Diabetes', 'TRIAL-T2D-2024', '2024-12-01T00:00:00Z', 'active'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Michael Torres', 61, 'Osteoarthritis', 'TRIAL-OA-2024', '2024-09-20T00:00:00Z', 'flagged'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Aisha Patel', 45, 'Psoriasis', 'TRIAL-PS-2024', '2024-11-10T00:00:00Z', 'active');

-- Check-ins
insert into check_ins (id, patient_id, timestamp, transcript) values
  ('b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2025-01-10T09:30:00Z',
   'Hi, this is Sarah. I''ve been having these headaches for about three days now, and some nausea too. I''m not sleeping well either. I''ve been taking my medication on time though. It''s just... the side effects are really getting to me. I hope they get better soon.'),
  ('b2c3d4e5-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', '2025-01-11T14:15:00Z',
   'This is James. I need to tell you that after my last dose, I had really bad chest tightness and couldn''t breathe properly. It scared me so much that I stopped taking the medication two days ago. I didn''t call anyone, I just stopped. Honestly, I''m thinking about leaving the trial. This doesn''t feel safe.'),
  ('b2c3d4e5-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', '2025-01-12T11:00:00Z',
   'Hey, it''s Emily. I''m feeling pretty good actually. A little tired sometimes but it''s getting better. I''ve been really good about taking my meds every day. I''m happy to be part of this trial, I think it''s helping.'),
  ('b2c3d4e5-0004-4000-8000-000000000004', 'a1b2c3d4-0004-4000-8000-000000000004', '2025-01-12T16:45:00Z',
   'Michael here. Look, I forgot to take my pills twice this week. My joints are really hurting and I''m stiff all the time. I''m not in a great mood about this whole thing. I''ve been thinking maybe this isn''t worth it. Maybe I should just drop out.'),
  ('b2c3d4e5-0005-4000-8000-000000000005', 'a1b2c3d4-0005-4000-8000-000000000005', '2025-01-13T08:20:00Z',
   'Hello, this is Aisha. I wanted to report that I developed a rash about two days after my dose was increased. It''s quite itchy and uncomfortable. Other than that I feel fine and I''m still taking everything as prescribed. Just wanted to make sure you know about the rash.');

-- Update patients with latest check-in references
update patients set latest_check_in_id = 'b2c3d4e5-0001-4000-8000-000000000001' where id = 'a1b2c3d4-0001-4000-8000-000000000001';
update patients set latest_check_in_id = 'b2c3d4e5-0002-4000-8000-000000000002' where id = 'a1b2c3d4-0002-4000-8000-000000000002';
update patients set latest_check_in_id = 'b2c3d4e5-0003-4000-8000-000000000003' where id = 'a1b2c3d4-0003-4000-8000-000000000003';
update patients set latest_check_in_id = 'b2c3d4e5-0004-4000-8000-000000000004' where id = 'a1b2c3d4-0004-4000-8000-000000000004';
update patients set latest_check_in_id = 'b2c3d4e5-0005-4000-8000-000000000005' where id = 'a1b2c3d4-0005-4000-8000-000000000005';

-- AI Analyses
insert into ai_analyses (id, check_in_id, summary, symptoms, medication_adherence_risk, dropout_risk, adverse_event, recommended_action) values
  ('c3d4e5f6-0001-4000-8000-000000000001', 'b2c3d4e5-0001-4000-8000-000000000001',
   'Patient reports persistent headaches and mild nausea over the past 3 days. Sleep quality has declined. Medication taken as scheduled but patient expresses frustration with side effects.',
   '[{"name": "Headache", "severity": 6}, {"name": "Nausea", "severity": 4}, {"name": "Insomnia", "severity": 5}]',
   'low', 0.35, false,
   'Schedule follow-up call to discuss side effect management. Consider dose adjustment.'),
  ('c3d4e5f6-0002-4000-8000-000000000002', 'b2c3d4e5-0002-4000-8000-000000000002',
   'Patient reports severe chest tightness and difficulty breathing after last dose. Stopped taking medication 2 days ago without consulting physician. Expresses desire to leave trial.',
   '[{"name": "Chest tightness", "severity": 8}, {"name": "Dyspnea", "severity": 7}, {"name": "Anxiety", "severity": 6}]',
   'high', 0.85, true,
   'URGENT: Contact patient immediately. Possible adverse reaction. Schedule in-person evaluation within 24 hours.'),
  ('c3d4e5f6-0003-4000-8000-000000000003', 'b2c3d4e5-0003-4000-8000-000000000003',
   'Patient feeling well overall. Mild fatigue noted but improving. Medication adherence is excellent. Positive outlook on trial participation.',
   '[{"name": "Fatigue", "severity": 2}]',
   'low', 0.10, false,
   'Continue current protocol. Positive trajectory — no intervention needed.'),
  ('c3d4e5f6-0004-4000-8000-000000000004', 'b2c3d4e5-0004-4000-8000-000000000004',
   'Patient missed two doses this week due to forgetfulness. Reports joint pain and stiffness increasing. Mood is low. Mentioned considering dropping out.',
   '[{"name": "Joint pain", "severity": 7}, {"name": "Stiffness", "severity": 5}, {"name": "Low mood", "severity": 6}]',
   'medium', 0.62, false,
   'Implement medication reminder system. Schedule motivational check-in. Monitor dropout risk closely.'),
  ('c3d4e5f6-0005-4000-8000-000000000005', 'b2c3d4e5-0005-4000-8000-000000000005',
   'Patient reports skin rash that appeared 48 hours after dose increase. Itching is significant. Otherwise feeling okay. Continues taking medication.',
   '[{"name": "Skin rash", "severity": 6}, {"name": "Pruritus", "severity": 7}]',
   'low', 0.28, true,
   'Document potential adverse drug reaction. Consider dermatology referral. May need dose adjustment.');

-- Alerts
insert into alerts (id, patient_id, check_in_id, type, severity, message, acknowledged, created_at) values
  ('d4e5f6a7-0001-4000-8000-000000000001', 'a1b2c3d4-0002-4000-8000-000000000002', 'b2c3d4e5-0002-4000-8000-000000000002',
   'adverse_event', 'critical',
   'Adverse event reported: chest tightness and dyspnea after dose. Patient self-discontinued medication.',
   false, '2025-01-11T14:20:00Z'),
  ('d4e5f6a7-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'b2c3d4e5-0002-4000-8000-000000000002',
   'high_dropout_risk', 'high',
   'Dropout risk at 85%. Patient has expressed desire to leave the trial.',
   false, '2025-01-11T14:20:00Z'),
  ('d4e5f6a7-0003-4000-8000-000000000003', 'a1b2c3d4-0004-4000-8000-000000000004', 'b2c3d4e5-0004-4000-8000-000000000004',
   'medication_nonadherence', 'medium',
   'Patient missed 2 doses this week. Medication adherence risk elevated.',
   false, '2025-01-12T16:50:00Z'),
  ('d4e5f6a7-0004-4000-8000-000000000004', 'a1b2c3d4-0004-4000-8000-000000000004', 'b2c3d4e5-0004-4000-8000-000000000004',
   'high_dropout_risk', 'high',
   'Dropout risk at 62%. Patient mentioned considering leaving the trial.',
   false, '2025-01-12T16:50:00Z'),
  ('d4e5f6a7-0005-4000-8000-000000000005', 'a1b2c3d4-0005-4000-8000-000000000005', 'b2c3d4e5-0005-4000-8000-000000000005',
   'adverse_event', 'medium',
   'Potential adverse drug reaction: skin rash following dose increase.',
   false, '2025-01-13T08:25:00Z');
