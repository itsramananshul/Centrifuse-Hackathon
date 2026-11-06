import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/api-utils";
import { mapAlert, mapAnalysis, mapCheckIn, mapPatient } from "@/lib/db-mappers";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const params = new URL(request.url).searchParams;
  const role = params.get("role");
  const alertsOnly = params.get("alertsOnly") === "1";
  let roster = supabase.from("patients").select("*");
  if (role === "patient") {
    roster = roster.eq("user_id", user.id);
  } else {
    roster = roster.eq("doctor_id", user.id);
  }
  const { data: patients, error } = await roster.order("created_at", { ascending: true });
  if (error) return errorResponse(error.message, 500);

  const ids = patients.map((patient) => patient.id);
  if (!ids.length) return successResponse(alertsOnly ? [] : { patients: [], checkIns: [], alerts: [] });

  const alertsQuery = supabase.from("alerts").select("*").in("patient_id", ids)
    .eq("acknowledged", false).order("created_at", { ascending: false });
  if (alertsOnly) {
    const { data, error } = await alertsQuery;
    return error ? errorResponse(error.message, 500) : successResponse((data ?? []).map(mapAlert));
  }

  const [checkIns, alerts] = await Promise.all([
    supabase.from("check_ins").select("*, ai_analyses(*)").in("patient_id", ids).order("timestamp", { ascending: true }),
    alertsQuery,
  ]);
  const failure = checkIns.error ?? alerts.error;
  if (failure) return errorResponse(failure.message, 500);

  return successResponse({
    patients: patients.map(mapPatient),
    checkIns: (checkIns.data ?? []).map((entry) => {
      const analysis = Array.isArray(entry.ai_analyses) ? entry.ai_analyses[0] : entry.ai_analyses;
      return mapCheckIn(entry, analysis ? mapAnalysis(analysis) : undefined);
    }),
    alerts: (alerts.data ?? []).map(mapAlert),
  });
}
