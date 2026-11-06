"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowDownUp, ArrowUp, CalendarDays, ChevronRight, CircleDot, ClipboardList, MessageSquare, SlidersHorizontal } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { HomeReviewQueue } from "@/components/HomeReviewQueue";
import { ReviewPatterns } from "@/components/ReviewPatterns";
import { HeadacheMap } from "@/components/HeadacheMap";
import { validDay } from "@/lib/home-tracker";
import { visitFollowUpQuestions } from "@/lib/visit-follow-up";
import {
  comparison, findDifference, hasHomeReport, makeDays, measures, metricText, shiftDay, shortDate, summarize,
  type Measure, type Observation, type ReviewCase, type ReviewDay,
} from "@/lib/visit-review";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400";
const chartDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

function summaryText(metric: Measure, stats: ReturnType<typeof summarize>) {
  if (stats.mean === null) return "No entries";
  return measures[metric].kind === "yes-no" ?
    stats.positive + " of " + stats.logged + " days" :
    metricText(metric, stats.mean) + " avg";
}

function Segment({ value, selected, onClick }: { value: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick}
    className={"min-h-11 rounded-lg px-3 text-sm " + focus + (selected ? " bg-primary-100 text-primary-300" : " text-slate-600 hover:bg-slate-100")}>{value}</button>;
}

