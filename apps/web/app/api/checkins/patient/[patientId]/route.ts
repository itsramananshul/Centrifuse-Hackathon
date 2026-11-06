import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapCheckIn, mapAnalysis } from "@/lib/db-mappers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("patient_id", patientId)
    .order("timestamp", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  const checkInIds = (checkIns || []).map((c) => c.id);
  const { data: analyses } =
    checkInIds.length > 0
      ? await supabase
          .from("ai_analyses")
          .select("*")
          .in("check_in_id", checkInIds)
      : { data: [] };

  const analysisMap = new Map(
    (analyses || []).map((a) => [a.check_in_id, mapAnalysis(a)])
  );

  const result = (checkIns || []).map((c) =>
    mapCheckIn(c, analysisMap.get(c.id))
  );

  return successResponse(result);
}
