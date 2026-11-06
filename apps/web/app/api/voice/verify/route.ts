import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { ElevenLabsSttProvider } from "@/lib/ai/providers/elevenlabs-stt.provider";
import { phraseMatches } from "@/lib/voice-verification";
import type { VoiceVerificationResult } from "@trialpulse/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  // Parse multipart form data (audio file + patientId)
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;
  const patientId = formData.get("patientId") as string | null;

  if (!patientId) {
    return successResponse<VoiceVerificationResult>({
      verified: false,
      transcript: "",
      reason: "no_audio",
    });
  }

  if (!audioFile || audioFile.size === 0) {
    return successResponse<VoiceVerificationResult>({
      verified: false,
      transcript: "",
      reason: "no_audio",
    });
  }

  // Fetch expected phrase from DB
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("voice_phrase")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    return errorResponse("Patient not found", 404);
  }

  if (!patient.voice_phrase) {
    return successResponse<VoiceVerificationResult>({
      verified: false,
      transcript: "",
      reason: "missing_phrase",
    });
  }

  // Transcribe audio via ElevenLabs STT
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    return successResponse<VoiceVerificationResult>({
      verified: false,
      transcript: "",
      reason: "transcription_failed",
    });
  }

  let transcript: string;
  try {
    const sttProvider = new ElevenLabsSttProvider(elevenLabsKey);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    transcript = await sttProvider.transcribe(audioBuffer, audioFile.name);
  } catch (err) {
    console.error("[VoiceVerify] STT failed:", err);
    return successResponse<VoiceVerificationResult>({
      verified: false,
      transcript: "",
      reason: "transcription_failed",
    });
  }

  // Compare transcript with expected phrase
  const { matches } = phraseMatches(transcript, patient.voice_phrase);

  const result: VoiceVerificationResult = {
    verified: matches,
    transcript,
    reason: matches ? "matched" : "phrase_mismatch",
  };

  return successResponse(result, matches ? "Voice verified" : "Phrase mismatch");
}
