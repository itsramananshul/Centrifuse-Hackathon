// ============================================================
// HealthGPS Shared Configuration
// ============================================================

export const APP_NAME = "HealthGPS";

export const RISK_THRESHOLDS = {
  dropoutRisk: {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
  },
  severityEscalation: 7,
} as const;

export const ALERT_RULES = {
  adverseEventSeverity: "critical" as const,
  highDropoutRiskThreshold: 0.7,
  medicationNonadherenceSeverity: "high" as const,
  symptomEscalationThreshold: 7,
} as const;

export const AI_CONFIG = {
  gemini: {
    model: "gemini-2.0-flash",
    maxTokens: 2048,
  },
  elevenLabs: {
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
    model: "eleven_monolingual_v1",
  },
} as const;
