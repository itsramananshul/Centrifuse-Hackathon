"use client";

import { useId, useRef } from "react";
import { Bell } from "lucide-react";
import type { SmartAlert } from "@/lib/alert-engine";
import { SmartAlertBar } from "@/components/SmartAlertBar";

export function DashboardNotifications({ alerts, onSelect }: {
  alerts: SmartAlert[];
  onSelect: (patientId: string) => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  return <>
    <button type="button" popoverTarget={id} aria-label={"Notifications" + (alerts.length ? " (" + alerts.length + ")" : "")}
      className="btn-ghost relative grid size-11 shrink-0 place-items-center !p-0">
      <Bell size={18} aria-hidden="true" />
      {alerts.length > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-clinical-danger-action px-0.5 text-[10px] font-semibold text-white" aria-hidden="true">{alerts.length}</span>}
    </button>
    <div id={id} ref={panel} popover="auto" aria-label="Notifications"
      className="workspace-panel fixed inset-auto right-3 top-16 m-0 max-h-[calc(100dvh-5rem)] w-[min(25rem,calc(100%-1.5rem))] overflow-auto shadow-xl sm:right-6">
      <h2 className="mb-2 text-xl tracking-tight">Notifications</h2>
      {alerts.length ? <SmartAlertBar stacked alerts={alerts} onAlertClick={(patientId) => {
        panel.current?.hidePopover();
        onSelect(patientId);
      }} /> : <p className="text-sm text-clinical-muted">No smart alerts to review.</p>}
    </div>
  </>;
}
