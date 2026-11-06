import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";

/**
 * POST /api/auth/set-phrase
 * Save voice phrase for the currently authenticated user in app_users table.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { phrase } = body;

  if (!phrase || typeof phrase !== "string" || phrase.trim().length < 2) {
    return errorResponse(
      "A voice phrase is required (at least 2 characters)",
      400
    );
  }

  // Upsert into app_users
  const { error } = await supabase.from("app_users").upsert(
    {
      auth_id: user.id,
      email: user.email!,
      voice_phrase: phrase.trim(),
    },
    { onConflict: "email" }
  );

  if (error) return errorResponse(error.message, 500);

  // Also sync to patients table so voice verification can find it
  await supabase
    .from("patients")
    .update({ voice_phrase: phrase.trim() })
    .eq("user_id", user.id);

  return successResponse({ saved: true }, "Voice phrase saved");
}
