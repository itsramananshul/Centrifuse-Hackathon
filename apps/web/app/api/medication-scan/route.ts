import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { scanMedication } from "@/lib/ai/medication-scanner";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image || typeof image !== "string") {
      return errorResponse("image (base64) is required", 400);
    }

    if (!mimeType || typeof mimeType !== "string") {
      return errorResponse("mimeType is required", 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(mimeType)) {
      return errorResponse(`Unsupported image type: ${mimeType}. Use JPEG, PNG, WebP, or HEIC.`, 400);
    }

    const result = await scanMedication(image, mimeType);
    return successResponse(result, "Medication scanned successfully");
  } catch (err) {
    console.error("[MED-SCAN API]", err);
    return errorResponse(
      err instanceof Error ? err.message : "Medication scan failed",
      500
    );
  }
}
