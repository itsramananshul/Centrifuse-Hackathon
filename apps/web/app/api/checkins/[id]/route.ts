import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapCheckIn, mapAnalysis } from "@/lib/db-mappers";

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
    .from("check_ins")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return errorResponse("Check-in not found", 404);

  const { data: analysisRow } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("check_in_id", id)
    .maybeSingle();

  const analysis = analysisRow ? mapAnalysis(analysisRow) : undefined;

  return successResponse(mapCheckIn(data, analysis));
}
