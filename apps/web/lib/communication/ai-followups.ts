import type { Patient, CheckIn, Alert, AiAnalysis } from "@trialpulse/types";
import type { RiskScoredPatient } from "@/lib/risk-scoring";
import type { DropoutPrediction } from "@/lib/dropout-risk";

// ============================================================
// Types
// ============================================================

export interface FollowUpSuggestion {
  id: string;
  patientId: string;
  type: "reminder" | "checkin_prompt" | "followup_request" | "urgent_review" | "reassurance";
  priority: "high" | "medium" | "low";
  title: string;
  suggestedMessage: string;
  reason: string;
}

// ============================================================
// Suggestion generators
// ============================================================

export function generateFollowUpSuggestions(
  scored: RiskScoredPatient,
  checkins: CheckIn[],
  alerts: Alert[],
  dropoutPrediction: DropoutPrediction
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const { patient, analysis, riskTier } = scored;

  const patientCheckins = checkins
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestCheckin = patientCheckins[0];
  const daysSinceCheckin = latestCheckin
    ? Math.floor((Date.now() - new Date(latestCheckin.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const unackedAlerts = alerts.filter(
    (a) => a.patientId === patient.id && !a.acknowledged
  );

  // 1. Critical/emergency → urgent outreach
  if (riskTier === "critical" || unackedAlerts.some((a) => a.severity === "critical")) {
    suggestions.push({
      id: `sug-urgent-${patient.id}`,
      patientId: patient.id,
      type: "urgent_review",
      priority: "high",
      title: "Urgent outreach needed",
      suggestedMessage: `Hi ${patient.name}, our monitoring system has flagged some concerning signals. Please respond at your earliest convenience, or call the trial coordinator if you're experiencing any acute symptoms. We're here to help.`,
      reason: `Patient has critical risk level${unackedAlerts.length > 0 ? ` with ${unackedAlerts.length} unresolved alerts` : ""}. Immediate contact recommended.`,
    });
  }

  // 2. Missed check-ins → request check-in
  if (daysSinceCheckin >= 3) {
    suggestions.push({
      id: `sug-checkin-${patient.id}`,
      patientId: patient.id,
      type: "checkin_prompt",
      priority: daysSinceCheckin >= 7 ? "high" : "medium",
      title: "Request voice check-in",
      suggestedMessage: `Hi ${patient.name}, we noticed it's been ${daysSinceCheckin} days since your last check-in. Could you complete a brief voice update when you have a moment? It helps us ensure you're doing well.`,
      reason: `Last check-in was ${daysSinceCheckin} days ago. Regular check-ins are important for monitoring.`,
    });
  }

  // 3. Medication non-adherence → medication reminder
  if (analysis?.medicationAdherenceRisk === "high" || analysis?.medicationAdherenceRisk === "medium") {
    suggestions.push({
      id: `sug-med-${patient.id}`,
      patientId: patient.id,
      type: "reminder",
      priority: analysis.medicationAdherenceRisk === "high" ? "high" : "medium",
      title: "Medication adherence reminder",
      suggestedMessage: `Hi ${patient.name}, we'd like to check in about your medication. Consistent dosing is important for accurate results. Are you having any difficulty with your medication schedule? We can help adjust if needed.`,
      reason: `Medication adherence risk is ${analysis.medicationAdherenceRisk}. Patient may be missing doses.`,
    });
  }

  // 4. High dropout risk → retention outreach
  if (dropoutPrediction.score >= 40 && !suggestions.some((s) => s.type === "urgent_review")) {
    suggestions.push({
      id: `sug-dropout-${patient.id}`,
      patientId: patient.id,
      type: "reassurance",
      priority: dropoutPrediction.score >= 60 ? "high" : "medium",
      title: "Retention support message",
      suggestedMessage: `Hi ${patient.name}, we want to check in on how you're feeling about the trial. Your participation is valuable and we're here to support you. If you have any concerns or questions, please let us know — we can discuss options to make things easier.`,
      reason: `Dropout risk is ${dropoutPrediction.score}% (${dropoutPrediction.level}). Proactive engagement may help retention.`,
    });
  }

  // 5. Side effects / adverse events → symptom follow-up
  if (analysis?.adverseEvent || (analysis && analysis.symptoms.some((s) => s.severity >= 7))) {
    suggestions.push({
      id: `sug-symptom-${patient.id}`,
      patientId: patient.id,
      type: "followup_request",
      priority: analysis.adverseEvent ? "high" : "medium",
      title: "Symptom/side effect follow-up",
      suggestedMessage: `Hi ${patient.name}, we'd like to follow up on the symptoms you reported. How are you feeling today? Have things improved, stayed the same, or gotten worse? Please share any updates so we can adjust your care plan.`,
      reason: analysis.adverseEvent
        ? "Adverse event detected — follow-up on patient condition is critical."
        : `Patient reported symptom severity ≥7/10. Follow-up recommended.`,
    });
  }

  // 6. Stable patient → positive reinforcement (only if nothing urgent)
  if (suggestions.length === 0 && riskTier === "low") {
    suggestions.push({
      id: `sug-positive-${patient.id}`,
      patientId: patient.id,
      type: "reassurance",
      priority: "low",
      title: "Positive reinforcement",
      suggestedMessage: `Hi ${patient.name}, just wanted to let you know you're doing great in the trial. Your consistent participation and adherence are really appreciated. Keep it up!`,
      reason: "Patient is stable with low risk. Positive reinforcement supports continued engagement.",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return suggestions
    .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .slice(0, 4);
}
