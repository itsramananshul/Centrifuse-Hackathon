import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapPatient } from "@/lib/db-mappers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return errorResponse("Patient not found", 404);

  return successResponse(mapPatient(data));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Allow updating specific fields
  if (body.doctorId !== undefined) updates.doctor_id = body.doctorId;
  if (body.status !== undefined) updates.status = body.status;
  if (body.name !== undefined) updates.name = body.name;
  if (body.age !== undefined) updates.age = Number(body.age);
  if (body.condition !== undefined) updates.condition = body.condition;

  if (Object.keys(updates).length === 0) {
    return errorResponse("No valid fields to update", 400);
  }

  const { data, error } = await supabase
    .from("patients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse(mapPatient(data), "Patient updated");
}
