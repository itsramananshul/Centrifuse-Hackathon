// ============================================================
// Audit Logging — Lightweight event tracking
// Privacy-focused, no sensitive data in payloads
// ============================================================

export type AuditAction =
  | "dashboard_accessed"
  | "patient_record_viewed"
  | "patient_timeline_opened"
  | "alert_acknowledged"
  | "simulation_generated"
  | "simulation_cleared"
  | "cohort_insights_viewed"
  | "emergency_alert_triggered"
  | "emergency_alert_resolved"
  | "voice_verification_passed"
  | "voice_verification_skipped";

export interface AuditEvent {
  id: string;
  actorId: string;
  actorRole: "clinician" | "patient" | "system";
  action: AuditAction;
  patientId?: string; // Only patient ID, never PII
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

// In-memory store for demo purposes
// In production, this would be a backend table
const auditLog: AuditEvent[] = [];
const MAX_LOG_SIZE = 200;

let eventCounter = 0;

/**
 * Record an audit event.
 * Safe for frontend — no PII stored, only IDs and action types.
 */
export function recordAuditEvent(
  action: AuditAction,
  opts: {
    actorId?: string;
    actorRole?: AuditEvent["actorRole"];
    patientId?: string;
    metadata?: Record<string, string | number | boolean>;
  } = {}
): void {
  const event: AuditEvent = {
    id: `audit-${++eventCounter}`,
    actorId: opts.actorId ?? "current-user",
    actorRole: opts.actorRole ?? "clinician",
    action,
    patientId: opts.patientId,
    timestamp: new Date().toISOString(),
    metadata: opts.metadata,
  };

  auditLog.push(event);

  // Trim to prevent memory growth
  if (auditLog.length > MAX_LOG_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_LOG_SIZE);
  }
}

/**
 * Get recent audit events (newest first).
 */
export function getRecentAuditEvents(limit: number = 20): AuditEvent[] {
  return [...auditLog]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}

/**
 * Get audit event count by type.
 */
export function getAuditSummary(): Record<AuditAction, number> {
  const summary: Record<string, number> = {};
  for (const event of auditLog) {
    summary[event.action] = (summary[event.action] ?? 0) + 1;
  }
  return summary as Record<AuditAction, number>;
}
