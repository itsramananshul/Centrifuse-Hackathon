import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { aiService } from "@/lib/ai/ai-service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const { transcript } = body;
  if (!transcript || typeof transcript !== "string") {
    return errorResponse("transcript is required and must be a string", 400);
  }

  try {
    const analysis = await aiService.analyzeTranscript(transcript);
    return successResponse(analysis, "Transcript analyzed successfully");
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Analysis failed",
      500
    );
  }
}
