"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Area, AreaChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alert, CheckIn, Patient } from "@trialpulse/types";
import { checkInObservationDate } from "@/lib/home-tracker";
import { dayRange, shiftDay, shortDate } from "@/lib/visit-review";

const colors = { green: "var(--chart-green)", blue: "var(--chart-blue)", lavender: "#735a95", orange: "#a85b2c", red: "#b84d59" };
const palette = [colors.green, colors.blue, colors.lavender, colors.orange, colors.red, "#9c791f"];
const tick = { fill: "var(--chart-ink)", fontSize: 11 };
const tooltip = { background: "#fff", border: "1px solid #363a3e", borderRadius: 10, color: "var(--chart-ink)" };

export const overviewPanel = "workspace-panel";

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
    {items.map(({ name, color }) => <li key={name} className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />{name}
    </li>)}
  </ul>;
}

function getActivity(checkIns: CheckIn[], alerts: Alert[], count: number) {
  const end = new Date().toISOString().slice(0, 10);
  const days = dayRange(shiftDay(end, 1 - count), end);
  const totals = new Map(days.map((day) => [day, { checkIns: 0, people: new Set<string>(), alerts: 0 }]));
  for (const entry of checkIns) {
    const date = totals.get(entry.timestamp.slice(0, 10));
    if (date) {
      date.checkIns++;
      date.people.add(entry.patientId);
    }
  }
  for (const alert of alerts) {
    const date = totals.get(alert.createdAt.slice(0, 10));
    if (date && !alert.acknowledged) date.alerts++;
  }
  return Array.from(totals, ([day, total]) => ({
    day: shortDate(day), checkIns: total.checkIns, patients: total.people.size, alerts: total.alerts,
  }));
}

