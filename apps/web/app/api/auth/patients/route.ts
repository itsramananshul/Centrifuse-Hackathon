import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public endpoint — returns patient names for voice login dropdown.
 * Uses service role to bypass RLS (no user session on login page).
 * Only returns id and name — no sensitive data.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { success: false, message: "Server config error", data: null },
      { status: 500 }
    );
  }

  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase
    .from("patients")
    .select("id, name")
    .order("name");

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message, data: null },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Success",
    data: data || [],
  });
}