function Timeline({ days, metric, onDay, selected, milestone }: {
  days: ReviewDay[]; metric: Measure; onDay: (day: string) => void; selected: string; milestone: string;
}) {
  const measure = measures[metric];
  const data = days.map((row) => ({ date: shortDate(row.day), value: row.values[metric] ?? null }));
  return (
    <section className="card min-w-0">
      <h2 className="section-title">{measure.label} over time</h2>
      <p className="section-subtitle mt-1">{measure.kind === "yes-no" ? "Each recorded day is shown as yes or no." : "Daily reading in " + measure.unit + "."} Select a day to see its entries.</p>
      <div className="mt-3 h-36 min-w-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 9, right: 12, bottom: 2, left: -22 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="date" tick={{ fill: "var(--chart-ink)", fontSize: 10 }} minTickGap={24} tickLine={false} stroke="var(--chart-grid)" />
            <YAxis tick={{ fill: "var(--chart-ink)", fontSize: 10 }} tickLine={false} axisLine={false}
              domain={measure.kind === "yes-no" ? [0, 1] : ["auto", "auto"]}
              ticks={measure.kind === "yes-no" ? [0, 1] : undefined}
              tickFormatter={measure.kind === "yes-no" ? (v) => v ? "Yes" : "No" : undefined} />
            {days.some((row) => row.day === milestone) && <ReferenceLine x={shortDate(milestone)} stroke="var(--chart-ink)" strokeDasharray="4 4" />}
            <Line dataKey="value" stroke={measure.color} strokeWidth={2} connectNulls={false} isAnimationActive={false}
              dot={{ r: 3, fill: measure.color, stroke: "none" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label={measure.label + " daily values"}>
        {days.map(({ day, values }) => {
          const value = values[metric];
          const label = value === undefined ? "No entry" : metricText(metric, value);
          return <li key={day}>
            <button type="button" onClick={() => onDay(day)} aria-pressed={selected === day}
              aria-label={shortDate(day) + ", " + label + (day === milestone ? ", comparison date" : "")}
              className={"min-h-11 min-w-11 rounded-md border px-2 py-1 text-xs " + focus + (selected === day ? " border-primary-400 bg-primary-100" : " border-clinical-border bg-slate-100 hover:border-slate-400")}>
              <span className="block text-slate-600">{shortDate(day)}</span>
              <span className={"block font-semibold tabular-nums " + (value === undefined ? "text-slate-400" : "text-slate-900")}>{value === undefined ? "—" : label}</span>
            </button>
          </li>;
        })}
      </ol>
      <p className="mt-2 text-xs text-clinical-muted">Dash means no entry for this measure.</p>
    </section>
  );
}

function SourceList({ day, synthetic }: { day?: ReviewDay; synthetic: boolean }) {
  return (
    <section className="card min-w-0" aria-labelledby="record-heading">
      <h2 id="record-heading" tabIndex={-1} className={"section-title scroll-mt-6 " + focus}>{day ? shortDate(day.day) + " records" : "Source records"}</h2>
      {day?.entries.length ? <ul className="mt-3 space-y-3">
        {day.entries.map((entry) => <li key={entry.id} className="rounded-lg border border-clinical-border bg-slate-50 p-3">
          <p className="text-xs font-semibold text-primary-300">
            {synthetic && entry.source !== "Simulated spirometer" ? "Simulated home tracker · " : ""}{entry.source}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{entry.detail}</p>
          {entry.headacheLocation && <p className="mt-1 text-xs text-slate-700">Headache location · {entry.headacheLocation}</p>}
          <p className="mt-1 text-xs text-clinical-muted">Observation date <time dateTime={entry.day}>{chartDate.format(new Date(entry.day))}</time></p>
          {entry.recordedAt && <time dateTime={entry.recordedAt} className="mt-1 block text-xs text-clinical-muted">
            Recorded {new Date(entry.recordedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
          </time>}
          {synthetic && entry.recordedAt?.slice(0, 10) && entry.recordedAt.slice(0, 10) > entry.day &&
            <p className="mt-1 text-xs text-amber-700">Reported on a later day</p>}
          <ul className="mt-2 flex flex-wrap gap-2">{Object.entries(entry.values).map(([key, value]) =>
            <li key={key} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{measures[key as Measure].label}: {metricText(key as Measure, value)}</li>)}</ul>
        </li>)}
      </ul> : <p className="mt-3 text-sm text-clinical-muted">{day ? "There are no records for this day." : "Select a day in the timeline."}</p>}
    </section>
  );
}

function AlignedDays({ days, selected, milestone, onDay }: {
  days: ReviewDay[]; selected: Measure[]; milestone: string; onDay: (day: string) => void;
}) {
  return <div className="mt-3 overflow-x-auto">
    <table className="w-full text-left text-sm tabular-nums">
      <thead className="text-clinical-muted"><tr>
        <th scope="col" className="px-2 py-2">Date</th>
        {selected.map((metric) => <th key={metric} scope="col" className="px-2 py-2">{measures[metric].label}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-clinical-border">
        {days.map(({ day, values }) => <tr key={day}>
          <th scope="row" className="px-2 font-normal">
            <button type="button" onClick={() => onDay(day)} aria-label={"Open records for " + shortDate(day)}
              className={"min-h-11 whitespace-nowrap text-primary-300 underline underline-offset-4 " + focus}>
              {shortDate(day)}
            </button>
            {day === milestone && <span className="ml-2 block pb-1 text-xs text-clinical-muted">Comparison date</span>}
          </th>
          {selected.map((metric) => {
            const value = values[metric];
            return <td key={metric} className={"px-2 py-2 " + (value === undefined ? "text-clinical-muted" : "text-slate-900")}>
              {value === undefined ? "No entry" : metricText(metric, value)}
            </td>;
          })}
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function SyntheaChart({ chart }: { chart: NonNullable<ReviewCase["chart"]> }) {
  return <details className="card">
    <summary className={"min-h-11 cursor-pointer font-semibold text-slate-900 " + focus}>Synthea chart history</summary>
    <p className="text-sm text-clinical-muted">Selected FHIR R4 records from one synthetic patient. Maya Chen is the demo name. Home tracker reports, spirometer readings, and the care plan update were simulated separately.</p>
    <p className="mt-2 break-words text-xs text-clinical-muted">{chart.patientReference}</p>
    <ul className="mt-3 divide-y divide-clinical-border">
      {chart.entries.map((entry) => <li key={entry.reference} className="py-2 text-sm text-slate-700">
        <time dateTime={entry.timestamp}>{chartDate.format(new Date(entry.timestamp))}</time> · {entry.label}
        <span className="block break-words text-xs text-clinical-muted">{entry.reference}</span>
      </li>)}
    </ul>
    <a href="https://synthetichealth.github.io/downloads.html" className={"inline-flex min-h-11 items-center text-sm text-primary-300 underline underline-offset-4 " + focus}>Synthea FHIR R4 sample source</a>
  </details>;
}

function ReportingGaps({ days, onDay }: { days: ReviewDay[]; onDay: (day: string) => void }) {
  const gaps = days.filter((day) => !hasHomeReport(day));
  if (!days.length) return null;
  return <section className="workspace-panel" aria-labelledby="reporting-gaps-heading">
    <h2 id="reporting-gaps-heading" className="section-title">Reporting gaps</h2>
    <p className="mt-1 text-sm text-slate-700"><strong className="text-slate-900">{gaps.length} of {days.length} days</strong> have no home check-in.</p>
    <p className="mt-1 text-xs text-clinical-muted">{shortDate(days[0].day)}–{shortDate(days.at(-1)!.day)}{gaps.length > 0 && " · Symptoms on those days are unknown."}</p>
    {gaps.length > 0 && <details>
      <summary className={"min-h-11 cursor-pointer py-3 text-sm font-medium text-primary-300 " + focus}>Show dates with no home check-in</summary>
      <ul className="flex max-h-44 flex-wrap gap-2 overflow-auto">
        {gaps.map(({ day, entries }) => <li key={day}>
          <button type="button" onClick={() => onDay(day)} className={"min-h-11 rounded-lg border border-clinical-border bg-slate-50 px-2 text-xs text-slate-700 " + focus}>
            {shortDate(day)} · {entries.length ? "Device only" : "No records"}
          </button>
        </li>)}
      </ul>
    </details>}
  </section>;
}

export function VisitReview({ cases, comparisonDate }: { cases: ReviewCase[]; comparisonDate?: string | null }) {
  const [id, setId] = useState(cases[0].id);
  const [demoUpdates, setDemoUpdates] = useState<Record<string, Observation[]>>({});
  const patient = cases.find((entry) => entry.id === id) ?? cases[0];
  const compare = comparisonDate && /^\d{4}-\d{2}-\d{2}$/.test(comparisonDate) &&
    Number.isFinite(Date.parse(comparisonDate)) && comparisonDate <= patient.end ? comparisonDate : undefined;
  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary-300">HealthGPS · Clinician workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{patient.lastVisit ? "Since last visit" : "Home monitoring review"}</h1>
          <p className="mt-1 text-sm text-clinical-muted">Home records, trends, and follow-up in one place.</p>
        </div>
        {(patient.synthetic || patient.practiceCase) && <span className="badge-neutral">{patient.practiceCase ? "Fictional practice record" : "Synthetic demo data"}</span>}
      </header>
      {cases.length > 1 && <section aria-labelledby="demo-queue-heading" className="card">
        <h2 id="demo-queue-heading" className="section-title">Demo review queue</h2>
        <HomeReviewQueue cases={cases.map((item) => ({ ...item, records: [...item.records, ...(demoUpdates[item.id] ?? [])] }))}
          renderPatient={({ patient: item }) => <Segment selected={item.id === id} value={item.name + " · " + item.condition} onClick={() => setId(item.id)} />} />
      </section>}
      <ReviewWorkspace key={patient.id} patient={patient} comparisonDate={compare}
        extra={demoUpdates[patient.id] ?? []}
        onDemoSave={(entry) => setDemoUpdates((previous) => ({ ...previous, [patient.id]: [...(previous[patient.id] ?? []), entry] }))} />
    </div>
  );
}

function ReviewWorkspace({ patient, extra, onDemoSave, comparisonDate }: {
  patient: ReviewCase; extra: Observation[]; onDemoSave: (entry: Observation) => void; comparisonDate?: string;
}) {
  const [selected, setSelected] = useState<Measure[]>(patient.defaults);
  const [active, setActive] = useState<Measure>(patient.defaults[0]);
  const [end, setEnd] = useState(patient.end);
  const [lastVisit, setLastVisit] = useState(patient.lastVisit ?? "");
  const [range, setRange] = useState(patient.lastVisit ? 0 : 14);
  const [anchor, setAnchor] = useState(comparisonDate ?? patient.milestones[0]?.day ?? "");
  const [compareWidth, setCompareWidth] = useState(patient.comparisonWidth ?? 7);
  const [selectedDay, setSelectedDay] = useState(patient.milestones[0]?.day ?? patient.end);
  const [investigationDay, setInvestigationDay] = useState<string>();
  const [mode, setMode] = useState("Glance");
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<{ metric?: Measure; compare: boolean }>();
  const [questionCopyStatus, setQuestionCopyStatus] = useState("");
  const [review, setReview] = useState<{ ids: string[]; date?: string } | null>(() => {
    const milestone = patient.milestones[0];
    if (!patient.synthetic || !milestone) return null;
    const date = shiftDay(milestone.day, -1);
    return {
      date,
      ids: patient.records.filter((entry) => (entry.recordedAt?.slice(0, 10) ?? entry.day) <= date).map((entry) => entry.id),
    };
  });
  const [ready, setReady] = useState(false);
  const evidence = useRef<HTMLDetailsElement>(null);
  const storageKey = "healthgps-review-v1:" + patient.id;

  useEffect(() => {
    if (comparisonDate && window.location.hash === "#outcome-comparison") {
      document.getElementById("outcome-comparison")?.scrollIntoView();
    }
  }, [comparisonDate]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (Array.isArray(saved.measures)) {
        const valid = [...new Set<Measure>(saved.measures.filter((metric: Measure) => patient.measures.includes(metric)))];
        if (valid.length) { setSelected(valid); setActive(valid[0]); }
      }
      if (Array.isArray(saved.reviewed)) setReview({
        ids: saved.reviewed.filter((value: unknown) => typeof value === "string"),
        date: typeof saved.reviewedAt === "string" ? validDay(saved.reviewedAt) : undefined,
      });
      const date = typeof saved.lastVisit === "string" ? validDay(saved.lastVisit) : undefined;
      if (!patient.synthetic && !patient.practiceCase && date && date <= patient.end && date >= shiftDay(patient.end, -365)) {
        setLastVisit(date);
        setRange(0);
      }
    } catch { /* The review works without local preferences. */ }
    setReady(true);
  }, [storageKey, patient.measures, patient.synthetic, patient.practiceCase, patient.end]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ measures: selected, reviewed: review?.ids ?? null, reviewedAt: review?.date, lastVisit })); } catch { /* Optional local preferences. */ }
  }, [ready, storageKey, selected, review, lastVisit]);

  const records = [...patient.records, ...extra];
  const windowStart = range === 0 && lastVisit ? lastVisit : shiftDay(end, 1 - (range || 14));
  const fixedDates = patient.synthetic || patient.practiceCase;
  const start = fixedDates && windowStart < patient.start ? patient.start : windowStart;
  const days = makeDays(start, end, records);
  const width = anchor && anchor <= end
    ? Math.min(compareWidth, Math.round((Date.parse(end) - Date.parse(anchor)) / 86_400_000) + 1,
      fixedDates ? Math.round((Date.parse(anchor) - Date.parse(patient.start)) / 86_400_000) : compareWidth)
    : 0;
  const periods = width > 0 ? comparison(records, anchor, width) : null;
  const sourceDay = investigationDay ? makeDays(investigationDay, investigationDay, records)[0]
    : days.find((row) => row.day === selectedDay) ?? days.at(-1);
  const difference = periods ? findDifference(periods, selected) : null;
  const reviewedIds = review ? new Set(review.ids) : null;
  const newEntries = reviewedIds ? records.filter((entry) => !reviewedIds.has(entry.id)) : null;
  const loggedDays = days.filter((day) => day.entries.length > 0).length;
  const demoEntries = days.reduce((total, day) => total + day.entries.filter((entry) => entry.source === "Fictional check-in").length, 0);
  const homeDays = days.filter(hasHomeReport).length;
  const latestHome = days.findLast(hasHomeReport);
  const reportingDays = (periods?.after ?? days).filter(({ day }) => fixedDates || day < patient.end);
  const selectMeasure = (metric: Measure) => {
    if (selected.includes(metric)) {
      if (selected.length === 1) return;
      const next = selected.filter((value) => value !== metric);
      setSelected(next);
      if (active === metric) setActive(next[0]);
    } else {
      setSelected([...selected, metric]);
    }
  };

  function moveMeasure(index: number, direction: -1 | 1) {
    const next = [...selected];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setSelected(next);
  }

  function openSource(day: string) {
    setInvestigationDay(day);
    requestAnimationFrame(() => document.getElementById("record-heading")?.focus());
  }

  function openDemoFollowUp() {
    const followUp = document.querySelector<HTMLDetailsElement>("#demo-follow-up");
    if (followUp) followUp.open = true;
  }

  async function copyFollowUpQuestions() {
    try {
      await navigator.clipboard.writeText(visitFollowUpQuestions.map(({ text }) => text).join("\n"));
      setQuestionCopyStatus("Questions copied.");
    } catch {
      setQuestionCopyStatus("Clipboard unavailable. You can select the questions and copy them.");
    }
  }

  function ask(event: FormEvent) {
    event.preventDefault();
    const terms = draft.trim().toLowerCase();
    const aliases: Record<Measure, RegExp> = {
      cough: /cough/, activity: /activity|exercise/, lung: /lung|spirom|fev|breath/,
      medication: /medic|dose/, headache: /headache/, school: /school|absence/,
      pain: /pain/, checkin: /check.in|logged|entries/,
    };
    const metric = patient.measures.find((key) => aliases[key].test(terms));
    setAnswer({ metric, compare: /before|after|treatment|care plan|chang/.test(terms) });
    if (metric) {
      if (!selected.includes(metric)) setSelected([...selected, metric]);
      setActive(metric);
    }
  }

  const answerStats = answer?.metric ? summarize(days, answer.metric) : null;
  const showComparison = mode === "Explore" || (mode === "Glance" && (patient.synthetic || Boolean(anchor)));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-clinical-border py-3">
        <div>
          <h2 className="font-semibold text-slate-900">{patient.name}</h2>
          <p className="text-sm text-clinical-muted">{patient.condition} · Age {patient.age}{lastVisit ? " · Last visit " + chartDate.format(new Date(lastVisit)) : " · Recent check-ins"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1" aria-label="Review mode">
          {["Glance", "Explore", "Discuss"].map((value) => <Segment key={value} value={value} selected={mode === value} onClick={() => setMode(value)} />)}
        </div>
      </div>

      {mode === "Glance" && <aside className="card flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-title">Visit brief</h2>
          <p className="mt-1 text-sm text-slate-700">{homeDays} of {days.length} days in this view have a home check-in.</p>
          {difference && <p className="mt-1 text-sm text-slate-700">On recorded days, {measures[difference.less.measure].label.toLowerCase()} was reported less often and {measures[difference.more.measure].label.toLowerCase()} more often after {shortDate(anchor)}.</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          {latestHome && <button type="button" onClick={() => openSource(latestHome.day)} className={"min-h-11 text-sm text-primary-300 underline underline-offset-4 " + focus}>Latest home check-in · {shortDate(latestHome.day)}</button>}
          {difference && <a href="#outcome-comparison" onClick={() => { if (evidence.current) evidence.current.open = true; }}
            className={"inline-flex min-h-11 items-center text-sm text-primary-300 underline underline-offset-4 " + focus}>See comparison and evidence</a>}
          {patient.synthetic && <a href="#demo-follow-up" onClick={openDemoFollowUp} className={"inline-flex min-h-11 items-center text-sm text-primary-300 underline underline-offset-4 " + focus}>Ask the patient</a>}
          {!showComparison && <button type="button" className={"min-h-11 text-sm text-primary-300 underline underline-offset-4 " + focus}
            onClick={() => { setMode("Explore"); requestAnimationFrame(() => document.getElementById("outcome-comparison")?.scrollIntoView()); }}>Compare before and after</button>}
        </div>
      </aside>}

      {mode !== "Discuss" && <div className="grid gap-3 lg:grid-cols-2">
        <ReportingGaps days={reportingDays} onDay={openSource} />
        <section className="workspace-panel" aria-labelledby="last-review-heading">
          <h2 className="section-title flex items-center gap-2" id="last-review-heading"><ClipboardList size={17} aria-hidden /> Since last review</h2>
          <p className="mt-1 text-sm text-slate-700" role="status">{newEntries === null ? "Mark the current records as reviewed to start tracking new entries in this browser." : newEntries.length + (newEntries.length === 1 ? " new entry" : " new entries") + " since your last review."}</p>
          {review?.date && <p className="mt-1 text-xs text-clinical-muted">{patient.synthetic ? "Demo review date" : "Review saved in this browser"} · {shortDate(review.date)}</p>}
          {!!newEntries?.length && <details>
            <summary className={"min-h-11 cursor-pointer py-3 text-sm font-medium text-primary-300 " + focus}>Show dates with new entries</summary>
            <ul className="flex max-h-44 flex-wrap gap-x-3 overflow-auto">
              {[...new Set(newEntries.map((entry) => entry.day))].sort().reverse().map((day) =>
                <li key={day}><button type="button" className={"min-h-11 text-sm text-primary-300 underline underline-offset-4 " + focus} onClick={() => openSource(day)}>Review {shortDate(day)}</button></li>)}
            </ul>
          </details>}
          <button type="button" className={"btn-secondary mt-2 min-h-11 text-sm " + focus}
            onClick={() => setReview({ ids: records.map((entry) => entry.id), date: patient.end })}>Mark reviewed</button>
        </section>
      </div>}

      {mode !== "Discuss" && <div className="flex flex-wrap items-end gap-3">
        {!fixedDates && <label className="text-sm text-slate-700">Last visit date
          <input aria-describedby="visit-date-storage" type="date" name="last-visit" className="input mt-1 block min-h-11 text-base" value={lastVisit}
            min={shiftDay(patient.end, -365)} max={end} onChange={(event) => {
              const date = validDay(event.target.value);
              if (date && (date > end || date < shiftDay(patient.end, -365))) return;
              setLastVisit(date ?? "");
              setRange(date ? 0 : 14);
              setInvestigationDay(undefined);
            }} />
          <span id="visit-date-storage" className="mt-1 block text-xs text-clinical-muted">Saved in this browser</span>
        </label>}
        <label className="text-sm text-slate-700">Period
              <select className="input mt-1 block min-h-11 text-base" value={range} onChange={(e) => { setRange(Number(e.target.value)); setInvestigationDay(undefined); }}>
            {lastVisit && <option value={0}>Since last visit</option>}
            <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">Through
          <input className="input mt-1 block min-h-11 text-base" type="date" value={end} min={lastVisit || (fixedDates ? patient.start : undefined)} max={patient.end} onChange={(event) => {
            const date = validDay(event.target.value);
            if (date && date <= patient.end && date >= (lastVisit || (fixedDates ? patient.start : ""))) {
              setEnd(date); setInvestigationDay(undefined);
            }
          }} />
        </label>
        <details className="relative">
          <summary className={"btn-secondary flex min-h-11 cursor-pointer items-center gap-2 text-sm " + focus}><SlidersHorizontal size={15} aria-hidden /> Measures</summary>
          <fieldset className="z-10 mt-1 w-60 rounded-lg border border-clinical-border bg-clinical-card p-2 shadow-lg sm:absolute sm:left-0">
            <legend className="sr-only">Pinned measures</legend>
            {[...selected, ...patient.measures.filter((metric) => !selected.includes(metric))].map((metric, index) => {
              const pinned = index < selected.length;
              return <div key={metric} className="flex items-center gap-0.5">
                <label className="flex min-h-11 flex-1 items-center gap-2 rounded px-2 text-sm text-slate-700 hover:bg-slate-100">
                  <input type="checkbox" checked={pinned} disabled={selected.length === 1 && pinned} onChange={() => selectMeasure(metric)} />{measures[metric].label}
                </label>
                {pinned && <>
                  <button type="button" disabled={index === 0} aria-label={"Move " + measures[metric].label + " up"} onClick={() => moveMeasure(index, -1)} className={"grid size-11 place-items-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-30 " + focus}><ArrowUp size={15} aria-hidden /></button>
                  <button type="button" disabled={index === selected.length - 1} aria-label={"Move " + measures[metric].label + " down"} onClick={() => moveMeasure(index, 1)} className={"grid size-11 place-items-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-30 " + focus}><ArrowDown size={15} aria-hidden /></button>
                </>}
              </div>;
            })}
            <button type="button" className={"btn-secondary mt-2 min-h-11 text-sm " + focus} onClick={() => { setSelected(patient.defaults); setActive(patient.defaults[0]); }}>Reset to defaults</button>
          </fieldset>
        </details>
      </div>}

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {selected.map((metric) => {
          const stats = summarize(days, metric);
          return <button key={metric} type="button" aria-pressed={active === metric} onClick={() => setActive(metric)}
            className={"card text-left " + focus + (active === metric ? " border-primary-400" : " hover:border-slate-400")}>
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><CircleDot size={14} style={{ color: measures[metric].color }} aria-hidden />{measures[metric].label}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-slate-900">{summaryText(metric, stats)}</span>
            <span className="block text-xs text-clinical-muted">{stats.logged} of {stats.total} days recorded</span>
          </button>;
        })}
        <div className="card"><p className="flex items-center gap-2 text-sm text-slate-700"><CalendarDays size={14} aria-hidden /> Record coverage</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{loggedDays} / {days.length}</p>
          <p className="text-xs text-clinical-muted">Days with at least one entry</p>
          {!fixedDates && demoEntries > 0 && <p className="mt-1 text-xs text-clinical-muted">Includes {demoEntries} fictional demo {demoEntries === 1 ? "check-in" : "check-ins"}</p>}
          {patient.chart && <p className="mt-1 text-xs text-clinical-muted">{homeDays} home tracker days · {summarize(days, "lung").logged} spirometer days</p>}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Timeline days={days} metric={active} selected={sourceDay?.day ?? ""} onDay={(day) => { setSelectedDay(day); setInvestigationDay(undefined); }} milestone={anchor} />
        <SourceList day={sourceDay} synthetic={patient.synthetic} />
      </div>

      {mode === "Explore" && <section className="card min-w-0">
        <h2 className="section-title">Measures by date</h2>
        <p className="section-subtitle mt-1">Read pinned measures across the same dates. Select a date to open its source records.</p>
        <AlignedDays days={days} selected={selected} milestone={anchor} onDay={openSource} />
      </section>}
      {mode === "Explore" && <ReviewPatterns days={days} available={patient.measures} onDay={openSource} />}
      {mode === "Explore" && patient.measures.includes("headache") && <HeadacheMap days={days} onDay={openSource} />}
      {patient.chart && mode !== "Discuss" && <SyntheaChart chart={patient.chart} />}

      {showComparison && <section className="card scroll-mt-6" id="outcome-comparison" aria-labelledby="outcome-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="outcome-heading" className="section-title flex items-center gap-2"><ArrowDownUp size={17} aria-hidden /> Before and after</h2>
            <p className="section-subtitle mt-1">Compare equal periods around a date. The comparison shows recorded changes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-sm text-slate-700">Comparison date<input type="date" max={patient.end} className="input mt-1 text-base" value={anchor} onChange={(e) => setAnchor(e.target.value)} /></label>
            <label className="text-sm text-slate-700">Days on each side<select className="input mt-1 text-base" value={compareWidth} onChange={(e) => setCompareWidth(Number(e.target.value))}>
              {patient.practiceCase && <option value={5}>5 days</option>}
              <option value={7}>7 days</option><option value={14}>14 days</option>
            </select></label>
          </div>
        </div>
        {periods ? <>
          {width < compareWidth && <p className="mt-3 text-sm text-clinical-muted">Showing {width} {width === 1 ? "day" : "days"} on each side based on the available date range.</p>}
          {difference && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-700">Measures moved in different directions</p>
            <p className="mt-1 text-sm text-slate-700">
              This finding compares the share of recorded days with a “yes” answer in each period. Each measure needs at least three recorded days on each side.
            </p>
            <ul className="mt-2 space-y-1 text-sm tabular-nums text-slate-700">
              {[difference.less, difference.more].map(({ measure, before, after }) =>
                <li key={measure}><strong>{measures[measure].label}</strong> · {before.positive} of {before.logged} recorded days before → {after.positive} of {after.logged} after</li>)}
            </ul>
            <details ref={evidence} className="mt-2">
              <summary className={"min-h-11 cursor-pointer rounded text-sm font-medium text-slate-900 " + focus}>Review dates behind this finding</summary>
              <AlignedDays days={[...periods.before, ...periods.after]} selected={[difference.less.measure, difference.more.measure]} milestone={anchor} onDay={openSource} />
            </details>
          </div>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="text-clinical-muted"><tr>
                <th scope="col" className="py-2 pr-4">Measure</th>
                <th scope="col" className="py-2 pr-4">Before <span className="block text-xs">{shortDate(periods.before[0].day)}–{shortDate(periods.before.at(-1)!.day)}</span></th>
                <th scope="col" className="py-2">After <span className="block text-xs">{shortDate(periods.after[0].day)}–{shortDate(periods.after.at(-1)!.day)}</span></th>
              </tr></thead>
              <tbody className="divide-y divide-clinical-border">
                {selected.map((metric) => <tr key={metric}>
                  <th scope="row" className="py-2 pr-4 font-medium text-slate-900">{measures[metric].label}</th>
                  {[periods.before, periods.after].map((period) => {
                    const stats = summarize(period, metric);
                    return <td key={period[0].day} className="py-2 pr-3 text-slate-700">{summaryText(metric, stats)}
                      <span className="block text-xs text-clinical-muted">{stats.logged}/{stats.total} days recorded</span>
                    </td>;
                  })}
                </tr>)}
              </tbody>
            </table>
          </div>
          {patient.milestones.find((item) => item.day === anchor) && <p className="mt-2 text-xs text-clinical-muted">{shortDate(anchor)} · {patient.milestones.find((item) => item.day === anchor)?.label}</p>}
          {patient.practiceCase && difference && <section className="mt-3 rounded-lg border border-clinical-border bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">Asthma follow-up questions</h3>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              {visitFollowUpQuestions.map(({ id, text }) => <li key={id}>{text}</li>)}
            </ul>
            <p className="mt-2 text-xs text-clinical-muted">The clinician reviews the reports and decides what to ask next. <a className="text-primary-300 underline" href="https://www.nhlbi.nih.gov/health/asthma/symptoms">NHLBI symptom reference</a></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" className={"btn-secondary min-h-11 text-sm " + focus} onClick={copyFollowUpQuestions}>Copy questions</button>
              <span role="status" className="text-xs text-clinical-muted">{questionCopyStatus}</span>
            </div>
          </section>}
          {patient.synthetic && <a href="#demo-follow-up" className={"mt-2 inline-flex min-h-11 items-center text-sm text-primary-300 underline underline-offset-4 " + focus}
            onClick={openDemoFollowUp}>Preview a patient follow-up</a>}
        </> : <p className="mt-4 text-sm text-clinical-muted">Choose a comparison date with time available on both sides.</p>}
      </section>}

      {mode === "Explore" &&
        <section className="card">
          <h2 className="section-title">Ask about these records</h2>
          <form className="mt-2 flex flex-wrap gap-2" onSubmit={ask}>
            <label htmlFor="record-question" className="sr-only">Question about a measure</label>
            <input id="record-question" name="record-question" required className="input min-w-0 flex-1 text-base" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={"Ask about " + measures[active].label.toLowerCase() + "…"} />
            <button className={"btn-primary min-h-11 " + focus}>Show</button>
          </form>
          {answer && <div className="mt-2 space-y-1 text-sm text-slate-700" role="status">
            {answer.metric && answerStats ? <>
              <p><strong>{measures[answer.metric].label}</strong> · {summaryText(answer.metric, answerStats)}. Coverage {answerStats.logged} of {answerStats.total} days.</p>
              {answer.compare && (periods ?
                <p>Before {shortDate(anchor)} · {summaryText(answer.metric, summarize(periods.before, answer.metric))}. On or after · {summaryText(answer.metric, summarize(periods.after, answer.metric))}. <a href="#outcome-comparison" className={"text-primary-300 underline " + focus}>Open the comparison</a></p>
                : <p>Choose a comparison date to see what changed.</p>)}
            </> : <p>Try asking about {patient.measures.map((key) => measures[key].label.toLowerCase()).join(", ")}.</p>}
          </div>}
        </section>
      }
      {patient.synthetic && patient.condition === "Asthma" &&
        <DemoCaregiver patient={patient} onSave={(entry) => { onDemoSave(entry); setInvestigationDay(entry.day); }} />}
      {patient.synthetic && <DemoFollowUp key={patient.id} />}
      {!patient.synthetic && patient.recipientId && <section className="card">
        <h2 className="section-title flex items-center gap-2"><MessageSquare size={17} aria-hidden /> Follow up with the patient</h2>
        <p className="section-subtitle mt-1">Open the existing conversation to ask a question, request a change, or send a care alert.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={"/messages?with=" + encodeURIComponent(patient.recipientId)} className={"btn-secondary inline-flex min-h-11 items-center gap-2 " + focus}>Open conversation <ChevronRight size={15} aria-hidden /></Link>
          <Link href={"/messages?with=" + encodeURIComponent(patient.recipientId) + "&visitPrompt=" + (reportingDays.some((day) => !hasHomeReport(day)) ? "missing" : "symptoms")}
            className={"btn-secondary inline-flex min-h-11 items-center text-sm " + focus}>Draft a follow-up question</Link>
        </div>
      </section>}
    </>
  );
}

function DemoCaregiver({ patient, onSave }: { patient: ReviewCase; onSave: (entry: Observation) => void }) {
  const [note, setNote] = useState("");
  const [cough, setCough] = useState("");
  const [saved, setSaved] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  function dictate() {
    type Recognition = {
      start: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
    };
    const browser = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Speech = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Speech) { setVoiceError("Voice input is unavailable in this browser. You can type the update."); return; }
    const recognition = new Speech();
    setVoiceError("");
    recognition.onresult = (event) => setNote(event.results[0][0].transcript);
    recognition.onerror = () => setVoiceError("Voice input did not finish. Try again or type the update.");
    try { recognition.start(); } catch { setVoiceError("Microphone access was unavailable. You can type the update."); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!note.trim() || cough === "" || saved) return;
    onSave({ id: "demo-caregiver-" + crypto.randomUUID(), day: patient.end, source: "Caregiver",
      detail: note.trim(), values: { cough: Number(cough) } });
    setSaved(true);
  }
  return <details className="card">
    <summary className={"min-h-11 cursor-pointer rounded-md font-semibold text-slate-900 " + focus}>Try a caregiver check-in</summary>
    <p className="mb-3 text-sm text-clinical-muted">Demo only. Confirm a fictional update for {shortDate(patient.end)} and see it appear on the timeline.</p>
    <form onSubmit={save} className="space-y-3">
      <label className="block text-sm text-slate-700">What happened at home?
        <textarea required maxLength={400} value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} className="input mt-1 text-base" />
      </label>
      <button type="button" className={"btn-secondary min-h-11 " + focus} onClick={dictate}>Dictate update</button>
      {voiceError && <p className="text-sm text-amber-700" role="status">{voiceError}</p>}
      <label className="block text-sm text-slate-700">Did they wake up coughing?
        <select required value={cough} onChange={(e) => { setCough(e.target.value); setSaved(false); }} className="input mt-1 text-base">
          <option value="">Choose an answer</option><option value="1">Yes</option><option value="0">No</option>
        </select>
      </label>
      <button className={"btn-primary min-h-11 " + focus}>Confirm demo check-in</button>
      {saved && <p className="text-sm text-primary-300" role="status">Caregiver report added to the demo timeline.</p>}
    </form>
  </details>;
}

function DemoFollowUp() {
  const [kind, setKind] = useState("Action requested");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<{ kind: string; body: string }>();
  return <details id="demo-follow-up" className="card scroll-mt-6">
    <summary className={"min-h-11 cursor-pointer font-semibold text-slate-900 " + focus}>Try a clinician follow-up</summary>
    <p className="mb-3 text-sm text-clinical-muted">Preview how a clinician-written update appears in the patient inbox.</p>
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (body.trim()) setPreview({ kind, body: body.trim() });
    }}>
      <label className="block text-sm text-slate-700">Message type
        <select className="input mt-1 text-base" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option>Care update</option><option>Action requested</option><option>Care alert</option>
        </select>
      </label>
      <label className="block text-sm text-slate-700">Message for the patient
        <textarea required maxLength={400} className="input mt-1 text-base" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <button className={"btn-secondary min-h-11 " + focus}>Preview in patient inbox</button>
    </form>
    {preview && <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-3" role="status">
      <p className="text-xs text-primary-300">Patient inbox · Synthetic preview</p>
      <p className="mt-1 font-semibold text-slate-900">{preview.kind}</p>
      <p className="mt-1 break-words text-sm text-slate-700">{preview.body}</p>
    </div>}
  </details>;
}
