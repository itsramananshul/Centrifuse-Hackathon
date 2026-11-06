import type { AiAnalysis } from "@trialpulse/types";
import type { AiProvider } from "../types";

export class MockAiProvider implements AiProvider {
  async analyzeTranscript(transcript: string): Promise<AiAnalysis> {
    // Simulate realistic API delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const lower = transcript.toLowerCase();

    const symptoms: AiAnalysis["symptoms"] = [];
    if (lower.includes("headache") || lower.includes("head"))
      symptoms.push({ name: "Headache", severity: 6 });
    if (lower.includes("nausea") || lower.includes("sick"))
      symptoms.push({ name: "Nausea", severity: 4 });
    if (lower.includes("pain") || lower.includes("hurt"))
      symptoms.push({ name: "Pain", severity: 7 });
    if (lower.includes("rash") || lower.includes("skin"))
      symptoms.push({ name: "Dermatologic reaction", severity: 5 });
    if (lower.includes("chest") || lower.includes("breath"))
      symptoms.push({ name: "Chest discomfort", severity: 8 });
    if (lower.includes("tired") || lower.includes("fatigue"))
      symptoms.push({ name: "Fatigue", severity: 3 });
    if (lower.includes("dizz") || lower.includes("lightheaded"))
      symptoms.push({ name: "Dizziness", severity: 5 });
    if (lower.includes("sleep") || lower.includes("insomnia"))
      symptoms.push({ name: "Sleep disturbance", severity: 4 });

    if (symptoms.length === 0) {
      symptoms.push({ name: "General malaise", severity: 2 });
    }

    const mentionsStop =
      lower.includes("stop") ||
      lower.includes("quit") ||
      lower.includes("drop") ||
      lower.includes("not sure") ||
      lower.includes("want to continue") ||
      lower.includes("give up");
    const mentionsMissed =
      lower.includes("missed") ||
      lower.includes("forgot") ||
      lower.includes("didn't take") ||
      lower.includes("almost didn't") ||
      lower.includes("skipped");
    const mentionsAdverse =
      lower.includes("chest") ||
      lower.includes("breath") ||
      lower.includes("rash") ||
      lower.includes("severe") ||
      lower.includes("worse") ||
      lower.includes("increased");

    const dropoutRisk = mentionsStop ? 0.78 : mentionsMissed ? 0.55 : 0.15;
    const medicationAdherenceRisk: AiAnalysis["medicationAdherenceRisk"] =
      mentionsStop || mentionsMissed ? "high" : "low";

    // Build a clinical-sounding summary
    const symptomNames = symptoms.map((s) => s.name.toLowerCase()).join(", ");
    const riskContext = mentionsStop
      ? "Patient has expressed hesitation about continuing trial participation, indicating elevated dropout risk."
      : mentionsMissed
        ? "Patient reports inconsistent medication adherence, suggesting need for follow-up."
        : "Patient appears to be tolerating the current protocol.";

    const adverseContext = mentionsAdverse
      ? " Potential adverse drug reaction identified — clinical review recommended."
      : "";

    const summary = `Patient reports ${symptomNames} during check-in. ${riskContext}${adverseContext} Continued monitoring advised.`;

    const recommendedAction = mentionsAdverse
      ? "Schedule urgent clinical follow-up within 24 hours to evaluate potential adverse drug reaction. Consider temporary dose adjustment pending physician review."
      : mentionsStop
        ? "Initiate patient retention protocol. Schedule motivational call within 24 hours to address concerns and discuss trial continuation options."
        : mentionsMissed
          ? "Implement medication adherence support — consider reminder system and follow-up call to discuss barriers to compliance."
          : "Continue standard monitoring protocol. No immediate intervention required.";

    return {
      summary,
      symptoms,
      medicationAdherenceRisk,
      dropoutRisk,
      adverseEvent: mentionsAdverse,
      recommendedAction,
    };
  }
}
