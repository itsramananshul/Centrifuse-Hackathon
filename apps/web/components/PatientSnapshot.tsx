"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronRight, MessageSquare, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alert, CheckIn, Patient } from "@trialpulse/types";
import { newerCheckInForAlert } from "@/lib/alert-follow-up";
import { api } from "@/lib/api";
import { comparison, fromExistingPatient, hasHomeReport, makeDays, measures, metricText, shiftDay, shortDate, summarize, type Measure } from "@/lib/visit-review";

function axisFor(metric: Measure) {
  return measures[metric].kind === "yes-no" ? "reported" : "number";
}

function AlertEvidence({ alert, knownCheckIn }: { alert: Alert; knownCheckIn?: CheckIn }) {
  const [fetched, setFetched] = useState<CheckIn>();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!alert.checkInId || knownCheckIn?.analysis) return;
    let active = true;
    api.getCheckIn(alert.checkInId).then((entry) => {
      if (active && entry.patientId === alert.patientId) setFetched(entry);
      else if (active) setUnavailable(true);
    }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, [alert.checkInId, alert.patientId, knownCheckIn?.analysis]);

  const source = fetched ?? knownCheckIn;
  return <div className="mt-2 space-y-2 border-t border-current/15 pt-2 text-sm">
    {source?.analysis && <p className="break-words"><strong className="block">AI summary</strong>{source.analysis.summary}</p>}
    {source ? <p className="whitespace-pre-wrap break-words"><strong className="block">Original check-in</strong>{source.transcript}</p>
      : <p role="status">{!alert.checkInId ? "This alert has no linked check-in." : unavailable ? "Could not load the linked check-in." : "Loading the linked check-in…"}</p>}
  </div>;
}

