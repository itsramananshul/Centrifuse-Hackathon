import type { Patient, CheckIn, Alert, AiAnalysis } from "@trialpulse/types";

// ============================================================
// Types
// ============================================================

export type DropoutLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface DropoutPrediction {
  patientId: string;
  score: number; // 0-100
  level: DropoutLevel;
  reasons: string[];
  confidence: ConfidenceLevel;
  trend: "worsening" | "stable" | "improving";
}

// ============================================================
// Signal detectors (each returns 0-based score + reason)
// ============================================================

interface Signal {
  score: number;
  reason: string;
}

function checkMissedCheckins(
  patient: Patient,
  checkins: CheckIn[]
): Signal | null {
  const patientCheckins = checkins.filter(
    (c) => c.patientId === patient.id
  );

  if (patientCheckins.length === 0) {
    return { score: 15, reason: "No check-ins recorded — patient may be disengaged" };
  }

  const latest = [...patientCheckins].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  const daysSince = Math.floor(
    (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince >= 14) {
    return { score: 20, reason: `No check-in for ${daysSince} days — significant gap` };
  }
  if (daysSince >= 7) {
    return { score: 12, reason: `Last check-in was ${daysSince} days ago` };
  }
  return null;
}

function checkMedicationAdherence(
  analysis: AiAnalysis | undefined
): Signal | null {
  if (!analysis) return null;

  if (analysis.medicationAdherenceRisk === "high") {
    return { score: 20, reason: "Medication non-adherence detected — likely missed doses" };
  }
  if (analysis.medicationAdherenceRisk === "medium") {
    return { score: 10, reason: "Medication adherence concern — possible timing or missed dose" };
  }
  return null;
}

function checkExistingDropoutRisk(
  analysis: AiAnalysis | undefined
): Signal | null {
  if (!analysis) return null;

  if (analysis.dropoutRisk >= 0.8) {
    return {
      score: 25,
      reason: `AI model rates dropout risk at ${Math.round(analysis.dropoutRisk * 100)}% — very high`,
    };
  }
  if (analysis.dropoutRisk >= 0.6) {
    return {
      score: 18,
      reason: `AI model rates dropout risk at ${Math.round(analysis.dropoutRisk * 100)}% — elevated`,
    };
  }
  if (analysis.dropoutRisk >= 0.4) {
    return {
      score: 8,
      reason: `AI dropout risk at ${Math.round(analysis.dropoutRisk * 100)}% — moderate`,
    };
  }
  return null;
}

function checkDistressLanguage(checkins: CheckIn[], patientId: string): Signal | null {
  const patientCheckins = checkins.filter((c) => c.patientId === patientId);
  if (patientCheckins.length === 0) return null;

  const latest = [...patientCheckins].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const text = latest.transcript.toLowerCase();
  const dropoutKeywords = [
    "drop out",
    "leave the trial",
    "quit",
    "stop taking",
    "not worth it",
    "give up",
    "done with this",
  ];

  const matches = dropoutKeywords.filter((kw) => text.includes(kw));
  if (matches.length > 0) {
    return {
      score: 22,
      reason: "Patient expressed intent to discontinue in recent check-in",
    };
  }

  const negativeKeywords = [
    "frustrated",
    "tired of",
    "doesn't work",
    "not helping",
    "worse",
    "can't take it",
    "hate",
  ];
  const negMatches = negativeKeywords.filter((kw) => text.includes(kw));
  if (negMatches.length >= 2) {
    return {
      score: 12,
      reason: "Multiple negative sentiment signals in recent transcript",
    };
  }

  return null;
}

function checkSymptomWorsening(
  checkins: CheckIn[],
  patientId: string
): Signal | null {
  const withAnalysis = checkins
    .filter((c) => c.patientId === patientId && c.analysis)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  if (withAnalysis.length < 2) return null;

  const prev = withAnalysis[withAnalysis.length - 2].analysis!;
  const curr = withAnalysis[withAnalysis.length - 1].analysis!;

  const prevMax = Math.max(...prev.symptoms.map((s) => s.severity), 0);
  const currMax = Math.max(...curr.symptoms.map((s) => s.severity), 0);

  if (currMax > prevMax && currMax >= 6) {
    return {
      score: 12,
      reason: `Symptom severity worsening: ${prevMax}/10 → ${currMax}/10`,
    };
  }
  return null;
}

function checkAlertFrequency(alerts: Alert[], patientId: string): Signal | null {
  const patientAlerts = alerts.filter((a) => a.patientId === patientId);
  if (patientAlerts.length === 0) return null;

  const unacked = patientAlerts.filter((a) => !a.acknowledged);
  const criticalOrHigh = unacked.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  );

  if (criticalOrHigh.length >= 2) {
    return {
      score: 15,
      reason: `${criticalOrHigh.length} unresolved high-severity alerts — risk accumulation`,
    };
  }
  if (unacked.length >= 3) {
    return {
      score: 8,
      reason: `${unacked.length} unresolved alerts pending review`,
    };
  }
  return null;
}

