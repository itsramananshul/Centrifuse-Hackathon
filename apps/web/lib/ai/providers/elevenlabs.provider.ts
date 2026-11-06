import type { TtsProvider } from "../types";
import { AI_CONFIG } from "@trialpulse/config";

export class ElevenLabsProvider implements TtsProvider {
  private apiKey: string;
  private voiceId: string;

  constructor(apiKey: string, voiceId = AI_CONFIG.elevenLabs.voiceId) {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  async generateSpeech(text: string): Promise<Buffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: AI_CONFIG.elevenLabs.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
