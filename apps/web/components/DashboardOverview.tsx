"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Area, AreaChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alert, CheckIn, Patient } from "@trialpulse/types";
import { dayRange, shiftDay, shortDate } from "@/lib/visit-review";

const colors = { green: "#6ed8aa", blue: "#7daaff", lavender: "#b29af5", orange: "#f29a64", red: "#f17d86" };
const palette = [colors.green, colors.blue, colors.lavender, colors.orange, colors.red, "#e5c765"];
const tick = { fill: "#a2a7ab", fontSize: 11 };
const tooltip = { background: "#171a1d", border: "1px solid #363a3e", borderRadius: 10, color: "#f4f5f5" };

export const overviewPanel = "min-w-0 rounded-[20px] border border-[#26292d] bg-[#151618] p-4 sm:p-5";

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
  const [range, setRange] = useState(14);
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

  return <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    <section className={overviewPanel} aria-labelledby="weekly-activity-title">
      <h2 id="weekly-activity-title" className="text-base font-semibold text-slate-900">Weekly activity</h2>
      <p className="mt-1 text-xs text-clinical-muted">{weekCount} check-ins and {weekAlerts} open alerts in the last 7 days</p>
      <div className="mt-4 h-44 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={week} margin={{ left: -24, right: 2, top: 5, bottom: 0 }} barGap={3} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="#2b2e32" strokeDasharray="3 4" />
            <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} minTickGap={10} />
            <YAxis tick={tick} allowDecimals={false} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(max, 1)]} />
            <Tooltip contentStyle={tooltip} itemStyle={{ color: "#f4f5f5" }} cursor={{ fill: "#ffffff08" }} />
            <Bar dataKey="checkIns" name="Check-ins" fill={colors.blue} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="alerts" name="Open alerts" fill={colors.orange} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ name: "Check-ins", color: colors.blue }, { name: "Open alerts", color: colors.orange }]} />
      <details className="mt-2 text-xs text-clinical-muted">
        <summary className="min-h-6 cursor-pointer text-slate-700">Daily activity values</summary>
        <ul className="space-y-1">{week.map((day) => <li key={day.day}>{day.day} · {day.checkIns} check-ins · {day.alerts} open alerts</li>)}</ul>
      </details>
    </section>
    <section className={overviewPanel} aria-labelledby="condition-mix-title">
      <h2 id="condition-mix-title" className="text-base font-semibold text-slate-900">Condition mix</h2>
      <p className="mt-1 text-xs text-clinical-muted">Conditions recorded for the current cohort</p>
      {conditions.length > 0 ? <div className="mt-4 grid items-center gap-3 sm:grid-cols-[minmax(7rem,0.8fr)_minmax(0,1fr)]">
        <div className="relative mx-auto h-40 w-full max-w-[175px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={conditions} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="91%" cornerRadius={4} paddingAngle={conditions.length > 1 ? 3 : 0} stroke="none" isAnimationActive={false}>
                {conditions.map(({ name, color }) => <Cell key={name} fill={color} />)}
              </Pie>
              <Tooltip contentStyle={tooltip} itemStyle={{ color: "#f4f5f5" }} />
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
            <CartesianGrid vertical={false} stroke="#2b2e32" strokeDasharray="3 4" />
            <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={tick} allowDecimals={false} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(max, 1)]} />
            <Tooltip contentStyle={tooltip} itemStyle={{ color: "#f4f5f5" }} />
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
    {queue}
  </div>;
}
