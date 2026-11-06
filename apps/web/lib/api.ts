import type { ApiResponse } from "@trialpulse/types";

const API_BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error(json.message || "API request failed");
  }

  return json.data;
}

export const api = {
  // Patients
  getPatients: () => {
    const role = typeof window !== "undefined" ? localStorage.getItem("voxvitals-role") || "" : "";
    return request<import("@trialpulse/types").Patient[]>(`/patients?role=${role}`);
  },
  getPatient: (id: string) =>
    request<import("@trialpulse/types").Patient>(`/patients/${id}`),
  createPatient: (data: {
    name: string;
    age: number;
    condition: string;
    trialId: string;
  }) =>
    request<import("@trialpulse/types").Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Check-ins
  getCheckIns: () => request<import("@trialpulse/types").CheckIn[]>("/checkins"),
  getCheckIn: (id: string) =>
    request<import("@trialpulse/types").CheckIn>(`/checkins/${id}`),
  getPatientCheckIns: (patientId: string) =>
    request<import("@trialpulse/types").CheckIn[]>(
      `/checkins/patient/${patientId}`
    ),
  createCheckIn: (data: {
    patientId: string;
    transcript: string;
    audioUrl?: string;
    checkInDate?: string;
    painLevel?: string;
  }) =>
    request<import("@trialpulse/types").CheckIn>("/checkins", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  analyzeCheckIn: (checkInId: string) =>
    request<{
      analysis: import("@trialpulse/types").AiAnalysis;
      alerts: import("@trialpulse/types").Alert[];
      patientStatusUpdated: string | null;
    }>(`/checkins/${checkInId}/analyze`, { method: "POST" }),

  // AI
  analyzeTranscript: (transcript: string) =>
    request<import("@trialpulse/types").AiAnalysis>("/ai/analyze", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),
  getProviderStatus: () =>
    request<{ ai: string; tts: string }>("/ai/status"),
  summarizeConversation: (messages: { role: string; content: string }[]) =>
    request<{ summary: string; provider: string }>("/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),

  // Alerts
  getAlerts: () => request<import("@trialpulse/types").Alert[]>("/alerts"),
  getUnacknowledgedAlerts: () =>
    request<import("@trialpulse/types").Alert[]>("/alerts/unacknowledged"),
  acknowledgeAlert: (id: string) =>
    request<import("@trialpulse/types").Alert>(`/alerts/${id}/acknowledge`, {
      method: "PATCH",
    }),
  triggerEmergencyAlert: (patientId: string, note?: string) =>
    request<import("@trialpulse/types").Alert>("/emergency-alert", {
      method: "POST",
      body: JSON.stringify({ patientId, note }),
    }),

  // Analytics
  getAnalyticsSummary: () =>
    request<import("@trialpulse/types").AnalyticsSummary>("/analytics/summary"),

  // Medication Scanner
  scanMedication: (image: string, mimeType: string) =>
    request<{
      ocrTexts: string[];
      metadata: {
        drugName: string;
        score: number;
        strength: string;
        quantity: string;
        expiry: string;
        fdaContext: string | null;
      };
      advice: string;
      auditPassed: boolean;
      auditReason: string;
    }>("/medication-scan", {
      method: "POST",
      body: JSON.stringify({ image, mimeType }),
    }),

  // Voice Verification
  verifyVoice: async (
    audioFile: File,
    patientId: string
  ): Promise<import("@trialpulse/types").VoiceVerificationResult> => {
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("patientId", patientId);

    const res = await fetch("/api/voice/verify", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Voice verification failed");
    }
    return json.data;
  },

  // Messages
  getContacts: () =>
    request<{ id: string; name: string; email: string; role: string }[]>("/messages/contacts"),
  getMessages: (withUserId: string) =>
    request<{ id: string; senderId: string; receiverId: string; content: string; isRead: boolean; createdAt: string; isMine: boolean }[]>(
      `/messages?with=${withUserId}`
    ),
  sendMessage: (receiverId: string, content: string) =>
    request<{ id: string; senderId: string; receiverId: string; content: string; createdAt: string; isMine: boolean }>(
      "/messages",
      { method: "POST", body: JSON.stringify({ receiverId, content }) }
    ),
};
