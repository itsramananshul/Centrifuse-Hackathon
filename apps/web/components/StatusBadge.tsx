import type { PatientStatus, AlertSeverity, RiskLevel } from "@trialpulse/types";

const statusStyles: Record<PatientStatus, string> = {
  active: "badge-success",
  flagged: "badge-danger",
  dropped: "badge-neutral",
  completed: "badge-success",
};

const severityStyles: Record<AlertSeverity, string> = {
  low: "badge-success",
  medium: "badge-warning",
  high: "badge-danger",
  critical: "badge-critical",
};

const riskStyles: Record<RiskLevel, string> = {
  low: "badge-success",
  medium: "badge-warning",
  high: "badge-danger",
};

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return <span className={statusStyles[status]}>{status}</span>;
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return <span className={severityStyles[severity]}>{severity}</span>;
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={riskStyles[risk]}>{risk}</span>;
}