export function PatientSnapshot({ patient, checkIns, simulated, onClose, alerts, selectedAlertId, details }: {
  patient: Patient; checkIns: CheckIn[]; simulated: boolean; onClose?: () => void; alerts: Alert[]; selectedAlertId?: string; details: ReactNode;
}) {
  const record = useMemo(() => fromExistingPatient(patient, checkIns.filter((item) => item.patientId === patient.id)), [patient, checkIns]);
  const [period, setPeriod] = useState(record.lastVisit ? "visit" : "7");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [openEvidenceId, setOpenEvidenceId] = useState<string>();
  const milestone = record.milestones[0];
  const start = period === "visit" ? record.start : shiftDay(record.end, 1 - Number(period));
  const days = makeDays(start, record.end, record.records);
  const latest = [...record.records].sort((a, b) => b.day.localeCompare(a.day) || (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))[0];
  const preferred: Measure[] = /arthritis|psoriasis/i.test(patient.condition) ? ["pain", "activity"] : record.defaults;
  const metrics = [...new Set(preferred)].filter((metric) => days.some((day) => day.values[metric] !== undefined)).slice(0, 2);
  const rows = days.map(({ day, values }) => ({ day: shortDate(day), ...values }));
  const reportedDays = days.filter(hasHomeReport).length;
  const visibleMilestone = milestone && days.some(({ day }) => day === milestone.day) ? milestone : undefined;
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
  const numeric = metrics.find((metric) => axisFor(metric) === "number");
  const hasBinary = metrics.some((metric) => axisFor(metric) === "reported");
  const chartAxis = numeric ? "number" : "reported";
  const openAlerts = alerts.filter((alert) => !alert.acknowledged);
  const alertCount = openAlerts.length;
  const urgentAlert = openAlerts.find((alert) => alert.id === selectedAlertId) ?? openAlerts.filter(({ severity }) =>
    severity === "critical" || severity === "high").sort((left, right) =>
    Number(right.severity === "critical") - Number(left.severity === "critical") || right.createdAt.localeCompare(left.createdAt))[0];
  const alertStyle = openAlerts.some((alert) => alert.severity === "critical") ? "font-semibold text-red-800"
    : openAlerts.some((alert) => alert.severity === "high") ? "font-semibold text-orange-800"
    : alertCount ? "font-medium text-amber-900" : "text-slate-600";
  const hasFollowUp = openAlerts.some((alert) => newerCheckInForAlert(alert, checkIns));

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
    {urgentAlert && <div className={"rounded-xl border px-3 py-2 text-sm " + (urgentAlert.severity === "critical"
      ? "border-red-200 bg-red-50 text-red-900" : "border-orange-200 bg-orange-50 text-orange-900")}>
      <p className="font-semibold">{urgentAlert.severity === "critical" ? "Critical alert open" : "High-priority alert open"}</p>
      <p className="mt-1 break-words">{urgentAlert.message}</p>
      <details key={urgentAlert.id} onToggle={(event) => setOpenEvidenceId(event.currentTarget.open ? urgentAlert.id : undefined)}>
        <summary className="flex min-h-10 cursor-pointer items-center font-semibold underline underline-offset-4">See alert evidence</summary>
        {openEvidenceId === urgentAlert.id && <AlertEvidence alert={urgentAlert} knownCheckIn={checkIns.find(({ id }) => id === urgentAlert.checkInId)} />}
      </details>
    </div>}
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
        <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {metrics.map((metric) => {
            const { logged, positive } = summarize(days, metric);
            const values = days.flatMap(({ values }) => values[metric] === undefined ? [] : [values[metric]]);
            const first = metricText(metric, values[0]);
            const last = metricText(metric, values[values.length - 1]);
            return <li key={metric} className="min-w-0 rounded-lg border border-clinical-border px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: measures[metric].color }} aria-hidden="true" />
                {measures[metric].label}
              </span>
              <span className="mt-1 block font-semibold tabular-nums text-slate-900">
                {axisFor(metric) === "reported" ? "Yes on " + positive + " of " + logged + (logged === 1 ? " answered day" : " answered days")
                  : logged === 1 ? last : first + " → " + last}
              </span>
              {axisFor(metric) === "number" && <span className="text-clinical-muted">{logged === 1 ? "One reading" : "First to latest reading"}</span>}
            </li>;
          })}
        </ul>
        <div className="mt-2 h-[clamp(8rem,15vw,10rem)] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="day" tick={{ fill: "var(--chart-ink)", fontSize: 11 }} tickLine={false} minTickGap={15} />
              {numeric && <YAxis yAxisId="number" width={32} domain={numeric === "pain" ? [0, 10] : ["auto", "auto"]}
                ticks={numeric === "pain" ? [0, 5, 10] : undefined}
                tick={{ fill: measures[numeric].color, fontSize: 10 }} tickFormatter={numeric === "pain" ? (value) => value + "/10" : undefined} />}
              {hasBinary && <YAxis yAxisId="reported" width={27} orientation={numeric ? "right" : "left"} allowDecimals={false}
                domain={[0, 1]} ticks={[0, 1]} tick={{ fill: numeric ? measures.activity.color : "var(--chart-ink)", fontSize: 10 }}
                tickFormatter={(value) => value ? "Yes" : "No"} />}
              {visibleMilestone && <ReferenceLine yAxisId={chartAxis} x={shortDate(visibleMilestone.day)} stroke="var(--chart-ink)" strokeDasharray="4 4" />}
              <Tooltip formatter={(value, name) => [metricText(name as (typeof metrics)[number], Number(value)), measures[name as (typeof metrics)[number]].label]} />
              {metrics.map((metric) => <Line key={metric} yAxisId={axisFor(metric)} dataKey={metric} stroke={measures[metric].color}
                strokeWidth={2} strokeDasharray={metric === "activity" ? "4 3" : undefined} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs tabular-nums text-clinical-muted">{reportedDays} of {days.length} days with a check-in. Gaps mean no recorded value.</p>
        {visibleMilestone && <p className="text-xs text-clinical-muted">Vertical marker: {visibleMilestone.label} · {shortDate(visibleMilestone.day)}</p>}
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
      <summary className={"min-h-10 cursor-pointer rounded-lg py-2 text-sm " + alertStyle}>
        {alertCount ? "Active alerts and patient details (" + alertCount + ")" : "More patient details"}
        {hasFollowUp && <span className="ml-2 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">Newer check-in</span>}
      </summary>
      {detailsOpen && details}
    </details>
  </section>;
}
