import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { mapAlert } from "@/lib/db-mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("acknowledged", false)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);

  return successResponse((data || []).map(mapAlert));
}
