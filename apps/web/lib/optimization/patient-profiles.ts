import type { Patient, CheckIn, Alert } from "@trialpulse/types";
import type { RiskScoredPatient } from "@/lib/risk-scoring";
import type { DropoutPrediction } from "@/lib/dropout-risk";

// ============================================================
// Types
// ============================================================

export type PatientProfile =
  | "stable_adherent"
  | "high_risk_engaged"
  | "low_engagement_dropout"
  | "side_effect_burdened"
  | "inconsistent_recoverable"
  | "clinically_escalating";

export const PROFILE_LABELS: Record<PatientProfile, string> = {
  stable_adherent: "Stable Adherent",
  high_risk_engaged: "High Risk, Engaged",
  low_engagement_dropout: "Low Engagement, Dropout-Prone",
  side_effect_burdened: "Side-Effect Burdened",
  inconsistent_recoverable: "Inconsistent but Recoverable",
  clinically_escalating: "Clinically Escalating",
};

export const PROFILE_COLOR: Record<PatientProfile, string> = {
  stable_adherent: "bg-emerald-100 text-emerald-700",
  high_risk_engaged: "bg-amber-100 text-amber-700",
  low_engagement_dropout: "bg-red-100 text-red-700",
  side_effect_burdened: "bg-purple-100 text-purple-700",
  inconsistent_recoverable: "bg-blue-100 text-blue-700",
  clinically_escalating: "bg-red-100 text-red-800",
};

export interface PatientProfileResult {
  patientId: string;
  patientName: string;
  profile: PatientProfile;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  completionLikelihood: number; // 0-100
  recommendedFeatures: string[];
}

// ============================================================
// Feature recommendations by profile
// ============================================================

const FEATURE_RECS: Record<PatientProfile, string[]> = {
  stable_adherent: [
    "Periodic wellness checks",
    "Positive reinforcement messages",
    "Standard monitoring cadence",
  ],
  high_risk_engaged: [
    "Frequent alert monitoring",
    "Direct doctor follow-ups",
    "Timeline trend review",
    "Proactive communication",
  ],
  low_engagement_dropout: [
    "Automated check-in reminders",
    "Weekly direct outreach",
    "Dropout risk monitoring",
    "Simplified check-in flow",
  ],
  side_effect_burdened: [
    "Symptom follow-up prompts",
    "AI summary review",
    "Side-effect trend timeline",
    "Dose adjustment discussion",
  ],
  inconsistent_recoverable: [
    "Medication reminders",
    "Engagement tracking",
    "Motivational communication",
    "Flexible check-in scheduling",
  ],
  clinically_escalating: [
    "Urgent alert monitoring",
    "Emergency communication protocols",
    "Frequent timeline review",
    "Immediate clinical intervention",
  ],
};

// ============================================================
// Profiling logic
// ============================================================

export function profilePatient(
  scored: RiskScoredPatient,
  checkins: CheckIn[],
  alerts: Alert[],
  dropoutPrediction: DropoutPrediction
): PatientProfileResult {
  const { patient, analysis, riskTier, compositeScore } = scored;

  const patientCheckins = checkins.filter((c) => c.patientId === patient.id);
  const patientAlerts = alerts.filter((a) => a.patientId === patient.id);
  const hasAdverse = analysis?.adverseEvent ?? false;
  const adherence = analysis?.medicationAdherenceRisk ?? "low";
  const dropoutRisk = analysis?.dropoutRisk ?? 0;
  const maxSymptom = analysis
    ? Math.max(...analysis.symptoms.map((s) => s.severity), 0)
    : 0;

  const reasons: string[] = [];
  let profile: PatientProfile;
  let completionLikelihood: number;

  // Profile assignment (priority-ordered)
  if (riskTier === "critical" && hasAdverse) {
    profile = "clinically_escalating";
    completionLikelihood = Math.max(10, 30 - compositeScore * 0.3);
    reasons.push("Critical risk tier with adverse event detected");
    reasons.push(`Composite risk score: ${compositeScore}`);
  } else if (dropoutPrediction.score >= 50 && patientCheckins.length <= 1) {
    profile = "low_engagement_dropout";
    completionLikelihood = Math.max(5, 25 - dropoutPrediction.score * 0.2);
    reasons.push(`High dropout risk (${dropoutPrediction.score}%) with minimal engagement`);
    reasons.push(`Only ${patientCheckins.length} check-in(s) recorded`);
  } else if (hasAdverse || maxSymptom >= 7) {
    profile = "side_effect_burdened";
    completionLikelihood = Math.max(20, 55 - maxSymptom * 3);
    reasons.push(hasAdverse ? "Active adverse event" : `High symptom severity (${maxSymptom}/10)`);
    if (adherence === "low") reasons.push("Adherence maintained despite side effects");
  } else if (riskTier === "critical" || riskTier === "high") {
    if (patientCheckins.length >= 2 && adherence !== "high") {
      profile = "high_risk_engaged";
      completionLikelihood = Math.max(25, 50 - dropoutRisk * 30);
      reasons.push(`${riskTier} risk but maintaining engagement (${patientCheckins.length} check-ins)`);
    } else {
      profile = "clinically_escalating";
      completionLikelihood = Math.max(10, 30 - compositeScore * 0.3);
      reasons.push(`${riskTier} risk with limited engagement or non-adherence`);
    }
  } else if (adherence === "medium" || (dropoutPrediction.score >= 25 && dropoutPrediction.score < 50)) {
    profile = "inconsistent_recoverable";
    completionLikelihood = Math.max(40, 65 - dropoutPrediction.score * 0.5);
    reasons.push("Moderate adherence concerns but not yet critical");
    if (dropoutPrediction.trend === "worsening") reasons.push("Trend is worsening — intervention window open");
  } else {
    profile = "stable_adherent";
    completionLikelihood = Math.min(95, 75 + (100 - compositeScore) * 0.2);
    reasons.push("Low risk, consistent engagement, good adherence");
  }

  // Confidence based on data
  let confidence: "low" | "medium" | "high";
  if (patientCheckins.length >= 3 && analysis) confidence = "high";
  else if (patientCheckins.length >= 1) confidence = "medium";
  else confidence = "low";

  return {
    patientId: patient.id,
    patientName: patient.name,
    profile,
    confidence,
    reasons,
    completionLikelihood: Math.round(completionLikelihood),
    recommendedFeatures: FEATURE_RECS[profile],
  };
}

