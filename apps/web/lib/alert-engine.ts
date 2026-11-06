import type { Patient, CheckIn, AiAnalysis, Alert } from "@trialpulse/types";

// ============================================================
// Types
// ============================================================

export type SmartAlertType =
  | "mismatch"
  | "trend_spike"
  | "engagement_drop"
  | "distress_signal"
  | "adverse_reaction"
  | "dropout_warning"
  | "emergency";

export type SmartAlertSeverity = "high" | "medium" | "low";

export interface SmartAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: SmartAlertType;
  severity: SmartAlertSeverity;
  title: string;
  description: string;
  timestamp: string;
}

// ============================================================
// Distress keywords for voice transcript analysis
// ============================================================

const DISTRESS_KEYWORDS_HIGH = [
  "can't breathe",
  "chest pain",
  "emergency",
  "hospital",
  "stopped taking",
  "quit",
  "drop out",
  "leave the trial",
  "scared",
  "terrified",
];

const DISTRESS_KEYWORDS_MEDIUM = [
  "worse",
  "getting worse",
  "pain",
  "hurting",
  "can't sleep",
  "not working",
  "side effect",
  "rash",
  "swelling",
  "dizzy",
  "nausea",
  "vomit",
  "bleeding",
  "forgot",
  "missed",
  "tired",
  "exhausted",
  "depressed",
  "anxious",
  "worried",
];

// ============================================================
// Detection rules
// ============================================================

function detectMismatch(
  patient: Patient,
  analysis: AiAnalysis | undefined,
  transcript: string
): SmartAlert | null {
  if (!analysis) return null;

  // "feeling fine/good/okay" but high symptom severity
  const positiveWords = /\b(fine|good|great|okay|better|happy|well)\b/i;
  const hasPositive = positiveWords.test(transcript);
  const maxSeverity = Math.max(
    ...analysis.symptoms.map((s) => s.severity),
    0
  );

  if (hasPositive && maxSeverity >= 6) {
    return {
      id: `mismatch-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      type: "mismatch",
      severity: maxSeverity >= 8 ? "high" : "medium",
      title: "Self-report mismatch detected",
      description: `${patient.name} reports feeling well, but symptoms indicate severity ${maxSeverity}/10. Possible under-reporting.`,
      timestamp: new Date().toISOString(),
    };
  }
  return null;
}

function detectTrendSpike(
  patient: Patient,
  patientCheckins: CheckIn[]
): SmartAlert | null {
  // Need at least 2 check-ins with analysis to detect trend
  const withAnalysis = patientCheckins.filter((c) => c.analysis);
  if (withAnalysis.length < 2) return null;

  const sorted = [...withAnalysis].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const prev = sorted[sorted.length - 2].analysis!;
  const curr = sorted[sorted.length - 1].analysis!;

  const prevMax = Math.max(...prev.symptoms.map((s) => s.severity), 0);
  const currMax = Math.max(...curr.symptoms.map((s) => s.severity), 0);
  const spike = currMax - prevMax;

  if (spike >= 3) {
    return {
      id: `trend-spike-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      type: "trend_spike",
      severity: spike >= 5 ? "high" : "medium",
      title: "Symptom spike detected",
      description: `${patient.name}'s peak symptom severity jumped from ${prevMax}/10 to ${currMax}/10 (+${spike}). Investigate worsening condition.`,
      timestamp: sorted[sorted.length - 1].timestamp,
    };
  }
  return null;
}

function detectEngagementDrop(
  patient: Patient,
  patientCheckins: CheckIn[]
): SmartAlert | null {
  if (patientCheckins.length === 0) {
    // No check-ins at all — silent patient
    return {
      id: `engagement-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      type: "engagement_drop",
      severity: "medium",
      title: "No check-ins recorded",
      description: `${patient.name} has not submitted any voice check-ins. May indicate disengagement.`,
      timestamp: new Date().toISOString(),
    };
  }

  // Check if latest check-in is old (>7 days)
  const latest = [...patientCheckins].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const daysSince = Math.floor(
    (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince >= 7) {
    return {
      id: `engagement-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      type: "engagement_drop",
      severity: daysSince >= 14 ? "high" : "low",
      title: "Missed check-ins",
      description: `${patient.name} hasn't checked in for ${daysSince} days. Last check-in: ${new Date(latest.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
      timestamp: latest.timestamp,
    };
  }

  return null;
}

function detectDistressSignals(
  patient: Patient,
  patientCheckins: CheckIn[]
): SmartAlert | null {
  if (patientCheckins.length === 0) return null;

  // Analyze latest transcript
  const latest = [...patientCheckins].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const text = latest.transcript.toLowerCase();

  // Check high-severity keywords first
  const highMatch = DISTRESS_KEYWORDS_HIGH.find((kw) => text.includes(kw));
  if (highMatch) {
    return {
      id: `distress-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      type: "distress_signal",
      severity: "high",
      title: "Distress signal in voice check-in",
      description: `${patient.name}'s latest transcript contains concerning language suggesting acute distress or safety concern.`,
      timestamp: latest.timestamp,
    };
  }

  // Count medium keywords
  const mediumMatches = DISTRESS_KEYWORDS_MEDIUM.filter((kw) =>
    text.includes(kw)
  );
  if (mediumMatches.length >= 3) {
    return {
      id: `distress-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      type: "distress_signal",
      severity: "medium",
      title: "Multiple concern keywords detected",
      description: `${patient.name}'s check-in mentions ${mediumMatches.length} concern indicators. Review transcript for clinical relevance.`,
      timestamp: latest.timestamp,
    };
  }

  return null;
}

