import type {
  Patient,
  CheckIn,
  AiAnalysis,
  Alert,
  Symptom,
} from "@trialpulse/types";

// Maps snake_case Postgres rows to camelCase TypeScript types

export function mapPatient(row: any): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    condition: row.condition,
    trialId: row.trial_id,
    enrolledAt: row.enrolled_at,
    status: row.status,
    latestCheckInId: row.latest_check_in_id ?? undefined,
    voicePhrase: row.voice_phrase ?? undefined,
    doctorId: row.doctor_id ?? undefined,
    userId: row.user_id ?? undefined,
  };
}

export function mapCheckIn(row: any, analysis?: AiAnalysis): CheckIn {
  return {
    id: row.id,
    patientId: row.patient_id,
    timestamp: row.timestamp,
    audioUrl: row.audio_url ?? undefined,
    transcript: row.transcript,
    analysis,
    spokenSummaryUrl: row.spoken_summary_url ?? undefined,
    checkInDate: row.check_in_date ?? undefined,
    painLevel: row.pain_level ?? undefined,
  };
}

export function mapAnalysis(row: any): AiAnalysis {
  const symptoms: Symptom[] =
    typeof row.symptoms === "string"
      ? JSON.parse(row.symptoms)
      : row.symptoms ?? [];

  return {
    summary: row.summary,
    symptoms,
    medicationAdherenceRisk: row.medication_adherence_risk,
    dropoutRisk: row.dropout_risk,
    adverseEvent: row.adverse_event,
    recommendedAction: row.recommended_action,
  };
}

export function mapAlert(row: any): Alert {
  return {
    id: row.id,
    patientId: row.patient_id,
    checkInId: row.check_in_id ?? "",
    type: row.type,
    severity: row.severity,
    message: row.message,
    createdAt: row.created_at,
    acknowledged: row.acknowledged,
  };
}
