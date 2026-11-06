import type {
  Patient,
  CheckIn,
  AiAnalysis,
  Alert,
  AlertSeverity,
} from "@trialpulse/types";

// ============================================================
// Types
// ============================================================

export type RiskTier = "critical" | "high" | "medium" | "low";

export interface InsightChip {
  label: string;
  variant: "critical" | "warning" | "info";
}

export interface RiskScoredPatient {
  patient: Patient;
  analysis: AiAnalysis | undefined;
  alerts: Alert[];
  compositeScore: number; // 0–100, higher = more urgent
  riskTier: RiskTier;
  insightChips: InsightChip[];
}

// ============================================================
// Scoring weights (sum to 100)
// ============================================================

const WEIGHT_SYMPTOM = 20;
const WEIGHT_MED_ADHERENCE = 20;
const WEIGHT_ADVERSE_EVENT = 20;
const WEIGHT_DROPOUT = 25;
const WEIGHT_ALERT_SEVERITY = 10;
const WEIGHT_ALERT_RECENCY = 5;

// ============================================================
// Helpers
// ============================================================

const SEVERITY_SCORE: Record<AlertSeverity, number> = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 1,
};

function getMaxSymptomSeverity(analysis: AiAnalysis | undefined): number {
  if (!analysis || analysis.symptoms.length === 0) return 0;
  return Math.max(...analysis.symptoms.map((s) => s.severity));
}

function getMedAdherenceScore(analysis: AiAnalysis | undefined): number {
  if (!analysis) return 0;
  switch (analysis.medicationAdherenceRisk) {
    case "high":
      return WEIGHT_MED_ADHERENCE;
    case "medium":
      return WEIGHT_MED_ADHERENCE * 0.5;
    case "low":
    default:
      return 0;
  }
}

function getWorstUnackedAlertScore(alerts: Alert[]): number {
  const unacked = alerts.filter((a) => !a.acknowledged);
  if (unacked.length === 0) return 0;
  return Math.max(...unacked.map((a) => SEVERITY_SCORE[a.severity] ?? 0));
}

function getAlertRecencyScore(alerts: Alert[]): number {
  const unacked = alerts.filter((a) => !a.acknowledged);
  if (unacked.length === 0) return 0;

  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  const hasRecent = unacked.some(
    (a) => now - new Date(a.createdAt).getTime() < ONE_HOUR
  );

  return hasRecent ? WEIGHT_ALERT_RECENCY : WEIGHT_ALERT_RECENCY * 0.5;
}

function scoreToTier(score: number): RiskTier {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

// ============================================================
// Insight Chip Generation
// ============================================================

export function generateInsightChips(
  analysis: AiAnalysis | undefined,
  patientAlerts: Alert[]
): InsightChip[] {
  const chips: InsightChip[] = [];
  const MAX_CHIPS = 3;

  // 1. Adverse event
  if (analysis?.adverseEvent) {
    chips.push({ label: "Adverse reaction", variant: "critical" });
  }

  // 2. Medication adherence
  if (analysis?.medicationAdherenceRisk === "high" && chips.length < MAX_CHIPS) {
    chips.push({ label: "Medication non-adherent", variant: "critical" });
  } else if (
    analysis?.medicationAdherenceRisk === "medium" &&
    chips.length < MAX_CHIPS
  ) {
    chips.push({ label: "Medication adherence risk", variant: "warning" });
  }

  // 3. Severe symptoms
  if (analysis && chips.length < MAX_CHIPS) {
    const severe = [...analysis.symptoms]
      .filter((s) => s.severity >= 7)
      .sort((a, b) => b.severity - a.severity);
    if (severe.length > 0) {
      const top = severe[0];
      chips.push({
        label: `${top.name} severe (${top.severity}/10)`,
        variant: "critical",
      });
    }
  }

  // 4. Dropout risk
  if (analysis && chips.length < MAX_CHIPS) {
    if (analysis.dropoutRisk >= 0.7) {
      chips.push({ label: "High dropout risk", variant: "critical" });
    } else if (analysis.dropoutRisk >= 0.4) {
      chips.push({ label: "Dropout risk elevated", variant: "warning" });
    }
  }

  // 5. Unresolved alerts
  if (chips.length < MAX_CHIPS) {
    const unacked = patientAlerts.filter((a) => !a.acknowledged);
    const worst = unacked.sort(
      (a, b) => (SEVERITY_SCORE[b.severity] ?? 0) - (SEVERITY_SCORE[a.severity] ?? 0)
    )[0];
    if (worst) {
      const alertLabel = worst.type.replace(/_/g, " ");
      chips.push({
        label: `Unresolved ${alertLabel}`,
        variant:
          worst.severity === "critical" || worst.severity === "high"
            ? "critical"
            : "warning",
      });
    }
  }

  // 6. If nothing triggered, patient is stable
  if (chips.length === 0) {
    chips.push({ label: "Stable", variant: "info" });
  }

  return chips.slice(0, MAX_CHIPS);
}

// ============================================================
// Core Scoring
// ============================================================

export function computeRiskScore(
  patient: Patient,
  analysis: AiAnalysis | undefined,
  patientAlerts: Alert[]
): RiskScoredPatient {
  const maxSeverity = getMaxSymptomSeverity(analysis);
  const symptomScore = (maxSeverity / 10) * WEIGHT_SYMPTOM;
  const medScore = getMedAdherenceScore(analysis);
  const adverseScore = analysis?.adverseEvent ? WEIGHT_ADVERSE_EVENT : 0;
  const dropoutScore = (analysis?.dropoutRisk ?? 0) * WEIGHT_DROPOUT;
  const alertScore = getWorstUnackedAlertScore(patientAlerts);
  const recencyScore = getAlertRecencyScore(patientAlerts);

  const compositeScore = Math.min(
    100,
    Math.round(
      symptomScore +
        medScore +
        adverseScore +
        dropoutScore +
        alertScore +
        recencyScore
    )
  );

  const riskTier = scoreToTier(compositeScore);
  const insightChips = generateInsightChips(analysis, patientAlerts);

  return {
    patient,
    analysis,
    alerts: patientAlerts,
    compositeScore,
    riskTier,
    insightChips,
  };
}

// ============================================================
// Ranking
// ============================================================

/**
 * Ranks all patients by urgency. Returns the full sorted list
 * (caller can slice top-N).
 */
export function rankPatientsByRisk(
  patients: Patient[],
  checkins: CheckIn[],
  alerts: Alert[]
): RiskScoredPatient[] {
  return patients
    .map((patient) => {
      // Find latest analysis for this patient
      const patientCheckins = checkins
        .filter((c) => c.patientId === patient.id && c.analysis)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      const latestAnalysis = patientCheckins[0]?.analysis;

      // Gather patient alerts
      const patientAlerts = alerts.filter((a) => a.patientId === patient.id);

      return computeRiskScore(patient, latestAnalysis, patientAlerts);
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