function detectAdverseReaction(
  patient: Patient,
  analysis: AiAnalysis | undefined
): SmartAlert | null {
  if (!analysis?.adverseEvent) return null;

  return {
    id: `adverse-${patient.id}`,
    patientId: patient.id,
    patientName: patient.name,
    type: "adverse_reaction",
    severity: "high",
    title: "Adverse event flagged by AI",
    description: `AI analysis detected a potential adverse drug reaction for ${patient.name}. Immediate review recommended.`,
    timestamp: new Date().toISOString(),
  };
}

function detectDropoutWarning(
  patient: Patient,
  analysis: AiAnalysis | undefined
): SmartAlert | null {
  if (!analysis || analysis.dropoutRisk < 0.6) return null;

  return {
    id: `dropout-${patient.id}`,
    patientId: patient.id,
    patientName: patient.name,
    type: "dropout_warning",
    severity: analysis.dropoutRisk >= 0.8 ? "high" : "medium",
    title: "High dropout risk",
    description: `${patient.name} has a ${Math.round(analysis.dropoutRisk * 100)}% dropout risk. Proactive intervention recommended.`,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Severity sorting weight
// ============================================================

const SEVERITY_ORDER: Record<SmartAlertSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// ============================================================
// Main engine
// ============================================================

/**
 * Generates smart alerts from patient data.
 * Returns deduplicated, severity-sorted alerts (max 10).
 */
export function generateSmartAlerts(
  patients: Patient[],
  checkins: CheckIn[],
  alerts: Alert[]
): SmartAlert[] {
  const smartAlerts: SmartAlert[] = [];

  for (const patient of patients) {
    const patientCheckins = checkins.filter(
      (c) => c.patientId === patient.id
    );

    // Get latest analysis
    const withAnalysis = patientCheckins.filter((c) => c.analysis);
    const latestWithAnalysis = [...withAnalysis].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    const analysis = latestWithAnalysis?.analysis;

    // Latest transcript
    const latestCheckin = [...patientCheckins].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    const transcript = latestCheckin?.transcript ?? "";

    // Run all detectors
    const mismatch = detectMismatch(patient, analysis, transcript);
    if (mismatch) smartAlerts.push(mismatch);

    const spike = detectTrendSpike(patient, patientCheckins);
    if (spike) smartAlerts.push(spike);

    const engagement = detectEngagementDrop(patient, patientCheckins);
    if (engagement) smartAlerts.push(engagement);

    const distress = detectDistressSignals(patient, patientCheckins);
    if (distress) smartAlerts.push(distress);

    const adverse = detectAdverseReaction(patient, analysis);
    if (adverse) smartAlerts.push(adverse);

    const dropout = detectDropoutWarning(patient, analysis);
    if (dropout) smartAlerts.push(dropout);
  }

  // Inject emergency alerts from DB (type === "emergency", unacknowledged)
  const emergencyAlerts = alerts.filter(
    (a) => a.type === "emergency" && !a.acknowledged
  );
  for (const ea of emergencyAlerts) {
    const patient = patients.find((p) => p.id === ea.patientId);
    smartAlerts.push({
      id: `emergency-${ea.id}`,
      patientId: ea.patientId,
      patientName: patient?.name ?? "Unknown",
      type: "emergency",
      severity: "high",
      title: "🚨 EMERGENCY: Patient needs immediate attention",
      description: ea.message,
      timestamp: ea.createdAt,
    });
  }

  // Sort by severity (high first), then by timestamp (newest first)
  smartAlerts.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Cap at 10 to avoid noise
  return smartAlerts.slice(0, 10);
}
