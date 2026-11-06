import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUMMARIZE_PROMPT = `You are a clinical summarization assistant. Given a conversation between a patient and their Care Assistant, produce a concise clinical summary.

FORMAT:
- 2-4 bullet points maximum
- Focus on: symptoms reported, concerns raised, actions taken/suggested
- Use clinical but readable language
- Flag anything that needs doctor attention with [ACTION NEEDED]
- Do NOT include pleasantries or small talk in the summary`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { success: false, message: "Messages array required" },
      { status: 400 }
    );
  }

  // Build conversation text
  const conversationText = messages
    .map(
      (m: { role: string; content: string }) =>
        `${m.role === "user" ? "Patient" : "Assistant"}: ${m.content}`
    )
    .join("\n");

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SUMMARIZE_PROMPT }] },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Summarize this patient-assistant conversation:\n\n${conversationText}`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
          }),
        }
      );
      if (res.ok) {
        const data: any = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return NextResponse.json({
            success: true,
            data: { summary: text.trim(), provider: "gemini" },
          });
        }
      }
    } catch (err) {
      console.error("[Summarize] Gemini error:", err);
    }
  }

  // Fallback — generate basic summary without AI
  const symptomKeywords = [
    "pain",
    "dizzy",
    "nausea",
    "fatigue",
    "tired",
    "headache",
    "rash",
    "swelling",
    "chest",
    "breathing",
  ];
  const patientMessages = messages
    .filter((m: { role: string }) => m.role === "user")
    .map((m: { content: string }) => m.content.toLowerCase());
  const detected = symptomKeywords.filter((kw) =>
    patientMessages.some((msg: string) => msg.includes(kw))
  );

  const fallbackSummary = detected.length > 0
    ? `Patient reported symptoms: ${detected.join(", ")}. ${messages.length} messages exchanged. Review recommended.`
    : `${messages.length} messages exchanged. No specific symptoms detected in conversation.`;

  return NextResponse.json({
    success: true,
    data: { summary: fallbackSummary, provider: "fallback" },
  });
}
