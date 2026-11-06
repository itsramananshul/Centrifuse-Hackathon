import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import type { AnalyticsSummary, SymptomTrend, Symptom } from "@trialpulse/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  // Fetch all data needed for analytics
  const [patientsRes, analysesRes, alertsRes] = await Promise.all([
    supabase.from("patients").select("status"),
    supabase.from("ai_analyses").select("dropout_risk, symptoms, created_at"),
    supabase.from("alerts").select("id"),
  ]);

  const patients = patientsRes.data || [];
  const analyses = analysesRes.data || [];
  const alerts = alertsRes.data || [];

  const totalPatients = patients.length;
  const activePatients = patients.filter((p) => p.status === "active").length;
  const flaggedPatients = patients.filter((p) => p.status === "flagged").length;

  const dropoutRisks = analyses
    .map((a) => a.dropout_risk)
    .filter((r) => r != null);
  const averageDropoutRisk =
    dropoutRisks.length > 0
      ? Math.round(
          (dropoutRisks.reduce((s, r) => s + r, 0) / dropoutRisks.length) * 100
        ) / 100
      : 0;

  // Aggregate symptom trends
  const symptomMap = new Map<
    string,
    { date: string; avgSeverity: number }[]
  >();
  for (const analysis of analyses) {
    const symptoms: Symptom[] =
      typeof analysis.symptoms === "string"
        ? JSON.parse(analysis.symptoms)
        : analysis.symptoms || [];
    for (const s of symptoms) {
      if (!symptomMap.has(s.name)) symptomMap.set(s.name, []);
      symptomMap.get(s.name)!.push({
        date: analysis.created_at,
        avgSeverity: s.severity,
      });
    }
  }

  const symptomTrends: SymptomTrend[] = Array.from(symptomMap.entries()).map(
    ([name, dataPoints]) => ({ name, dataPoints })
  );

  const summary: AnalyticsSummary = {
    totalPatients,
    activePatients,
    flaggedPatients,
    averageDropoutRisk,
    recentAlerts: alerts.length,
    symptomTrends,
  };

  return successResponse(summary);
}
