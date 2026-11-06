import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api-utils";
import { aiService } from "@/lib/ai/ai-service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { text } = body;
  if (!text || typeof text !== "string") {
    return errorResponse("text is required and must be a string", 400);
  }

  try {
    const audioBuffer = await aiService.generateSpokenSummary(text);
    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Speech generation failed",
      500
    );
  }
}
