import type { AiAnalysis } from "@trialpulse/types";
import type { AiProvider } from "../types";
import { checkInNarrative, hasUnnegatedMention } from "@/lib/check-in-language";
import { readHomeAnswers } from "@/lib/home-tracker";

export class MockAiProvider implements AiProvider {
  async analyzeTranscript(transcript: string): Promise<AiAnalysis> {
    // Simulate realistic API delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const lower = checkInNarrative(transcript);
    const reports = (...terms: string[]) => terms.some((term) => hasUnnegatedMention(lower, term));
    const pain = Number(transcript.match(/^Pain level: .+ \((\d+)\/10\)\.$/m)?.[1]);

    const symptoms: AiAnalysis["symptoms"] = [];
    if (reports("headache", "head") || readHomeAnswers(transcript).headache === 1)
      symptoms.push({ name: "Headache", severity: 6 });
    if (reports("nausea", "sick"))
      symptoms.push({ name: "Nausea", severity: 4 });
    if (reports("pain", "hurt") || pain > 1)
      symptoms.push({ name: "Pain", severity: pain > 1 && pain <= 10 ? pain : 7 });
    if (reports("rash", "skin"))
      symptoms.push({ name: "Dermatologic reaction", severity: 5 });
    if (reports("chest", "breath"))
      symptoms.push({ name: "Chest discomfort", severity: 8 });
    if (reports("tired", "fatigue"))
      symptoms.push({ name: "Fatigue", severity: 3 });
    if (reports("dizz", "lightheaded"))
      symptoms.push({ name: "Dizziness", severity: 5 });
    if (reports("sleep", "insomnia"))
      symptoms.push({ name: "Sleep disturbance", severity: 4 });

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
    const mentionsAdverse = reports("chest", "breath", "rash", "severe", "worse", "increased");

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

    const symptomsSummary = symptomNames ? `Patient reports ${symptomNames} during check-in.` : "The demo analysis found no matching symptom phrases in this check-in.";
    const summary = `${symptomsSummary} ${riskContext}${adverseContext}`;

    const recommendedAction = mentionsAdverse
      ? "Schedule urgent clinical follow-up within 24 hours to evaluate potential adverse drug reaction. Consider temporary dose adjustment pending physician review."
      : mentionsStop
        ? "Initiate patient retention protocol. Schedule motivational call within 24 hours to address concerns and discuss trial continuation options."
        : mentionsMissed
          ? "Implement medication adherence support — consider reminder system and follow-up call to discuss barriers to compliance."
          : "Review the check-in alongside any open alerts.";

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
