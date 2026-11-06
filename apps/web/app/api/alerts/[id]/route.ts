import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapAlert } from "@/lib/db-mappers";

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
    .from("alerts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return errorResponse("Alert not found", 404);

  return successResponse(mapAlert(data));
}
