"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { CheckIn } from "@trialpulse/types";
import { api } from "@/lib/api";
import { checkInObservationDate, demoCheckInPrefix } from "@/lib/home-tracker";

const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function PatientCheckInHistory({ patientId, revision }: { patientId: string; revision: number }) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<{ revision: number; entries?: CheckIn[] }>();

  useEffect(() => {
    if (!open) return;
    let current = true;
    api.getPatientCheckIns(patientId).then((checkIns) => {
      if (current) {
        const entries = [...checkIns].sort((a, b) =>
          checkInObservationDate(b).localeCompare(checkInObservationDate(a)) || b.timestamp.localeCompare(a.timestamp)
        );
        setResult({ revision, entries });
      }
    }).catch(() => {
      if (current) setResult({ revision });
    });
    return () => { current = false; };
  }, [open, patientId, revision]);

  const entries = result?.entries;
  return <details className="card" onToggle={(event) => {
    setOpen(event.currentTarget.open);
    if (!event.currentTarget.open) setResult(undefined);
  }}>
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400">
      <CalendarDays size={16} className="text-primary-700" aria-hidden="true" /> Check-in history
    </summary>
    {result?.revision !== revision ? <p className="text-sm text-clinical-muted" role="status">Loading your check-ins…</p> :
      !entries ? <p className="text-sm text-clinical-muted" role="alert">Your check-ins could not be loaded. Close and reopen this section to try again.</p> :
      !entries.length ? <p className="text-sm text-clinical-muted">Your saved check-ins will appear here.</p> :
      <>
        <p className="text-sm text-clinical-muted">Open a date to see what you shared.</p>
        <ul className="mt-2 divide-y divide-clinical-border">
          {entries.slice(0, limit).map((entry) => {
            const day = checkInObservationDate(entry);
            return <li key={entry.id}>
              <details>
                <summary className="min-h-11 cursor-pointer rounded-md py-3 text-sm font-medium text-primary-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400">
                  <time dateTime={day}>{dateLabel.format(new Date(day))}</time>
                  {entry.transcript.startsWith(demoCheckInPrefix) && <span className="practice-badge ml-2">Demo</span>}
                </summary>
                <p className="mb-3 whitespace-pre-wrap break-words text-sm text-slate-700">{entry.transcript}</p>
              </details>
            </li>;
          })}
        </ul>
        {entries.length > limit && <button type="button" className="btn-secondary mt-2 min-h-11" onClick={() => setLimit((current) => current + 10)}>Show older check-ins</button>}
      </>}
  </details>;
}
