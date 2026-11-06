"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { CheckIn, Patient } from "@trialpulse/types";
import { fromExistingPatient, measures, reviewQueue, shortDate, type ReviewCase } from "@/lib/visit-review";

type QueueRow = ReturnType<typeof reviewQueue>[number];

export function HomeReviewQueue({ cases, renderPatient }: {
  cases: ReviewCase[];
  renderPatient: (row: QueueRow) => ReactNode;
}) {
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [limit, setLimit] = useState(5);
  const rows = useMemo(() => reviewQueue(cases), [cases]);
  const flagged = rows.filter((row) => row.reasonCount > 0);
  const visible = onlyFlagged ? flagged : rows;

  return <div className="space-y-2">
    <p className="text-sm text-clinical-muted">Sorted by review reasons, then fewest days with a home check-in.</p>
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={onlyFlagged} onChange={(event) => setOnlyFlagged(event.target.checked)} />
      Show only patients with review reasons ({flagged.length})
    </label>
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {visible.slice(0, limit).map((row) => <li key={row.patient.id} className="min-w-0 rounded-lg border border-clinical-border bg-slate-50 p-3">
        {renderPatient(row)}
        <p className="mt-1 text-xs tabular-nums text-clinical-muted">{row.logged} of 7 days with a home check-in through {shortDate(row.through)}</p>
        {row.reasonCount > 0 ? <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {row.gap && <li>No home check-ins on the last 3 days</li>}
          {row.changes.map(({ metric, before, after }) =>
            <li key={metric}>{measures[metric].label} · {before.positive}/{before.logged} recorded days before {shortDate(row.anchor)} → {after.positive}/{after.logged} from {shortDate(row.anchor)}</li>)}
        </ul> : <p className="mt-2 text-sm text-slate-700">No review reasons found</p>}
      </li>)}
    </ul>
    {!visible.length && <p className="py-2 text-sm text-clinical-muted">{onlyFlagged ? "No patients match these review rules." : "Patients will appear when they are linked to your dashboard."}</p>}
    {visible.length > limit && <button type="button" onClick={() => setLimit((current) => current + 5)} className="btn-secondary min-h-11">Show more patients</button>}
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-sm text-primary-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-primary-400">How patients are sorted</summary>
      <ul className="space-y-1 text-sm text-clinical-muted">
        <li>A gap is three days in a row without a home check-in for someone who has checked in before.</li>
        <li>A reported increase is a rise of at least 25 percentage points between two seven-day periods, with at least three answers in each period. The demo uses the simulated care plan date when available.</li>
        <li>These are reasons to open a record for review. They express reporting and observed changes.</li>
      </ul>
    </details>
  </div>;
}

export function DashboardHomeReviewQueue({ patients, checkIns }: { patients: Patient[]; checkIns: CheckIn[] }) {
  const [open, setOpen] = useState(false);
  const cases = useMemo(() => {
    if (!open) return [];
    const byPatient = new Map<string, CheckIn[]>();
    for (const entry of checkIns) {
      const entries = byPatient.get(entry.patientId);
      if (entries) entries.push(entry);
      else byPatient.set(entry.patientId, [entry]);
    }
    return patients.filter((patient) => patient.status === "active" || patient.status === "flagged")
      .map((patient) => fromExistingPatient(patient, byPatient.get(patient.id) ?? []));
  }, [open, patients, checkIns]);

  return <details className="card" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="flex min-h-11 cursor-pointer items-center rounded-md font-semibold text-slate-900 focus-visible:outline focus-visible:outline-primary-400">Home monitoring review queue</summary>
    {open && <div className="max-h-[min(22rem,40vh)] overflow-auto">
      <HomeReviewQueue cases={cases} renderPatient={({ patient, anchor, changes }) =>
        <Link className="inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-primary-400"
          href={"/patient/" + encodeURIComponent(patient.id) + "/review" + (changes.length ? "?comparison=" + anchor + "#outcome-comparison" : "")}>
          {patient.name} · {patient.condition}
        </Link>
      } />
    </div>}
  </details>;
}
