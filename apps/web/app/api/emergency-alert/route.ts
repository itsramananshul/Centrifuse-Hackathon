import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapAlert } from "@/lib/db-mappers";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  let body: { patientId?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { patientId, note } = body;
  if (!patientId || typeof patientId !== "string") {
    return errorResponse("patientId is required", 400);
  }

  // Verify patient exists
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, name")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    return errorResponse("Patient not found", 404);
  }

  // Build alert message
  const message = note?.trim()
    ? `Emergency alert triggered by patient: ${note.trim()}`
    : "Emergency alert triggered by patient — immediate attention required.";

  // Insert emergency alert (check_in_id is null — not linked to a check-in)
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      patient_id: patientId,
      type: "emergency",
      severity: "critical",
      message,
      acknowledged: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[Emergency Alert] Insert failed:", error.message);
    return errorResponse("Failed to create emergency alert", 500);
  }

  console.log(
    `[Emergency Alert] Created for patient ${patient.name} (${patientId})`
  );

  return successResponse(mapAlert(data), "Emergency alert created", 201);
}
