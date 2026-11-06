import type { AiAnalysis } from "@trialpulse/types";
import type { AiProvider, TtsProvider } from "./types";
import { GeminiProvider } from "./providers/gemini.provider";
import { FeatherlessProvider } from "./providers/featherless.provider";
import { MockAiProvider } from "./providers/mock-ai.provider";
import { ElevenLabsProvider } from "./providers/elevenlabs.provider";
import { MockTtsProvider } from "./providers/mock-tts.provider";

export class AiService {
  private primaryProvider: AiProvider | null;
  private backupProvider: AiProvider | null;
  private mockProvider: AiProvider;
  private ttsProvider: TtsProvider;
  private providerName: string;
  private usingMockTts: boolean;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const featherlessKey = process.env.FEATHERLESS_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    this.mockProvider = new MockAiProvider();
    this.primaryProvider = geminiKey ? new GeminiProvider(geminiKey) : null;
    this.backupProvider = featherlessKey
      ? new FeatherlessProvider(featherlessKey)
      : null;

    this.providerName = geminiKey
      ? "Gemini"
      : featherlessKey
        ? "Featherless"
        : "Mock";

    this.usingMockTts = !elevenLabsKey;
    this.ttsProvider = elevenLabsKey
      ? new ElevenLabsProvider(elevenLabsKey)
      : new MockTtsProvider();

    console.log(
      `[AI] Primary: ${this.primaryProvider ? "Gemini" : "none"} | Backup: ${this.backupProvider ? "Featherless" : "none"} | Fallback: Mock | TTS: ${this.usingMockTts ? "Mock" : "ElevenLabs"}`
    );
  }

  async analyzeTranscript(transcript: string): Promise<AiAnalysis> {
    // Try primary (Gemini)
    if (this.primaryProvider) {
      try {
        const result = await this.primaryProvider.analyzeTranscript(transcript);
        console.log("[AI] Analysis via Gemini — success");
        return result;
      } catch (err) {
        console.warn(
          "[AI] Gemini failed:",
          err instanceof Error ? err.message : err
        );
      }
    }

    // Try backup (Featherless)
    if (this.backupProvider) {
      try {
        const result = await this.backupProvider.analyzeTranscript(transcript);
        console.log("[AI] Analysis via Featherless — success");
        return result;
      } catch (err) {
        console.warn(
          "[AI] Featherless failed:",
          err instanceof Error ? err.message : err
        );
      }
    }

    // Fallback to mock
    console.log("[AI] Using mock provider as fallback");
    return this.mockProvider.analyzeTranscript(transcript);
  }

  async generateSpokenSummary(text: string): Promise<Buffer> {
    return this.ttsProvider.generateSpeech(text);
  }

  isUsingMockAi(): boolean {
    return !this.primaryProvider && !this.backupProvider;
  }

  isUsingMockTts(): boolean {
    return this.usingMockTts;
  }

  getProviderName(): string {
    return this.providerName;
  }
}

// Singleton
export const aiService = new AiService();