function checkAdverseEvents(analysis: AiAnalysis | undefined): Signal | null {
  if (!analysis?.adverseEvent) return null;
  return {
    score: 10,
    reason: "Adverse event detected — may increase dropout likelihood",
  };
}

// ============================================================
// Trend detection
// ============================================================

function detectTrend(
  checkins: CheckIn[],
  patientId: string
): DropoutPrediction["trend"] {
  const withAnalysis = checkins
    .filter((c) => c.patientId === patientId && c.analysis)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  if (withAnalysis.length < 2) return "stable";

  const risks = withAnalysis.map((c) => c.analysis!.dropoutRisk);
  const last = risks[risks.length - 1];
  const prev = risks[risks.length - 2];

  if (last > prev + 0.1) return "worsening";
  if (last < prev - 0.1) return "improving";
  return "stable";
}

// ============================================================
// Main prediction
// ============================================================

export function predictDropoutRisk(
  patient: Patient,
  checkins: CheckIn[],
  alerts: Alert[],
  analysis: AiAnalysis | undefined
): DropoutPrediction {
  const signals: Signal[] = [];

  const s1 = checkMissedCheckins(patient, checkins);
  if (s1) signals.push(s1);

  const s2 = checkMedicationAdherence(analysis);
  if (s2) signals.push(s2);

  const s3 = checkExistingDropoutRisk(analysis);
  if (s3) signals.push(s3);

  const s4 = checkDistressLanguage(checkins, patient.id);
  if (s4) signals.push(s4);

  const s5 = checkSymptomWorsening(checkins, patient.id);
  if (s5) signals.push(s5);

  const s6 = checkAlertFrequency(alerts, patient.id);
  if (s6) signals.push(s6);

  const s7 = checkAdverseEvents(analysis);
  if (s7) signals.push(s7);

  // Compute total score (cap at 100)
  const rawScore = signals.reduce((sum, s) => sum + s.score, 0);
  const score = Math.min(100, rawScore);

  // Level
  let level: DropoutLevel;
  if (score >= 50) level = "high";
  else if (score >= 25) level = "medium";
  else level = "low";

  // Confidence based on data availability
  const patientCheckins = checkins.filter(
    (c) => c.patientId === patient.id
  );
  let confidence: ConfidenceLevel;
  if (patientCheckins.length >= 3 && analysis) confidence = "high";
  else if (patientCheckins.length >= 1) confidence = "medium";
  else confidence = "low";

  // Reasons (sorted by signal score)
  const reasons = signals
    .sort((a, b) => b.score - a.score)
    .map((s) => s.reason);

  // If no signals, patient is stable
  if (reasons.length === 0) {
    reasons.push("No dropout risk signals detected — patient appears engaged");
  }

  const trend = detectTrend(checkins, patient.id);

  return {
    patientId: patient.id,
    score,
    level,
    reasons,
    confidence,
    trend,
  };
}
