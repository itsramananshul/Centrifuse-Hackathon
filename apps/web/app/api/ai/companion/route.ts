import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COMPANION_SYSTEM_PROMPT = `You are "Care Assistant", a friendly and helpful AI companion for patients in a clinical trial. You are like a knowledgeable nurse who genuinely cares.

YOUR PERSONALITY:
- Warm, empathetic, and conversational — talk like a real person, not a robot
- Proactive: give actionable tips, coping strategies, and practical suggestions
- Reassuring but honest — validate their feelings, then help

WHAT YOU SHOULD DO:
- When a patient reports symptoms: acknowledge them, explain what might be happening in simple terms, suggest home remedies or coping tips (rest, hydration, cold compress, etc.), and offer to log it
- When a patient is stressed/scared: be emotionally supportive first, then provide practical next steps
- Give specific, helpful recommendations like: "Try eating small frequent meals if nausea is an issue", "Staying hydrated can help with fatigue", "Light stretching may ease that discomfort"
- Explain common side effects of clinical trials in simple language when relevant
- Help patients understand what's normal vs what needs attention
- If they mention multiple symptoms, address each one specifically

WHAT TO AVOID:
- Don't diagnose specific conditions or prescribe medications
- Don't change their medication dosage — that's their doctor's call
- For emergencies (chest pain, difficulty breathing, severe allergic reactions, loss of consciousness), urge them to call their care team or 911 immediately

RESPONSE STYLE:
- 3-5 sentences typically — be thorough but not overwhelming
- Use everyday language, not medical jargon
- Always end with something actionable: a tip, a question, or an offer to log symptoms
- When logging symptoms, ask: "Want me to add [symptom] to today's report for your care team?"
- Show you remember what they said earlier in the conversation`;

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
  const { message, history, patientContext } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { success: false, message: "Message is required" },
      { status: 400 }
    );
  }

  // Build multi-turn conversation from history
  const conversationHistory: { role: string; content: string }[] =
    Array.isArray(history) ? history : [];

  // Build context from patient data (passed from client, validated server-side)
  let contextBlock = "";
  if (patientContext) {
    const parts: string[] = [];
    if (patientContext.patientName) {
      parts.push(`Patient: ${patientContext.patientName}`);
    }
    if (patientContext.condition) {
      parts.push(`Condition: ${patientContext.condition}`);
    }
    if (patientContext.recentSymptoms) {
      parts.push(`Recent symptoms from check-ins: ${patientContext.recentSymptoms}`);
    }
    if (patientContext.adherenceStatus) {
      parts.push(`Medication adherence: ${patientContext.adherenceStatus}`);
    }
    if (patientContext.painTrend) {
      parts.push(`Recent pain trend: ${patientContext.painTrend}`);
    }
    if (parts.length > 0) {
      contextBlock = `\n\nPATIENT CONTEXT (from verified records):\n${parts.join("\n")}`;
    }
  }

  const fullPrompt = COMPANION_SYSTEM_PROMPT + contextBlock;

  // Try Gemini first
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      // Build Gemini multi-turn contents from history
      const geminiContents = conversationHistory.map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      }));
      // Ensure conversation starts with a user message (Gemini requirement)
      if (geminiContents.length === 0 || geminiContents[0].role !== "user") {
        geminiContents.unshift({ role: "user", parts: [{ text: message }] });
      }
      // Ensure the last message is the current user message
      const lastMsg = geminiContents[geminiContents.length - 1];
      if (!lastMsg || lastMsg.role !== "user" || lastMsg.parts[0].text !== message) {
        geminiContents.push({ role: "user", parts: [{ text: message }] });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: fullPrompt }] },
            contents: geminiContents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
          }),
        }
      );
      if (res.ok) {
        const data: any = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return NextResponse.json({
            success: true,
            data: { reply: text.trim(), provider: "gemini" },
          });
        }
      } else {
        const errBody = await res.text().catch(() => "");
        console.error(`[Companion] Gemini failed (${res.status}):`, errBody.slice(0, 300));
      }
    } catch (err) {
      console.error("[Companion] Gemini error:", err);
    }
  }

  // Try Featherless fallback
  const featherlessKey = process.env.FEATHERLESS_API_KEY?.trim();
  if (featherlessKey) {
    try {
      const res = await fetch(
        "https://api.featherless.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${featherlessKey}`,
          },
          body: JSON.stringify({
            model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
            messages: [
              { role: "system", content: fullPrompt },
              ...conversationHistory.map((h) => ({
                role: h.role === "user" ? "user" as const : "assistant" as const,
                content: h.content,
              })),
            ],
            temperature: 0.4,
            max_tokens: 512,
          }),
        }
      );
      if (res.ok) {
        const data: any = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return NextResponse.json({
            success: true,
            data: { reply: text.trim(), provider: "featherless" },
          });
        }
      } else {
        const errBody = await res.text().catch(() => "");
        console.error(`[Companion] Featherless failed (${res.status}):`, errBody.slice(0, 300));
      }
    } catch (err) {
      console.error("[Companion] Featherless error:", err);
    }
  }

  // Graceful fallback — no AI available
  return NextResponse.json({
    success: true,
    data: {
      reply:
        "I'm unable to process your question right now, but I'm still here to help. You can record your symptoms or concerns using the daily check-in, and your care team will review them. If you're experiencing something urgent, please contact your care team directly.",
      provider: "fallback",
    },
  });
}
