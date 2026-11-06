import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return errorResponse("Server configuration error", 500);
  }

  const supabase = createClient(url, serviceKey);

  // Get all clinician users from app_users
  const { data: clinicians, error } = await supabase
    .from("app_users")
    .select("auth_id, email")
    .eq("role", "clinician");

  if (error) return errorResponse(error.message, 500);

  // Fetch user metadata (full_name) for each clinician
  const doctors = await Promise.all(
    (clinicians || []).map(async (c) => {
      let fullName = c.email.split("@")[0];

      if (c.auth_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(c.auth_id);
        if (userData?.user?.user_metadata?.full_name) {
          fullName = userData.user.user_metadata.full_name;
        }
      }

      return {
        id: c.auth_id || c.email,
        name: fullName,
        email: c.email,
        authId: c.auth_id,
      };
    })
  );

  return NextResponse.json({ success: true, message: "OK", data: doctors });
}
