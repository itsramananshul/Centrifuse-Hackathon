import { successResponse } from "@/lib/api-utils";

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || "http://localhost:8123";

export async function GET() {
  let yolo = "unavailable";
  try {
    const res = await fetch(`${YOLO_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) yolo = "ok";
  } catch {
    // YOLO service not running — that's fine, scanner falls back to full image
  }

  return successResponse({
    ai: "active",
    tts: "active",
    yolo,
  });
}
