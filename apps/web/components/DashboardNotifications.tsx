"use client";

import { useId, useRef } from "react";
import { ArrowRight, Bell } from "lucide-react";
import type { Alert, Patient } from "@trialpulse/types";

const alertLabels: Record<Alert["type"], string> = {
  emergency: "Emergency",
  adverse_event: "Adverse event",
  high_dropout_risk: "Check-in participation risk",
  medication_nonadherence: "Medication adherence",
  symptom_escalation: "Symptom escalation",
};

export function DashboardNotifications({ alerts, patients, onSelect }: {
  alerts: Alert[];
  patients: Patient[];
  onSelect: (patientId: string, alertId: string) => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const names = new Map(patients.map((patient) => [patient.id, patient.name]));
  const urgent = alerts.filter((alert) => !alert.acknowledged && names.has(alert.patientId) &&
    (alert.severity === "critical" || alert.severity === "high"))
    .sort((left, right) => Number(right.severity === "critical") - Number(left.severity === "critical") ||
      right.createdAt.localeCompare(left.createdAt));
  const hasCritical = urgent.some((alert) => alert.severity === "critical");
  return <>
    <button type="button" popoverTarget={id} aria-label={"Notifications" + (urgent.length ? " (" + urgent.length + " urgent)" : "")}
      className="btn-ghost relative grid size-11 shrink-0 place-items-center !p-0">
      <Bell size={18} aria-hidden="true" />
      {urgent.length > 0 && <span className={"absolute right-1 top-1 grid min-w-4 place-items-center rounded-full px-0.5 text-[10px] font-semibold tabular-nums text-white " +
        (hasCritical ? "bg-red-700" : "bg-orange-800")} aria-hidden="true">{urgent.length}</span>}
    </button>
    <div id={id} ref={panel} popover="auto" aria-label="Notifications"
      className="workspace-panel fixed inset-auto right-3 top-16 m-0 max-h-[calc(100dvh-5rem)] w-[min(25rem,calc(100%-1.5rem))] overflow-auto shadow-xl sm:right-6">
      <h2 className="text-xl tracking-tight">Notifications</h2>
      <p className="mb-3 text-sm text-clinical-muted">{urgent.length
        ? urgent.length + (urgent.length === 1 ? " open high or critical alert" : " open high or critical alerts")
        : "No open high or critical alerts."}</p>
      {!!urgent.length && <ul className="space-y-2">
        {urgent.map((alert) => <li key={alert.id}>
          <button type="button" onClick={() => {
            panel.current?.hidePopover();
            onSelect(alert.patientId, alert.id);
          }} className="flex min-h-11 w-full items-start gap-2 rounded-xl border border-clinical-border p-3 text-left hover:bg-slate-50">
            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + (alert.severity === "critical" ? "bg-red-100 text-red-800" : "bg-orange-50 text-orange-800")}>
                  {alert.severity === "critical" ? "Critical" : "High"}
                </span>
                <span className="break-words text-sm font-semibold">{names.get(alert.patientId)}</span>
              </span>
              <span className="block text-xs font-medium text-slate-700">{alertLabels[alert.type]}</span>
              <span className="block break-words text-xs text-clinical-muted">{alert.message}</span>
            </span>
            <ArrowRight size={16} className="mt-1 shrink-0 text-primary-700" aria-hidden="true" />
          </button>
        </li>)}
      </ul>}
    </div>
  </>;
}
