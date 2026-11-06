import type { Patient, CheckIn, Alert, AiAnalysis, Symptom } from "@trialpulse/types";

// ============================================================
// Types
// ============================================================

export type TimelineEventType =
  | "checkin"
  | "alert"
  | "medication"
  | "adverse_event"
  | "ai_insight";

export type TimelineEventSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "neutral"
  | "positive";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  severity: TimelineEventSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Normalizers
// ============================================================

function normalizeCheckIns(checkins: CheckIn[]): TimelineEvent[] {
  return checkins.map((ci) => {
    const analysis = ci.analysis;
    const maxPain = analysis
      ? Math.max(...analysis.symptoms.map((s) => s.severity), 0)
      : 0;

    let severity: TimelineEventSeverity = "neutral";
    if (maxPain >= 7) severity = "high";
    else if (maxPain >= 4) severity = "medium";
    else if (maxPain > 0) severity = "low";

    const symptoms = analysis?.symptoms ?? [];
    const symptomStr =
      symptoms.length > 0
        ? symptoms
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 3)
            .map((s) => `${s.name} (${s.severity}/10)`)
            .join(", ")
        : "No symptoms reported";

    return {
      id: `checkin-${ci.id}`,
      type: "checkin",
      timestamp: ci.timestamp,
      severity,
      title: "Voice Check-in",
      description: ci.transcript.length > 120
        ? ci.transcript.slice(0, 120) + "…"
        : ci.transcript,
      metadata: {
        fullTranscript: ci.transcript,
        maxPain,
        symptoms: symptomStr,
        hasAudio: !!ci.audioUrl,
        dropoutRisk: analysis?.dropoutRisk,
        adherence: analysis?.medicationAdherenceRisk,
      },
    };
  });
}

function normalizeAlerts(alerts: Alert[]): TimelineEvent[] {
  return alerts.map((alert) => {
    let severity: TimelineEventSeverity;
    switch (alert.severity) {
      case "critical":
        severity = "critical";
        break;
      case "high":
        severity = "high";
        break;
      case "medium":
        severity = "medium";
        break;
      default:
        severity = "low";
    }

    const typeLabel = alert.type.replace(/_/g, " ");

    return {
      id: `alert-${alert.id}`,
      type: "alert",
      timestamp: alert.createdAt,
      severity,
      title: `Alert: ${typeLabel}`,
      description: alert.message,
      metadata: {
        alertType: alert.type,
        acknowledged: alert.acknowledged,
      },
    };
  });
}

function normalizeMedicationEvents(checkins: CheckIn[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const ci of checkins) {
    if (!ci.analysis) continue;

    const risk = ci.analysis.medicationAdherenceRisk;
    if (risk === "low") {
      events.push({
        id: `med-ok-${ci.id}`,
        type: "medication",
        timestamp: ci.timestamp,
        severity: "positive",
        title: "Medication adherent",
        description: "Patient reports taking medication as prescribed.",
        metadata: { adherence: risk },
      });
    } else if (risk === "medium") {
      events.push({
        id: `med-warn-${ci.id}`,
        type: "medication",
        timestamp: ci.timestamp,
        severity: "medium",
        title: "Medication adherence concern",
        description:
          "Possible missed doses or timing issues detected from check-in.",
        metadata: { adherence: risk },
      });
    } else if (risk === "high") {
      events.push({
        id: `med-miss-${ci.id}`,
        type: "medication",
        timestamp: ci.timestamp,
        severity: "high",
        title: "Medication non-adherent",
        description:
          "Patient likely missed doses. Follow up on medication schedule.",
        metadata: { adherence: risk },
      });
    }
  }

  return events;
}

function normalizeAdverseEvents(checkins: CheckIn[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const ci of checkins) {
    if (!ci.analysis?.adverseEvent) continue;

    events.push({
      id: `adverse-${ci.id}`,
      type: "adverse_event",
      timestamp: ci.timestamp,
      severity: "critical",
      title: "Adverse event detected",
      description:
        ci.analysis.summary || "AI detected a potential adverse drug reaction.",
      metadata: {
        recommendedAction: ci.analysis.recommendedAction,
      },
    });
  }

  return events;
}

function normalizeAiInsights(checkins: CheckIn[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const ci of checkins) {
    if (!ci.analysis) continue;

    const risk = ci.analysis.dropoutRisk;
    if (risk >= 0.5) {
      events.push({
        id: `ai-dropout-${ci.id}`,
        type: "ai_insight",
        timestamp: ci.timestamp,
        severity: risk >= 0.7 ? "high" : "medium",
        title: `Dropout risk: ${Math.round(risk * 100)}%`,
        description: ci.analysis.recommendedAction,
        metadata: { dropoutRisk: risk },
      });
    }
  }

  return events;
}

// ============================================================
// Main builder
// ============================================================

/**
 * Builds a unified, sorted timeline from all patient data sources.
 * Newest events first.
 */
export function buildPatientTimeline(
  patient: Patient,
  checkins: CheckIn[],
  alerts: Alert[]
): TimelineEvent[] {
  const patientCheckins = checkins.filter(
    (c) => c.patientId === patient.id
  );
  const patientAlerts = alerts.filter((a) => a.patientId === patient.id);

  const allEvents: TimelineEvent[] = [
    ...normalizeCheckIns(patientCheckins),
    ...normalizeAlerts(patientAlerts),
    ...normalizeMedicationEvents(patientCheckins),
    ...normalizeAdverseEvents(patientCheckins),
    ...normalizeAiInsights(patientCheckins),
  ];

  // Deduplicate by id (some events may overlap)
  const seen = new Set<string>();
  const deduped = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Sort newest first
  return deduped.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ============================================================
// Pain trend helper (for sparkline)
// ============================================================

export interface PainDataPoint {
  date: string;
  maxPain: number;
  dropoutRisk: number;
}

export function getPainTrend(checkins: CheckIn[], patientId: string): PainDataPoint[] {
  return checkins
    .filter((c) => c.patientId === patientId && c.analysis)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((c) => ({
      date: c.timestamp,
      maxPain: Math.max(...c.analysis!.symptoms.map((s) => s.severity), 0),
      dropoutRisk: Math.round(c.analysis!.dropoutRisk * 100),
    }));
}
