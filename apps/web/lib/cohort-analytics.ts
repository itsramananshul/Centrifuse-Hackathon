import type { Patient, CheckIn, AiAnalysis } from "@trialpulse/types";
import type { RiskScoredPatient } from "@/lib/risk-scoring";

// ============================================================
// Types
// ============================================================

export interface CohortMetrics {
  adherenceRate: number; // 0-100 percentage
  averagePainLevel: number; // 0-10
  averageDropoutRisk: number; // 0-100 percentage
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  engagementStats: {
    totalCheckins: number;
    patientsWithCheckins: number;
    participationRate: number; // 0-100 percentage
    avgCheckinsPerPatient: number;
  };
  topSymptoms: { name: string; count: number; avgSeverity: number }[];
  adverseEventRate: number; // 0-100 percentage
}

// ============================================================
// Analytics functions
// ============================================================

export function getAdherenceRate(rankedPatients: RiskScoredPatient[]): number {
  if (rankedPatients.length === 0) return 0;

  const withAnalysis = rankedPatients.filter((r) => r.analysis);
  if (withAnalysis.length === 0) return 0;

  const adherent = withAnalysis.filter(
    (r) => r.analysis!.medicationAdherenceRisk === "low"
  ).length;

  return Math.round((adherent / withAnalysis.length) * 100);
}

export function getAveragePain(rankedPatients: RiskScoredPatient[]): number {
  const allSeverities: number[] = [];

  for (const r of rankedPatients) {
    if (!r.analysis) continue;
    for (const s of r.analysis.symptoms) {
      allSeverities.push(s.severity);
    }
  }

  if (allSeverities.length === 0) return 0;
  return (
    Math.round(
      (allSeverities.reduce((a, b) => a + b, 0) / allSeverities.length) * 10
    ) / 10
  );
}

export function getRiskDistribution(
  rankedPatients: RiskScoredPatient[]
): CohortMetrics["riskDistribution"] {
  const dist = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of rankedPatients) {
    dist[r.riskTier]++;
  }
  return dist;
}

export function getEngagementStats(
  patients: Patient[],
  checkins: CheckIn[]
): CohortMetrics["engagementStats"] {
  const totalCheckins = checkins.length;
  const patientIds = new Set(checkins.map((c) => c.patientId));
  const patientsWithCheckins = patientIds.size;
  const participationRate =
    patients.length > 0
      ? Math.round((patientsWithCheckins / patients.length) * 100)
      : 0;
  const avgCheckinsPerPatient =
    patients.length > 0
      ? Math.round((totalCheckins / patients.length) * 10) / 10
      : 0;

  return {
    totalCheckins,
    patientsWithCheckins,
    participationRate,
    avgCheckinsPerPatient,
  };
}

export function getTopSymptoms(
  rankedPatients: RiskScoredPatient[]
): CohortMetrics["topSymptoms"] {
  const symptomMap = new Map<
    string,
    { totalSeverity: number; count: number }
  >();

  for (const r of rankedPatients) {
    if (!r.analysis) continue;
    for (const s of r.analysis.symptoms) {
      const existing = symptomMap.get(s.name);
      if (existing) {
        existing.totalSeverity += s.severity;
        existing.count++;
      } else {
        symptomMap.set(s.name, { totalSeverity: s.severity, count: 1 });
      }
    }
  }

  return Array.from(symptomMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgSeverity: Math.round((data.totalSeverity / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.avgSeverity - a.avgSeverity)
    .slice(0, 6);
}

export function getAdverseEventRate(
  rankedPatients: RiskScoredPatient[]
): number {
  if (rankedPatients.length === 0) return 0;
  const withAdverse = rankedPatients.filter(
    (r) => r.analysis?.adverseEvent
  ).length;
  return Math.round((withAdverse / rankedPatients.length) * 100);
}

// ============================================================
// Main aggregator
// ============================================================

export function computeCohortMetrics(
  patients: Patient[],
  checkins: CheckIn[],
  rankedPatients: RiskScoredPatient[]
): CohortMetrics {
  return {
    adherenceRate: getAdherenceRate(rankedPatients),
    averagePainLevel: getAveragePain(rankedPatients),
    averageDropoutRisk:
      rankedPatients.length > 0
        ? Math.round(
            (rankedPatients.reduce(
              (sum, r) => sum + (r.analysis?.dropoutRisk ?? 0),
              0
            ) /
              rankedPatients.length) *
              100
          )
        : 0,
    riskDistribution: getRiskDistribution(rankedPatients),
    engagementStats: getEngagementStats(patients, checkins),
    topSymptoms: getTopSymptoms(rankedPatients),
    adverseEventRate: getAdverseEventRate(rankedPatients),
  };
}
