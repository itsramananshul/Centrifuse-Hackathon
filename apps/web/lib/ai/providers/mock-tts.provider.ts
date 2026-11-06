import type { TtsProvider } from "../types";

export class MockTtsProvider implements TtsProvider {
  async generateSpeech(_text: string): Promise<Buffer> {
    // Return a minimal valid WAV header as mock audio
    await new Promise((resolve) => setTimeout(resolve, 300));

    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // Mono
    header.writeUInt32LE(22050, 24); // Sample rate
    header.writeUInt32LE(22050, 28); // Byte rate
    header.writeUInt16LE(1, 32); // Block align
    header.writeUInt16LE(8, 34); // Bits per sample
    header.write("data", 36);
    header.writeUInt32LE(0, 40);

    return header;
  }
}
