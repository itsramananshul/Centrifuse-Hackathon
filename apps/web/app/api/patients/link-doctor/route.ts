import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function successResponse(data: unknown, message = "OK") {
  return NextResponse.json({ success: true, message, data });
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * POST /api/patients/link-doctor
 * Links a patient to the current doctor by patient email.
 * The doctor must be authenticated. The patient must exist (by email in app_users).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { patientEmail } = body;

  if (!patientEmail) {
    return errorResponse("patientEmail is required");
  }

  // Find the patient's app_users row by email
  const { data: appUser, error: findError } = await supabase
    .from("app_users")
    .select("auth_id, email, role")
    .eq("email", patientEmail.toLowerCase())
    .maybeSingle();

  if (findError) {
    return errorResponse("Error looking up patient: " + findError.message, 500);
  }

  if (!appUser) {
    return errorResponse(
      "No account found with that email. The patient must sign up first.",
      404
    );
  }

  if (appUser.role !== "patient") {
    return errorResponse("That account is not a patient account.", 400);
  }

  // Find the patient record linked to that user
  const { data: patientRecord, error: patientError } = await supabase
    .from("patients")
    .select("id, name")
    .eq("user_id", appUser.auth_id)
    .maybeSingle();

  if (patientError) {
    return errorResponse("Error finding patient record: " + patientError.message, 500);
  }

  if (!patientRecord) {
    return errorResponse(
      "Patient has no health record yet. They need to complete signup first.",
      404
    );
  }

  return successResponse(
    {
      patientId: patientRecord.id,
      patientName: patientRecord.name,
      patientEmail: appUser.email,
    },
    "Patient linked successfully"
  );
}
