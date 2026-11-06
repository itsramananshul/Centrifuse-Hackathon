import type { Patient, CheckIn, AiAnalysis, Alert, Symptom } from "@trialpulse/types";

// ============================================================
// Scenario Types
// ============================================================

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  category: "critical" | "high" | "medium" | "low";
}

export interface SyntheticData {
  patients: Patient[];
  checkins: CheckIn[];
  alerts: Alert[];
}

// ============================================================
// Helpers
// ============================================================

let counter = 0;
function uid(): string {
  counter++;
  return `syn-${counter.toString(36)}-${Date.now().toString(36)}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeAnalysis(opts: {
  summary: string;
  symptoms: Symptom[];
  medRisk: "low" | "medium" | "high";
  dropout: number;
  adverse: boolean;
  action: string;
}): AiAnalysis {
  return {
    summary: opts.summary,
    symptoms: opts.symptoms,
    medicationAdherenceRisk: opts.medRisk,
    dropoutRisk: opts.dropout,
    adverseEvent: opts.adverse,
    recommendedAction: opts.action,
  };
}

function makePatient(opts: {
  name: string;
  age: number;
  condition: string;
  status: "active" | "flagged";
  trialId: string;
}): Patient {
  return {
    id: uid(),
    name: opts.name,
    age: opts.age,
    condition: opts.condition,
    trialId: opts.trialId,
    enrolledAt: daysAgo(60),
    status: opts.status,
  };
}

function makeCheckin(
  patientId: string,
  daysBack: number,
  transcript: string,
  analysis?: AiAnalysis
): CheckIn {
  return {
    id: uid(),
    patientId,
    timestamp: daysAgo(daysBack),
    transcript,
    analysis,
  };
}

function makeAlert(
  patientId: string,
  checkInId: string,
  type: "adverse_event" | "high_dropout_risk" | "medication_nonadherence" | "symptom_escalation",
  severity: "low" | "medium" | "high" | "critical",
  message: string,
  daysBack: number
): Alert {
  return {
    id: uid(),
    patientId,
    checkInId,
    type,
    severity,
    message,
    createdAt: daysAgo(daysBack),
    acknowledged: false,
  };
}

// ============================================================
// Scenario Catalog
// ============================================================

export const SCENARIO_CATALOG: SimulationScenario[] = [
  {
    id: "inflammatory-distress",
    name: "Inflammatory Distress",
    description: "High pain, worsening inflammation, distress language in check-ins",
    category: "critical",
  },
  {
    id: "missed-meds",
    name: "Missed Meds + Irregular Check-ins",
    description: "Poor medication adherence, gaps in check-in schedule",
    category: "high",
  },
  {
    id: "vital-spike",
    name: "Vital Spike + Side Effects",
    description: "Sudden vital changes with multiple side effect reports",
    category: "high",
  },
  {
    id: "high-dropout",
    name: "High Dropout Risk",
    description: "Disengaged patient expressing desire to leave the trial",
    category: "critical",
  },
  {
    id: "emergency",
    name: "Emergency Event",
    description: "Acute adverse reaction requiring immediate intervention",
    category: "critical",
  },
  {
    id: "stable-adherent",
    name: "Stable Adherent Patient",
    description: "Low-risk patient with consistent check-ins and good adherence",
    category: "low",
  },
  {
    id: "gradual-deterioration",
    name: "Gradual Deterioration",
    description: "Slowly worsening symptoms over multiple check-ins",
    category: "medium",
  },
  {
    id: "improving",
    name: "Improving Patient",
    description: "Patient showing consistent improvement and recovery signals",
    category: "low",
  },
];

// ============================================================
// Scenario Generators
// ============================================================

function generateInflammatoryDistress(): SyntheticData {
  const p = makePatient({ name: "Syn: Maria Lopez", age: 38, condition: "Rheumatoid Arthritis", status: "flagged", trialId: "SIM-RA-001" });
  const c1 = makeCheckin(p.id, 5, "Joints are aching a bit today. Taking my medication on time.", makeAnalysis({ summary: "Mild joint pain, adherent to medication.", symptoms: [{ name: "Joint pain", severity: 4 }], medRisk: "low", dropout: 0.15, adverse: false, action: "Continue monitoring." }));
  const c2 = makeCheckin(p.id, 3, "Pain is getting worse. My knees are swollen and I can barely walk. Feeling very frustrated.", makeAnalysis({ summary: "Worsening inflammation with significant joint swelling.", symptoms: [{ name: "Joint pain", severity: 7 }, { name: "Swelling", severity: 6 }, { name: "Fatigue", severity: 5 }], medRisk: "low", dropout: 0.35, adverse: false, action: "Schedule follow-up. Consider dose adjustment." }));
  const c3 = makeCheckin(p.id, 1, "I can't take this anymore. The pain is unbearable and I'm scared it's getting worse. I don't know if I want to continue.", makeAnalysis({ summary: "Severe inflammatory response with distress. Patient expressing desire to discontinue.", symptoms: [{ name: "Joint pain", severity: 9 }, { name: "Swelling", severity: 8 }, { name: "Fatigue", severity: 7 }, { name: "Anxiety", severity: 6 }], medRisk: "low", dropout: 0.72, adverse: false, action: "URGENT: Contact patient. Assess pain management options. Discuss trial continuation." }));
  const a1 = makeAlert(p.id, c3.id, "symptom_escalation", "high", "Severe pain escalation: 4/10 → 9/10 over 4 days.", 1);
  return { patients: [p], checkins: [c1, c2, c3], alerts: [a1] };
}

function generateMissedMeds(): SyntheticData {
  const p = makePatient({ name: "Syn: David Kim", age: 55, condition: "Type 2 Diabetes", status: "flagged", trialId: "SIM-T2D-001" });
  const c1 = makeCheckin(p.id, 14, "Everything is fine. Taking my pills.", makeAnalysis({ summary: "Stable. Good adherence.", symptoms: [{ name: "Mild fatigue", severity: 2 }], medRisk: "low", dropout: 0.1, adverse: false, action: "Continue protocol." }));
  const c2 = makeCheckin(p.id, 7, "I forgot my medication twice this week. Been busy with work.", makeAnalysis({ summary: "Missed doses reported. Patient citing schedule conflicts.", symptoms: [{ name: "Fatigue", severity: 4 }], medRisk: "medium", dropout: 0.38, adverse: false, action: "Set up medication reminders. Follow up on adherence." }));
  const c3 = makeCheckin(p.id, 1, "Honestly I keep forgetting. Missed three doses. Not feeling great.", makeAnalysis({ summary: "Repeated non-adherence. Symptoms may be worsening due to inconsistent dosing.", symptoms: [{ name: "Fatigue", severity: 5 }, { name: "Dizziness", severity: 4 }], medRisk: "high", dropout: 0.55, adverse: false, action: "Intervention needed. Consider simplified dosing schedule." }));
  const a1 = makeAlert(p.id, c3.id, "medication_nonadherence", "high", "Repeated medication non-adherence. 3 missed doses this week.", 1);
  return { patients: [p], checkins: [c1, c2, c3], alerts: [a1] };
}

function generateVitalSpike(): SyntheticData {
  const p = makePatient({ name: "Syn: Rachel Nguyen", age: 42, condition: "Hypertension Trial", status: "flagged", trialId: "SIM-HT-001" });
  const c1 = makeCheckin(p.id, 4, "Feeling okay. Had a headache this morning but it passed.", makeAnalysis({ summary: "Mild headache reported. Vitals within range.", symptoms: [{ name: "Headache", severity: 3 }], medRisk: "low", dropout: 0.12, adverse: false, action: "Monitor headache frequency." }));
  const c2 = makeCheckin(p.id, 1, "My heart was racing last night and I felt dizzy. Also getting a rash on my arms. Feeling nauseous.", makeAnalysis({ summary: "Multiple new symptoms: tachycardia, dizziness, skin rash, nausea. Possible adverse drug reaction.", symptoms: [{ name: "Tachycardia", severity: 7 }, { name: "Dizziness", severity: 6 }, { name: "Skin rash", severity: 5 }, { name: "Nausea", severity: 5 }], medRisk: "low", dropout: 0.4, adverse: true, action: "URGENT: Evaluate for adverse drug reaction. Consider dose reduction or medication hold." }));
  const a1 = makeAlert(p.id, c2.id, "adverse_event", "critical", "Possible adverse drug reaction: tachycardia, rash, nausea following dose.", 1);
  return { patients: [p], checkins: [c1, c2], alerts: [a1] };
}

function generateHighDropout(): SyntheticData {
  const p = makePatient({ name: "Syn: Thomas Wright", age: 67, condition: "Chronic Pain Trial", status: "flagged", trialId: "SIM-CP-001" });
  const c1 = makeCheckin(p.id, 10, "Not sure this is helping. Pain is about the same.", makeAnalysis({ summary: "No improvement noted. Patient skeptical.", symptoms: [{ name: "Chronic pain", severity: 6 }, { name: "Low mood", severity: 4 }], medRisk: "low", dropout: 0.45, adverse: false, action: "Discuss expectations. Review pain management approach." }));
  const c2 = makeCheckin(p.id, 3, "I've been thinking about dropping out. This isn't worth the drive to the clinic. Nothing is changing.", makeAnalysis({ summary: "Patient expressing strong dropout intent. No clinical improvement perceived.", symptoms: [{ name: "Chronic pain", severity: 6 }, { name: "Low mood", severity: 6 }, { name: "Frustration", severity: 7 }], medRisk: "medium", dropout: 0.82, adverse: false, action: "HIGH PRIORITY: Retention intervention needed. Consider remote check-in options." }));
  const a1 = makeAlert(p.id, c2.id, "high_dropout_risk", "high", "Dropout risk at 82%. Patient explicitly mentioned leaving the trial.", 3);
  return { patients: [p], checkins: [c1, c2], alerts: [a1] };
}

function generateEmergency(): SyntheticData {
  const p = makePatient({ name: "Syn: Linda Chen", age: 49, condition: "Cardiac Arrhythmia Trial", status: "flagged", trialId: "SIM-CA-001" });
  const c1 = makeCheckin(p.id, 2, "Feeling mostly okay. A little tired.", makeAnalysis({ summary: "Mild fatigue. No concerns.", symptoms: [{ name: "Fatigue", severity: 3 }], medRisk: "low", dropout: 0.1, adverse: false, action: "Continue monitoring." }));
  const c2 = makeCheckin(p.id, 0, "I had terrible chest pain last night and couldn't breathe. My husband almost called an ambulance. I stopped taking the medication. I'm scared.", makeAnalysis({ summary: "CRITICAL: Severe chest pain and dyspnea reported. Patient self-discontinued medication due to fear.", symptoms: [{ name: "Chest pain", severity: 9 }, { name: "Dyspnea", severity: 8 }, { name: "Anxiety", severity: 8 }], medRisk: "high", dropout: 0.9, adverse: true, action: "EMERGENCY: Contact patient immediately. Arrange urgent cardiac evaluation. Document adverse event." }));
  const a1 = makeAlert(p.id, c2.id, "adverse_event", "critical", "EMERGENCY: Chest pain and dyspnea. Patient stopped medication.", 0);
  const a2 = makeAlert(p.id, c2.id, "high_dropout_risk", "high", "Dropout risk 90%. Patient terrified and self-discontinued.", 0);
  return { patients: [p], checkins: [c1, c2], alerts: [a1, a2] };
}

function generateStableAdherent(): SyntheticData {
  const p = makePatient({ name: "Syn: Kenji Tanaka", age: 31, condition: "Asthma Trial", status: "active", trialId: "SIM-AS-001" });
  const c1 = makeCheckin(p.id, 7, "Doing well. Breathing is better. Taking everything on schedule.", makeAnalysis({ summary: "Excellent response to treatment. Symptom improvement noted.", symptoms: [{ name: "Mild wheeze", severity: 2 }], medRisk: "low", dropout: 0.05, adverse: false, action: "Continue current protocol. Positive trajectory." }));
  const c2 = makeCheckin(p.id, 1, "Feeling great. No issues at all. Happy to be in this trial.", makeAnalysis({ summary: "Continued improvement. Patient highly engaged and satisfied.", symptoms: [{ name: "Mild wheeze", severity: 1 }], medRisk: "low", dropout: 0.03, adverse: false, action: "No intervention needed. Excellent compliance." }));
  return { patients: [p], checkins: [c1, c2], alerts: [] };
}

function generateGradualDeterioration(): SyntheticData {
  const p = makePatient({ name: "Syn: Priya Sharma", age: 44, condition: "Fibromyalgia Trial", status: "active", trialId: "SIM-FM-001" });
  const c1 = makeCheckin(p.id, 12, "Mild pain today. Manageable.", makeAnalysis({ summary: "Baseline mild symptoms.", symptoms: [{ name: "Body pain", severity: 3 }, { name: "Fatigue", severity: 3 }], medRisk: "low", dropout: 0.12, adverse: false, action: "Continue monitoring." }));
  const c2 = makeCheckin(p.id, 8, "Pain is a bit worse. Not sleeping well.", makeAnalysis({ summary: "Slight worsening. Sleep disruption noted.", symptoms: [{ name: "Body pain", severity: 4 }, { name: "Fatigue", severity: 4 }, { name: "Insomnia", severity: 5 }], medRisk: "low", dropout: 0.2, adverse: false, action: "Monitor sleep quality. May need intervention." }));
  const c3 = makeCheckin(p.id, 4, "Getting worse. Everything hurts. Very tired all the time.", makeAnalysis({ summary: "Progressive symptom worsening across multiple domains.", symptoms: [{ name: "Body pain", severity: 6 }, { name: "Fatigue", severity: 6 }, { name: "Insomnia", severity: 6 }], medRisk: "low", dropout: 0.35, adverse: false, action: "Schedule follow-up. Review treatment effectiveness." }));
  const c4 = makeCheckin(p.id, 1, "I'm really struggling. The pain is constant now. I'm exhausted and frustrated.", makeAnalysis({ summary: "Significant deterioration. Multi-symptom burden increasing.", symptoms: [{ name: "Body pain", severity: 7 }, { name: "Fatigue", severity: 7 }, { name: "Insomnia", severity: 6 }, { name: "Low mood", severity: 5 }], medRisk: "low", dropout: 0.48, adverse: false, action: "Intervention recommended. Consider protocol adjustment." }));
  const a1 = makeAlert(p.id, c4.id, "symptom_escalation", "medium", "Progressive symptom worsening: pain 3→7 over 11 days.", 1);
  return { patients: [p], checkins: [c1, c2, c3, c4], alerts: [a1] };
}

function generateImproving(): SyntheticData {
  const p = makePatient({ name: "Syn: Alex Rivera", age: 36, condition: "Depression Trial", status: "active", trialId: "SIM-DP-001" });
  const c1 = makeCheckin(p.id, 14, "Not a good day. Feeling very low. Hard to get out of bed.", makeAnalysis({ summary: "Significant depressive symptoms. Low engagement.", symptoms: [{ name: "Low mood", severity: 8 }, { name: "Fatigue", severity: 7 }, { name: "Anhedonia", severity: 6 }], medRisk: "medium", dropout: 0.55, adverse: false, action: "Monitor closely. Consider supportive intervention." }));
  const c2 = makeCheckin(p.id, 7, "Slightly better this week. Still tired but managed to go for a walk.", makeAnalysis({ summary: "Early signs of improvement. Increased activity.", symptoms: [{ name: "Low mood", severity: 5 }, { name: "Fatigue", severity: 5 }], medRisk: "low", dropout: 0.3, adverse: false, action: "Encouraging progress. Continue current treatment." }));
  const c3 = makeCheckin(p.id, 1, "Feeling noticeably better. Sleeping well. More energy. I think the medication is working.", makeAnalysis({ summary: "Clear improvement trajectory. Patient optimistic.", symptoms: [{ name: "Low mood", severity: 3 }, { name: "Fatigue", severity: 2 }], medRisk: "low", dropout: 0.1, adverse: false, action: "Excellent response. Continue protocol." }));
  return { patients: [p], checkins: [c1, c2, c3], alerts: [] };
}

// ============================================================
// Generator Map
// ============================================================

const generators: Record<string, () => SyntheticData> = {
  "inflammatory-distress": generateInflammatoryDistress,
  "missed-meds": generateMissedMeds,
  "vital-spike": generateVitalSpike,
  "high-dropout": generateHighDropout,
  "emergency": generateEmergency,
  "stable-adherent": generateStableAdherent,
  "gradual-deterioration": generateGradualDeterioration,
  "improving": generateImproving,
};

/**
 * Generate synthetic data for selected scenarios.
 * Returns data compatible with the existing dashboard types.
 */
export function generateSyntheticData(scenarioIds: string[]): SyntheticData {
  counter = 0; // Reset for deterministic IDs
  const result: SyntheticData = { patients: [], checkins: [], alerts: [] };

  for (const id of scenarioIds) {
    const gen = generators[id];
    if (!gen) continue;
    const data = gen();
    result.patients.push(...data.patients);
    result.checkins.push(...data.checkins);
    result.alerts.push(...data.alerts);
  }

  return result;
}

/**
 * Generate all scenarios at once for full demo.
 */
export function generateAllScenarios(): SyntheticData {
  return generateSyntheticData(SCENARIO_CATALOG.map((s) => s.id));
}
