/**
 * ElevenLabs Speech-to-Text provider.
 * Server-side only — never expose API key to client.
 */
export class ElevenLabsSttProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Transcribe audio buffer using ElevenLabs Speech-to-Text API.
   * Accepts WebM, MP3, WAV, etc.
   */
  async transcribe(audioBuffer: Buffer, fileName = "audio.webm"): Promise<string> {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(audioBuffer)]), fileName);
    formData.append("model_id", "scribe_v1");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs STT error (${response.status}): ${errorText}`
      );
    }

    const result: any = await response.json();
    const transcript = result.text;

    if (!transcript || typeof transcript !== "string") {
      throw new Error("No transcript returned from ElevenLabs STT");
    }

    return transcript.trim();
  }
}
