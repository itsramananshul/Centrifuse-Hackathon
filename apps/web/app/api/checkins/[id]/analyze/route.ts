import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapAnalysis, mapAlert } from "@/lib/db-mappers";
import { aiService } from "@/lib/ai/ai-service";
import { ALERT_RULES } from "@trialpulse/config";

/**
 * POST /api/checkins/[id]/analyze
 *
 * Core pipeline endpoint:
 * 1. Fetch the check-in transcript
 * 2. Run AI analysis (Gemini or mock)
 * 3. Save analysis to ai_analyses table
 * 4. Auto-generate alerts if risk detected
 * 5. Update patient status based on risk
 * 6. Return the complete result
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: checkInId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  // 1. Fetch the check-in
  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .select("*")
    .eq("id", checkInId)
    .single();

  if (checkInError || !checkIn) {
    return errorResponse("Check-in not found", 404);
  }

  // Check if analysis already exists
  const { data: existingAnalysis } = await supabase
    .from("ai_analyses")
    .select("id")
    .eq("check_in_id", checkInId)
    .maybeSingle();

  if (existingAnalysis) {
    return errorResponse("Analysis already exists for this check-in", 409);
  }

  // 2. Run AI analysis
  let analysis;
  try {
    analysis = await aiService.analyzeTranscript(checkIn.transcript);
  } catch (err) {
    return errorResponse(
      `AI analysis failed: ${err instanceof Error ? err.message : "unknown error"}`,
      500
    );
  }

  // 3. Save analysis to ai_analyses table
  const { data: savedAnalysis, error: analysisError } = await supabase
    .from("ai_analyses")
    .insert({
      check_in_id: checkInId,
      summary: analysis.summary,
      symptoms: analysis.symptoms,
      medication_adherence_risk: analysis.medicationAdherenceRisk,
      dropout_risk: analysis.dropoutRisk,
      adverse_event: analysis.adverseEvent,
      recommended_action: analysis.recommendedAction,
    })
    .select()
    .single();

  if (analysisError) {
    return errorResponse(`Failed to save analysis: ${analysisError.message}`, 500);
  }

  // 4. Auto-generate alerts based on analysis
  const alertsToCreate: {
    patient_id: string;
    check_in_id: string;
    type: string;
    severity: string;
    message: string;
  }[] = [];

  if (analysis.adverseEvent) {
    alertsToCreate.push({
      patient_id: checkIn.patient_id,
      check_in_id: checkInId,
      type: "adverse_event",
      severity: "critical",
      message: `Adverse event detected: ${analysis.summary.slice(0, 120)}`,
    });
  }

  if (analysis.dropoutRisk >= ALERT_RULES.highDropoutRiskThreshold) {
    alertsToCreate.push({
      patient_id: checkIn.patient_id,
      check_in_id: checkInId,
      type: "high_dropout_risk",
      severity: "high",
      message: `Dropout risk at ${Math.round(analysis.dropoutRisk * 100)}%. ${analysis.recommendedAction.slice(0, 100)}`,
    });
  }

  if (analysis.medicationAdherenceRisk === "high") {
    alertsToCreate.push({
      patient_id: checkIn.patient_id,
      check_in_id: checkInId,
      type: "medication_nonadherence",
      severity: "medium",
      message: `High medication non-adherence risk detected. ${analysis.recommendedAction.slice(0, 100)}`,
    });
  }

  let createdAlerts: any[] = [];
  let warnings: string[] = [];

  if (alertsToCreate.length > 0) {
    const { data: alerts, error: alertError } = await supabase
      .from("alerts")
      .insert(alertsToCreate)
      .select();

    if (alertError) {
      console.error("[Pipeline] Alert creation failed:", alertError.message);
      warnings.push("Alerts could not be created");
    } else {
      createdAlerts = alerts || [];
    }
  }

  // 5. Update patient status based on risk
  let newStatus: string | null = null;
  if (analysis.adverseEvent || analysis.dropoutRisk >= 0.7) {
    newStatus = "flagged";
  }

  if (newStatus) {
    const { error: statusError } = await supabase
      .from("patients")
      .update({ status: newStatus })
      .eq("id", checkIn.patient_id);

    if (statusError) {
      console.error("[Pipeline] Patient status update failed:", statusError.message);
      warnings.push("Patient status could not be updated");
    }
  }

  // 6. Return complete result
  const message = warnings.length > 0
    ? `Analysis complete (warnings: ${warnings.join("; ")})`
    : "Analysis complete";

  return successResponse(
    {
      analysis: mapAnalysis(savedAnalysis),
      alerts: createdAlerts.map(mapAlert),
      patientStatusUpdated: newStatus,
    },
    message
  );
}
