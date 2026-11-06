import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapPatient } from "@/lib/db-mappers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  // Role comes from query param (set by frontend based on localStorage)
  const url = new URL(request.url);
  const clientRole = url.searchParams.get("role");

  let query = supabase.from("patients").select("*");

  if (clientRole === "patient") {
    // Patient only sees their own record
    query = query.eq("user_id", user.id);
  } else if (clientRole === "clinician") {
    // Doctor sees only patients assigned to them
    query = query.eq("doctor_id", user.id);
  }
  // Lead doctor (super) sees all patients

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return successResponse((data || []).map(mapPatient));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { name, age, condition, trialId } = body;

  if (!name || !age || !condition || !trialId) {
    return errorResponse(
      "name, age, condition, and trialId are required",
      400
    );
  }

  // Look up role to decide how to link the patient
  const { data: appUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("auth_id", user.id)
    .maybeSingle();

  const isPatientRole = appUser?.role === "patient";

  const { data, error } = await supabase
    .from("patients")
    .insert({
      name,
      age: Number(age),
      condition,
      trial_id: trialId,
      status: "active",
      // Patient creating their own record → link via user_id
      // Clinician creating a patient → no user_id (patient hasn't signed up)
      ...(isPatientRole ? { user_id: user.id } : {}),
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse(mapPatient(data), "Patient created", 201);
}
