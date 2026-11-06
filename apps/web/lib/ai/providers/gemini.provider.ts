import type { AiAnalysis } from "@trialpulse/types";
import type { AiProvider } from "../types";
import { CLINICAL_ANALYSIS_PROMPT } from "../prompts/gemini-analysis.prompt";

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeTranscript(transcript: string): Promise<AiAnalysis> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: CLINICAL_ANALYSIS_PROMPT + transcript }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const result: any = await response.json();
    const text =
      result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No content returned from Gemini API");
    }

    const parsed = JSON.parse(text) as AiAnalysis;
    this.validateAnalysis(parsed);
    return parsed;
  }

  private validateAnalysis(data: AiAnalysis): void {
    if (!data.summary || typeof data.summary !== "string") {
      throw new Error("Invalid analysis: missing summary");
    }
    if (!Array.isArray(data.symptoms)) {
      throw new Error("Invalid analysis: symptoms must be an array");
    }
    if (!["low", "medium", "high"].includes(data.medicationAdherenceRisk)) {
      throw new Error("Invalid analysis: invalid medicationAdherenceRisk");
    }
    if (typeof data.dropoutRisk !== "number" || data.dropoutRisk < 0 || data.dropoutRisk > 1) {
      throw new Error("Invalid analysis: dropoutRisk must be 0-1");
    }
    if (typeof data.adverseEvent !== "boolean") {
      throw new Error("Invalid analysis: adverseEvent must be boolean");
    }
    if (!data.recommendedAction || typeof data.recommendedAction !== "string") {
      throw new Error("Invalid analysis: missing recommendedAction");
    }
  }
}
