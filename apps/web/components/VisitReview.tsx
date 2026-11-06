"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownUp, CalendarDays, ChevronRight, CircleDot, ClipboardList, MessageSquare, SlidersHorizontal } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  comparison, findDifference, makeDays, measures, shiftDay, shortDate, summarize,
  type Measure, type Observation, type ReviewCase, type ReviewDay,
} from "@/lib/visit-review";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400";
const metricText = (metric: Measure, amount: number) =>
  measures[metric].kind === "yes-no" ? (amount ? "Yes" : "No") :
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount) + " " + measures[metric].unit;

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
            <CartesianGrid stroke="#303234" vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="date" tick={{ fill: "#a2a7ab", fontSize: 10 }} minTickGap={24} tickLine={false} stroke="#303234" />
            <YAxis tick={{ fill: "#a2a7ab", fontSize: 10 }} tickLine={false} axisLine={false}
              domain={measure.kind === "yes-no" ? [0, 1] : ["auto", "auto"]}
              ticks={measure.kind === "yes-no" ? [0, 1] : undefined}
              tickFormatter={measure.kind === "yes-no" ? (v) => v ? "Yes" : "No" : undefined} />
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

function SourceList({ day }: { day?: ReviewDay }) {
  return (
    <section className="card min-w-0" aria-labelledby="record-heading">
      <h2 id="record-heading" className="section-title">{day ? shortDate(day.day) + " records" : "Source records"}</h2>
      {day?.entries.length ? <ul className="mt-3 space-y-3">
        {day.entries.map((entry) => <li key={entry.id} className="rounded-lg border border-clinical-border bg-slate-50 p-3">
          <p className="text-xs font-semibold text-primary-300">{entry.source}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{entry.detail}</p>
          {entry.recordedAt && <time dateTime={entry.recordedAt} className="mt-1 block text-xs text-clinical-muted">
            Recorded {new Date(entry.recordedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </time>}
          <ul className="mt-2 flex flex-wrap gap-2">{Object.entries(entry.values).map(([key, value]) =>
            <li key={key} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{measures[key as Measure].label}: {metricText(key as Measure, value)}</li>)}</ul>
        </li>)}
      </ul> : <p className="mt-3 text-sm text-clinical-muted">{day ? "There are no records for this day." : "Select a day in the timeline."}</p>}
    </section>
  );
}

export function VisitReview({ cases }: { cases: ReviewCase[] }) {
  const [id, setId] = useState(cases[0].id);
  const patient = cases.find((entry) => entry.id === id) ?? cases[0];
  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary-300">HealthGPS · Clinician workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Since last visit</h1>
          <p className="mt-1 text-sm text-clinical-muted">Home records, trends, and follow-up in one place.</p>
        </div>
        {patient.synthetic && <span className="badge-neutral">Synthetic demo data</span>}
      </header>
      {cases.length > 1 && <nav aria-label="Demo review queue" className="flex flex-wrap gap-2">
        {cases.map((item) => <Segment key={item.id} selected={item.id === id} value={item.name + " · " + item.condition} onClick={() => setId(item.id)} />)}
      </nav>}
      <ReviewWorkspace key={patient.id} patient={patient} />
    </div>
  );
}

function ReviewWorkspace({ patient }: { patient: ReviewCase }) {
  const [selected, setSelected] = useState<Measure[]>(patient.defaults);
  const [active, setActive] = useState<Measure>(patient.defaults[0]);
  const [end, setEnd] = useState(patient.end);
  const [range, setRange] = useState(14);
  const [anchor, setAnchor] = useState(patient.milestones[0]?.day ?? "");
  const [compareWidth, setCompareWidth] = useState(7);
  const [selectedDay, setSelectedDay] = useState(patient.milestones[0]?.day ?? patient.end);
  const [mode, setMode] = useState("Glance");
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Measure | null>(null);
  const [reviewed, setReviewed] = useState<string[] | null>(null);
  const [extra, setExtra] = useState<Observation[]>([]);
  const [ready, setReady] = useState(false);
  const storageKey = "healthgps-review-v1:" + patient.id;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (Array.isArray(saved.measures)) {
        const valid = patient.measures.filter((metric) => saved.measures.includes(metric));
        if (valid.length) { setSelected(valid); setActive(valid[0]); }
      }
      if (Array.isArray(saved.reviewed)) setReviewed(saved.reviewed.filter((value: unknown) => typeof value === "string"));
    } catch { /* The review works without local preferences. */ }
    setReady(true);
  }, [storageKey, patient.measures]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ measures: selected, reviewed })); } catch { /* Optional local preferences. */ }
  }, [ready, storageKey, selected, reviewed]);

  const records = [...patient.records, ...extra];
  const start = range === 0 && patient.lastVisit ? patient.lastVisit : shiftDay(end, 1 - (range || 14));
  const days = makeDays(start, end, records);
  const sourceDay = days.find((row) => row.day === selectedDay) ?? days.at(-1);
  const periods = anchor && anchor <= patient.end ? comparison(records, anchor, Math.min(compareWidth, Math.floor((Date.parse(patient.end) - Date.parse(anchor)) / 86_400_000) + 1)) : null;
  const difference = periods ? findDifference(periods, patient.measures) : null;
  const newEntries = reviewed ? records.filter((entry) => !reviewed.includes(entry.id)).length : null;
  const loggedDays = days.filter((day) => day.entries.length > 0).length;
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

  function ask(event: FormEvent) {
    event.preventDefault();
    const terms = draft.trim().toLowerCase();
    const aliases: Record<Measure, RegExp> = {
      cough: /cough/, activity: /activity|exercise/, lung: /lung|spirom|fev|breath/,
      medication: /medic|dose/, headache: /headache/, school: /school|absence/,
      pain: /pain/, checkin: /check.in|logged|entries/,
    };
    const metric = patient.measures.find((key) => aliases[key].test(terms));
    setQuestion(draft.trim());
    setAnswer(metric ?? null);
    if (metric) {
      if (!selected.includes(metric)) setSelected([...selected, metric]);
      setActive(metric);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-clinical-border py-3">
        <div>
          <h2 className="font-semibold text-slate-900">{patient.name}</h2>
          <p className="text-sm text-clinical-muted">{patient.condition} · Age {patient.age}{patient.lastVisit ? " · Last visit " + shortDate(patient.lastVisit) : " · Recent check-ins"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1" aria-label="Review mode">
          {["Glance", "Explore", "Discuss"].map((value) => <Segment key={value} value={value} selected={mode === value} onClick={() => setMode(value)} />)}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-700">Period
          <select className="input mt-1 block min-h-11 text-base" value={range} onChange={(e) => setRange(Number(e.target.value))}>
            {patient.lastVisit && <option value={0}>Since last visit</option>}
            <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">Through
          <input className="input mt-1 block min-h-11 text-base" type="date" value={end} max={patient.end} onChange={(e) => { if (e.target.value) { setEnd(e.target.value); if (patient.lastVisit && e.target.value < patient.lastVisit) setRange(14); } }} />
        </label>
        <details className="relative">
          <summary className={"btn-secondary flex min-h-11 cursor-pointer items-center gap-2 text-sm " + focus}><SlidersHorizontal size={15} aria-hidden /> Measures</summary>
          <fieldset className="absolute left-0 z-10 mt-1 w-52 rounded-lg border border-clinical-border bg-clinical-card p-2 shadow-lg">
            <legend className="sr-only">Pinned measures</legend>
            {patient.measures.map((metric) => <label key={metric} className="flex min-h-11 items-center gap-2 rounded px-2 text-sm text-slate-700 hover:bg-slate-100">
              <input type="checkbox" checked={selected.includes(metric)} disabled={selected.length === 1 && selected.includes(metric)} onChange={() => selectMeasure(metric)} />{measures[metric].label}
            </label>)}
          </fieldset>
        </details>
      </div>

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
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Timeline days={days} metric={active} selected={sourceDay?.day ?? ""} onDay={setSelectedDay} milestone={anchor} />
        <SourceList day={sourceDay} />
      </div>

      {mode !== "Discuss" && <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2"><ArrowDownUp size={17} aria-hidden /> Before and after</h2>
            <p className="section-subtitle mt-1">Compare equal periods around a date. The comparison shows recorded changes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-sm text-slate-700">Comparison date<input type="date" max={patient.end} className="input mt-1 text-base" value={anchor} onChange={(e) => setAnchor(e.target.value)} /></label>
            <label className="text-sm text-slate-700">Days on each side<select className="input mt-1 text-base" value={compareWidth} onChange={(e) => setCompareWidth(Number(e.target.value))}>
              <option value={7}>7 days</option><option value={14}>14 days</option>
            </select></label>
          </div>
        </div>
        {periods ? <>
          {difference && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-700">Measures moved in different directions</p>
            <p className="mt-1 text-sm text-slate-700">
              {measures[difference.less.measure].label} was reported less often and {measures[difference.more.measure].label.toLowerCase()} more often on recorded days. Review the coverage and source entries with the family.
            </p>
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
        </> : <p className="mt-4 text-sm text-clinical-muted">Choose a date to compare the surrounding periods.</p>}
      </section>}

      {mode === "Explore" && <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title flex items-center gap-2"><ClipboardList size={17} aria-hidden /> Since last review</h2>
          <p className="mt-2 text-sm text-slate-700">{newEntries === null ? "Mark the current records as reviewed to start tracking new entries on this device." : newEntries + " new entries since your last review."}</p>
          <button type="button" className={"btn-secondary mt-3 min-h-11 " + focus} onClick={() => setReviewed(records.map((entry) => entry.id))}>Mark reviewed</button>
        </section>
        <section className="card">
          <h2 className="section-title">Ask about these records</h2>
          <form className="mt-2 flex flex-wrap gap-2" onSubmit={ask}>
            <label htmlFor="record-question" className="sr-only">Question about a measure</label>
            <input id="record-question" className="input min-w-0 flex-1 text-base" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={"Ask about " + measures[active].label.toLowerCase() + "…"} />
            <button className={"btn-primary min-h-11 " + focus}>Show</button>
          </form>
          {question && <p className="mt-2 break-words text-sm text-slate-700" role="status">
            {answer ? measures[answer].label + ": " + summaryText(answer, summarize(days, answer)) + ". The timeline above shows the supporting days." : "Try asking about " + patient.measures.map((key) => measures[key].label.toLowerCase()).join(", ") + "."}
          </p>}
        </section>
      </div>}
      {patient.synthetic && patient.condition === "Asthma" &&
        <DemoCaregiver patient={patient} onSave={(entry) => setExtra((previous) => [...previous.filter((old) => old.id !== entry.id), entry])} />}
      {patient.synthetic && <DemoFollowUp key={patient.id} />}
      {!patient.synthetic && patient.recipientId && <section className="card">
        <h2 className="section-title flex items-center gap-2"><MessageSquare size={17} aria-hidden /> Follow up with the patient</h2>
        <p className="section-subtitle mt-1">Open the existing conversation to ask a question, request a change, or send a care alert.</p>
        <Link href={"/messages?with=" + encodeURIComponent(patient.recipientId)} className={"btn-secondary mt-3 inline-flex min-h-11 items-center gap-2 " + focus}>Open conversation <ChevronRight size={15} aria-hidden /></Link>
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
    if (!note.trim() || cough === "") return;
    onSave({ id: "demo-caregiver-follow-up", day: patient.end, source: "Caregiver",
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
  return <details className="card">
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