export function DashboardOverview({ patients, checkIns, alerts, queue }: {
  patients: Patient[]; checkIns: CheckIn[]; alerts: Alert[]; queue: ReactNode;
}) {
  const [range, setRange] = useState(7);
  const gradientId = useId();
  const week = useMemo(() => getActivity(checkIns, alerts, 7), [checkIns, alerts]);
  const trend = useMemo(() => getActivity(checkIns, [], range), [checkIns, range]);
  const conditions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const patient of patients) {
      const name = patient.condition.trim() || "Unspecified";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const visible = sorted.slice(0, 5);
    if (sorted.length > visible.length) {
      visible.push(["Other conditions", sorted.slice(5).reduce((total, [, value]) => total + value, 0)]);
    }
    return visible.map(([name, value], index) => ({ name, value, color: palette[index] }));
  }, [patients]);
  const weekCount = week.reduce((total, day) => total + day.checkIns, 0);
  const weekAlerts = week.reduce((total, day) => total + day.alerts, 0);
  const trendCount = trend.reduce((total, day) => total + day.checkIns, 0);

  const reporting = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dates = dayRange(shiftDay(today, -7), shiftDay(today, -1));
    const reported = new Set(checkIns.map((entry) => entry.patientId + ":" + checkInObservationDate(entry)));
    let eligible = 0;
    let logged = 0;
    for (const patient of patients) {
      if (patient.status === "dropped" || patient.status === "completed") continue;
      for (const day of dates) {
        if (day < patient.enrolledAt.slice(0, 10)) continue;
        eligible++;
        if (reported.has(patient.id + ":" + day)) logged++;
      }
    }
    return { eligible, logged, percent: eligible ? Math.round(logged * 100 / eligible) : null };
  }, [patients, checkIns]);
  const activity = range === 7 ? week : trend;
  const activityCount = range === 7 ? weekCount : trendCount;
  const busiest = Math.max(...activity.map((day) => day.checkIns));

  return <div className="min-w-0 space-y-5">
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="dashboard-chart-card" aria-labelledby="weekly-activity-title">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="weekly-activity-title" className="min-w-0 text-lg tracking-tight sm:text-xl">Weekly check-ins</h2>
          <span className="border-l border-clinical-border pl-2 text-xs text-slate-600 sm:pl-3 sm:text-sm">
            <strong className="mr-1 text-lg tabular-nums text-slate-900">{activityCount}</strong> {range === 7 ? "this week" : "check-ins"}
          </span>
          <label className="ml-auto">
            <span className="sr-only">Check-in activity period</span>
            <select value={range} onChange={(event) => setRange(Number(event.target.value))} className="min-h-9 rounded-lg border border-clinical-border bg-transparent px-2 text-sm">
              <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
            </select>
          </label>
        </div>
        <div className="mt-4 h-[clamp(9rem,17vw,12rem)] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity} margin={{ left: 0, right: 0, top: 16, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeOpacity={0.45} />
              <XAxis dataKey="day" tick={tick} axisLine={{ stroke: "var(--chart-grid)" }} tickLine={false} minTickGap={12} />
              <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(max + 0.5, 1)]} />
              <Tooltip contentStyle={tooltip} cursor={{ fill: "#e8efe4" }} />
              <Bar dataKey="checkIns" name="Check-ins" maxBarSize={48} radius={[7, 7, 2, 2]} isAnimationActive={false}>
                {activity.map((day) => <Cell key={day.day} fill={day.checkIns === busiest && day.checkIns > 0 ? "var(--chart-green)" : "#8eae91"} />)}
                {range === 7 && <LabelList dataKey="checkIns" position="top" fill="var(--chart-ink)" fontSize={12} formatter={(value: number) => value || ""} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-2 text-xs text-clinical-muted">
          <summary className="min-h-6 cursor-pointer text-slate-700">Daily activity values</summary>
          <p className="mb-1">{weekAlerts} open alerts in the last 7 days</p>
          <ul className="max-h-32 space-y-1 overflow-auto">{activity.map((day) => <li key={day.day}>{day.day}: {day.checkIns} check-ins</li>)}</ul>
        </details>
      </section>
      <section className="dashboard-chart-card grid grid-cols-[minmax(0,1fr)_clamp(4.75rem,22vw,6rem)] items-center gap-x-3 gap-y-1 sm:block" aria-labelledby="reporting-title">
        <div className="col-start-1 row-start-1">
          <h2 id="reporting-title" className="text-xl tracking-tight">Reporting</h2>
          <p className="mt-0.5 text-xs text-clinical-muted">Last 7 completed days</p>
        </div>
        <div className="relative col-start-2 row-span-3 row-start-1 mx-auto grid aspect-square w-full max-w-[9.5rem] place-items-center sm:my-3">
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="43" fill="none" stroke="var(--chart-muted)" strokeWidth="7" />
            {!!reporting.percent && <circle cx="50" cy="50" r="43" fill="none" stroke="var(--chart-green)" strokeWidth="7" pathLength="100" strokeDasharray={reporting.percent + " 100"} strokeLinecap="round" />}
          </svg>
          <div className="text-center">
            <strong className="block font-[family-name:var(--display-font)] text-[clamp(1.6rem,3.2vw,2.5rem)] font-normal leading-none tabular-nums text-primary-700">{reporting.percent === null ? "—" : reporting.percent + "%"}</strong>
            <span className="text-xs text-slate-600">{reporting.percent === null ? "No data" : "reported"}</span>
          </div>
        </div>
        <p className="col-start-1 row-start-2 text-sm tabular-nums text-slate-700 sm:text-center">{reporting.logged} of {reporting.eligible} patient-days</p>
        <div className="col-start-1 row-start-3 flex sm:mt-2 sm:justify-center"><Legend items={[{ name: "Logged", color: colors.green }, { name: "No entry", color: "var(--chart-muted)" }]} /></div>
      </section>
    </div>
    {queue}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
    <section className={overviewPanel} aria-labelledby="condition-mix-title">
      <h2 id="condition-mix-title" className="text-base font-semibold text-slate-900">Condition mix</h2>
      <p className="mt-1 text-xs text-clinical-muted">Conditions recorded for the current cohort</p>
      {conditions.length > 0 ? <div className="mt-4 grid items-center gap-3 2xl:grid-cols-[minmax(6rem,0.75fr)_minmax(0,1fr)]">
        <div className="relative mx-auto h-32 w-full max-w-[160px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={conditions} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="91%" cornerRadius={4} paddingAngle={conditions.length > 1 ? 3 : 0} stroke="none" isAnimationActive={false}>
                {conditions.map(({ name, color }) => <Cell key={name} fill={color} />)}
              </Pie>
              <Tooltip contentStyle={tooltip} itemStyle={{ color: "var(--chart-ink)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <strong className="text-xl tabular-nums text-slate-900">{patients.length}</strong>
            <span className="text-xs text-clinical-muted">patients</span>
          </div>
        </div>
        <ul className="space-y-2">
          {conditions.map(({ name, value, color }) => <li key={name} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{name}</span>
            <span className="shrink-0 tabular-nums text-slate-900">{value}</span>
          </li>)}
        </ul>
      </div> : <p className="mt-10 text-center text-sm text-clinical-muted">Linked patients will appear here.</p>}
    </section>
    <section className={overviewPanel} aria-labelledby="monitoring-trend-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="monitoring-trend-title" className="text-base font-semibold text-slate-900">Monitoring trend</h2>
          <p className="mt-1 text-xs text-clinical-muted">{trendCount} check-ins over {range} days</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <span className="sr-only">Monitoring trend period</span>
          <select className="min-h-11 rounded-lg border border-clinical-border bg-slate-50 px-2 text-sm" value={range} onChange={(event) => setRange(Number(event.target.value))}>
            <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
          </select>
        </label>
      </div>
      <div className="mt-3 h-40 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ left: -24, right: 3, top: 5, bottom: 0 }}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors.green} stopOpacity={0.3} /><stop offset="100%" stopColor={colors.green} stopOpacity={0.015} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
            <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={tick} allowDecimals={false} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(max, 1)]} />
            <Tooltip contentStyle={tooltip} itemStyle={{ color: "var(--chart-ink)" }} />
            <Area dataKey="checkIns" name="Check-ins" stroke={colors.green} strokeWidth={2} fill={"url(#" + gradientId + ")"} isAnimationActive={false} />
            <Area dataKey="patients" name="Patients reporting" stroke={colors.lavender} strokeWidth={2} fill="none" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ name: "Check-ins", color: colors.green }, { name: "Patients reporting", color: colors.lavender }]} />
      <details className="mt-2 text-xs text-clinical-muted">
        <summary className="min-h-6 cursor-pointer text-slate-700">Daily monitoring values</summary>
        <ul className="max-h-32 space-y-1 overflow-auto">{trend.map((day) => <li key={day.day}>{day.day} · {day.checkIns} check-ins · {day.patients} patients reporting</li>)}</ul>
      </details>
    </section>
    </div>
  </div>;
}
