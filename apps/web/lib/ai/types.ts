import type { AiAnalysis } from "@trialpulse/types";

export interface AiProvider {
  analyzeTranscript(transcript: string): Promise<AiAnalysis>;
}

export interface TtsProvider {
  generateSpeech(text: string): Promise<Buffer>;
}

export interface AnalyzeRequest {
  patientId: string;
  checkInId: string;
  transcript: string;
}
