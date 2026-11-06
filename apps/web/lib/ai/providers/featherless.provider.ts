import type { AiAnalysis } from "@trialpulse/types";
import type { AiProvider } from "../types";
import { CLINICAL_ANALYSIS_PROMPT } from "../prompts/gemini-analysis.prompt";

export class FeatherlessProvider implements AiProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeTranscript(transcript: string): Promise<AiAnalysis> {
    const response = await fetch(
      "https://api.featherless.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
          messages: [
            {
              role: "system",
              content: CLINICAL_ANALYSIS_PROMPT,
            },
            {
              role: "user",
              content: transcript,
            },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Featherless API error (${response.status}): ${errorText}`
      );
    }

    const result: any = await response.json();
    const text = result.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("No content returned from Featherless API");
    }

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Featherless response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as AiAnalysis;
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
    if (
      typeof data.dropoutRisk !== "number" ||
      data.dropoutRisk < 0 ||
      data.dropoutRisk > 1
    ) {
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
