import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ElevenLabsSttProvider } from "@/lib/ai/providers/elevenlabs-stt.provider";
import { phraseMatches } from "@/lib/voice-verification";

/**
 * POST /api/auth/voice-login
 *
 * 1. Receive email + audio
 * 2. Look up app_users by email → get stored voice_phrase
 * 3. Transcribe audio via ElevenLabs STT
 * 4. Compare transcript with stored phrase
 * 5. If match → generate magic link to sign user in
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { success: false, message: "Voice login is not configured. Please use email login.", data: null },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Email is required", data: null },
      { status: 400 }
    );
  }

  if (!audioFile || audioFile.size === 0) {
    return NextResponse.json(
      { success: false, message: "Voice recording is required", data: null },
      { status: 400 }
    );
  }

  // Service role client to bypass RLS
  const supabase = createClient(url, serviceKey);

  // Look up voice phrase by email in app_users
  const { data: appUser, error: userError } = await supabase
    .from("app_users")
    .select("voice_phrase, auth_id, email")
    .eq("email", email)
    .maybeSingle();

  if (userError) {
    return NextResponse.json(
      { success: false, message: "Database error", data: null },
      { status: 500 }
    );
  }

  if (!appUser) {
    return NextResponse.json(
      {
        success: false,
        message: "No account found with this email. Please sign up first.",
        data: null,
      },
      { status: 404 }
    );
  }

  if (!appUser.voice_phrase) {
    return NextResponse.json(
      {
        success: false,
        message:
          "No voice phrase set. Please sign in with email and set your phrase first.",
        data: null,
      },
      { status: 400 }
    );
  }

  // Transcribe audio
  if (!elevenLabsKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Voice service unavailable. Please use email login.",
        data: null,
      },
      { status: 503 }
    );
  }

  let transcript: string;
  try {
    const stt = new ElevenLabsSttProvider(elevenLabsKey);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    transcript = await stt.transcribe(
      audioBuffer,
      audioFile.name || "audio.webm"
    );
  } catch (err) {
    console.error("[VoiceLogin] STT error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Could not process recording. Please try again.",
        data: null,
      },
      { status: 500 }
    );
  }

  // Compare phrases
  const { matches } = phraseMatches(transcript, appUser.voice_phrase);

  if (!matches) {
    return NextResponse.json(
      {
        success: false,
        message: "Voice phrase did not match. Please try again.",
        data: { transcript },
      },
      { status: 401 }
    );
  }

  // Phrase matched — generate sign-in link
  try {
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

    if (linkError || !linkData) {
      return NextResponse.json({
        success: true,
        message: "Voice verified but auto-login unavailable. Use email login.",
        data: { verified: true, transcript, token: null },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Voice verified",
      data: {
        verified: true,
        transcript,
        token: linkData.properties?.hashed_token,
        redirectUrl: linkData.properties?.action_link,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      message: "Voice verified",
      data: { verified: true, transcript, token: null },
    });
  }
}
