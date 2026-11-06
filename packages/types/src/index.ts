// ============================================================
// HealthGPS Shared Types
// ============================================================

// --- API Response Envelope ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

// --- Patient ---
export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  trialId: string;
  enrolledAt: string;
  status: PatientStatus;
  latestCheckInId?: string;
  doctorId?: string;
  userId?: string;
}

export type PatientStatus = "active" | "flagged" | "dropped" | "completed";

// --- Check-in ---
export interface CheckIn {
  id: string;
  patientId: string;
  timestamp: string;
  audioUrl?: string;
  transcript: string;
  analysis?: AiAnalysis;
  spokenSummaryUrl?: string;
  checkInDate?: string;
  painLevel?: string;
}

// --- AI Analysis (Normalized Contract) ---
export interface AiAnalysis {
  summary: string;
  symptoms: Symptom[];
  medicationAdherenceRisk: RiskLevel;
  dropoutRisk: number;
  adverseEvent: boolean;
  recommendedAction: string;
}

export interface Symptom {
  name: string;
  severity: number; // 1-10
}

export type RiskLevel = "low" | "medium" | "high";

// --- Alert ---
export interface Alert {
  id: string;
  patientId: string;
  checkInId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

export type AlertType =
  | "adverse_event"
  | "high_dropout_risk"
  | "medication_nonadherence"
  | "symptom_escalation"
  | "emergency";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

// --- Analytics ---
export interface AnalyticsSummary {
  totalPatients: number;
  activePatients: number;
  flaggedPatients: number;
  averageDropoutRisk: number;
  recentAlerts: number;
  symptomTrends: SymptomTrend[];
}

export interface SymptomTrend {
  name: string;
  dataPoints: { date: string; avgSeverity: number }[];
}

// --- Provider Config ---
export interface ProviderConfig {
  apiKey?: string;
  useMock: boolean;
}