// ============================================================
// Cohort-level profile distribution
// ============================================================

export function getProfileDistribution(
  profiles: PatientProfileResult[]
): Record<PatientProfile, number> {
  const dist: Record<PatientProfile, number> = {
    stable_adherent: 0,
    high_risk_engaged: 0,
    low_engagement_dropout: 0,
    side_effect_burdened: 0,
    inconsistent_recoverable: 0,
    clinically_escalating: 0,
  };
  for (const p of profiles) {
    dist[p.profile]++;
  }
  return dist;
}

// ============================================================
// Intervention effectiveness (heuristic pattern analysis)
// ============================================================

export interface InterventionInsight {
  intervention: string;
  pattern: string;
  effectiveness: "positive" | "neutral" | "negative";
  confidence: "low" | "medium";
}

export function analyzeInterventionPatterns(
  profiles: PatientProfileResult[]
): InterventionInsight[] {
  const insights: InterventionInsight[] = [];

  const stableCount = profiles.filter((p) => p.profile === "stable_adherent").length;
  const totalCount = profiles.length;

  if (stableCount > 0 && totalCount > 0) {
    insights.push({
      intervention: "Regular check-in monitoring",
      pattern: `${stableCount} of ${totalCount} patients maintain stable adherence with standard monitoring`,
      effectiveness: "positive",
      confidence: "medium",
    });
  }

  const sideEffectPatients = profiles.filter((p) => p.profile === "side_effect_burdened");
  if (sideEffectPatients.length > 0) {
    insights.push({
      intervention: "Symptom follow-up prompts",
      pattern: `${sideEffectPatients.length} patients with side-effect burden may benefit from proactive follow-up`,
      effectiveness: "positive",
      confidence: "low",
    });
  }

  const dropoutProne = profiles.filter((p) => p.profile === "low_engagement_dropout");
  if (dropoutProne.length > 0) {
    insights.push({
      intervention: "Automated medication reminders",
      pattern: `${dropoutProne.length} disengaged patients — reminder automation recommended to prevent dropout`,
      effectiveness: "neutral",
      confidence: "low",
    });
  }

  const escalating = profiles.filter((p) => p.profile === "clinically_escalating");
  if (escalating.length > 0) {
    insights.push({
      intervention: "Direct clinical intervention",
      pattern: `${escalating.length} patients require immediate clinician contact — automated tools insufficient`,
      effectiveness: "positive",
      confidence: "medium",
    });
  }

  const inconsistent = profiles.filter((p) => p.profile === "inconsistent_recoverable");
  if (inconsistent.length > 0) {
    insights.push({
      intervention: "Motivational outreach + flexible scheduling",
      pattern: `${inconsistent.length} patients showing inconsistency — early intervention may prevent escalation`,
      effectiveness: "positive",
      confidence: "low",
    });
  }

  return insights;
}
