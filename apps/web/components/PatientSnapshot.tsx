"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronRight, MessageSquare, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CheckIn, Patient } from "@trialpulse/types";
import { comparison, fromExistingPatient, hasHomeReport, makeDays, measures, metricText, shiftDay, shortDate, summarize } from "@/lib/visit-review";

export function PatientSnapshot({ patient, checkIns, simulated, onClose, alertCount, details }: {
  patient: Patient; checkIns: CheckIn[]; simulated: boolean; onClose?: () => void; alertCount: number; details: ReactNode;
}) {
  const record = useMemo(() => fromExistingPatient(patient, checkIns.filter((item) => item.patientId === patient.id)), [patient, checkIns]);
  const [period, setPeriod] = useState(record.lastVisit ? "visit" : "7");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const milestone = record.milestones[0];
  const start = period === "visit" ? record.start : shiftDay(record.end, 1 - Number(period));
  const days = makeDays(start, record.end, record.records);
  const latest = [...record.records].sort((a, b) => b.day.localeCompare(a.day) || (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))[0];
  const metrics = record.defaults.filter((metric) => days.some((day) => day.values[metric] !== undefined)).slice(0, 2);
  const rows = days.map(({ day, values }) => ({ day: shortDate(day), ...values }));
  const compared = milestone ? comparison(record.records, milestone.day, record.comparisonWidth ?? 5) : null;
  const gaps = compared?.after.filter((day) => !hasHomeReport(day)).length ?? 0;
  const coughBefore = compared && summarize(compared.before, "cough");
  const coughAfter = compared && summarize(compared.after, "cough");
  const limited = compared && summarize(compared.after, "activity").positive > 0;
  const summary = coughBefore?.mean != null && coughAfter?.mean != null && coughAfter.mean < coughBefore.mean
    ? "Less cough." + (limited ? " Activity still limited." : "") : null;
  const review = "/patient/" + encodeURIComponent(patient.id) + "/review";
  const initials = patient.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const demo = record.practiceCase || simulated;
  const includesDemoEntries = days.some(({ entries }) => entries.some((entry) => entry.source === "Fictional check-in"));
  const name = demo ? patient.name.replace(/\s+\(Demo\)$/, "") : patient.name;
  const originalPreview = latest?.detail.split("Home tracker ·")[0]?.trim();
  const narrative = record.practiceCase ? originalPreview?.replace(/^Fictional HealthGPS demo check-in\.\s*/, "") : originalPreview;
  const binary = metrics.every((metric) => measures[metric].kind === "yes-no");

  return <section aria-labelledby="patient-snapshot-heading" className="min-w-0 space-y-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Patient snapshot</p>
      {onClose && <button type="button" aria-label="Close patient snapshot" onClick={onClose} className="btn-ghost grid size-10 place-items-center p-0">
        <X size={18} aria-hidden="true" />
      </button>}
    </div>
    <div className="flex items-center gap-3">
      <span className="initials-badge !size-12 sm:!size-14" aria-hidden="true">{initials}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 id="patient-snapshot-heading" className="break-words text-[clamp(1.35rem,2.15vw,1.85rem)] tracking-tight">{name}</h2>
          {demo && <span className="practice-badge">Demo</span>}
        </div>
        <p className="text-sm text-clinical-muted">{patient.condition}{demo ? " · Fictional practice record" : ""}</p>
      </div>
    </div>
    {summary && <div>
      <h3 className="text-xl tracking-tight">{summary}</h3>
      <p className="mt-0.5 text-sm text-clinical-muted">Based on recorded check-ins.</p>
    </div>}
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xl tracking-tight">Symptom trends</h3>
          <p className="text-xs text-clinical-muted">{demo ? "Illustrative check-ins" : includesDemoEntries ? "Includes fictional demo check-ins" : "Recorded check-ins"}</p>
        </div>
        <label>
          <span className="sr-only">Snapshot period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-10 max-w-full border-b border-clinical-border bg-transparent px-1 text-sm">
            {record.lastVisit && <option value="visit">Since last visit</option>}
            <option value="7">Latest 7 days</option>
            {!record.lastVisit && <option value="14">Latest 14 days</option>}
          </select>
        </label>
      </div>
      {metrics.length ? <>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          {metrics.map((metric) => <li key={metric} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: measures[metric].color }} aria-hidden="true" />{measures[metric].label}
          </li>)}
        </ul>
        <div className="mt-2 h-[clamp(8rem,15vw,10rem)] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="day" tick={{ fill: "var(--chart-ink)", fontSize: 11 }} tickLine={false} minTickGap={15} />
              <YAxis width={26} allowDecimals={false} domain={binary ? [0, 1] : ["auto", "auto"]} ticks={binary ? [0, 1] : undefined}
                tick={{ fill: "var(--chart-ink)", fontSize: 10 }} tickFormatter={binary ? (value) => value ? "Yes" : "No" : undefined} />
              {milestone && days.some(({ day }) => day === milestone.day) && <ReferenceLine x={shortDate(milestone.day)} stroke="var(--chart-ink)" strokeDasharray="4 4" />}
              <Tooltip formatter={(value, name) => [metricText(name as (typeof metrics)[number], Number(value)), measures[name as (typeof metrics)[number]].label]} />
              {metrics.map((metric) => <Line key={metric} dataKey={metric} stroke={measures[metric].color} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </> : <p className="mt-2 rounded-xl border border-clinical-border px-3 py-4 text-sm text-clinical-muted">No symptom measurements in this period.</p>}
    </div>
    {gaps > 0 && <Link href={review + "#reporting-gaps-heading"} className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
      <CalendarDays size={17} aria-hidden="true" /> {gaps} {gaps === 1 ? "day" : "days"} without a check-in
      <ChevronRight size={16} className="ml-auto shrink-0" aria-hidden="true" />
    </Link>}
    <div className="border-t border-clinical-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">Latest check-in{latest ? " · " + shortDate(latest.day) : ""}</p>
      {latest ? <>
        {narrative && <p className="mt-1 line-clamp-2 break-words font-[family-name:var(--display-font)] text-base">{narrative}</p>}
        <details className="mt-1 text-sm">
          <summary className="min-h-8 cursor-pointer text-primary-700 underline underline-offset-4">Read original</summary>
          <p className="whitespace-pre-wrap break-words text-slate-700">{latest.detail}</p>
        </details>
      </> : <p className="mt-1 text-sm text-clinical-muted">No check-ins recorded.</p>}
    </div>
    {!simulated && <div className="space-y-1">
      <Link href={review} className="btn-primary flex min-h-11 items-center justify-center gap-2 text-sm">Open patient review <ArrowRight size={17} aria-hidden="true" /></Link>
      {patient.userId && <Link href={"/messages?with=" + encodeURIComponent(patient.userId)} className="btn-ghost flex min-h-11 items-center justify-center gap-2 text-sm">
        <MessageSquare size={17} aria-hidden="true" /> Message patient
      </Link>}
    </div>}
    <details onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
      <summary className={"min-h-10 cursor-pointer rounded-lg py-2 text-sm " + (alertCount ? "font-medium text-red-700" : "text-slate-600")}>
        {alertCount ? "Active alerts and patient details (" + alertCount + ")" : "More patient details"}
      </summary>
      {detailsOpen && details}
    </details>
  </section>;
}
