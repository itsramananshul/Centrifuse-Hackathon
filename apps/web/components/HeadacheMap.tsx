"use client";

import { useState } from "react";
import { headacheLocations, type HeadacheLocation } from "@/lib/home-tracker";
import { shortDate, type ReviewDay } from "@/lib/visit-review";

const spots = [[53, 35], [79, 48], [27, 48], [156, 46], [53, 54]] as const;
const outline = "M53 14C29 14 22 33 23 52c1 24 13 42 30 45 17-3 29-21 30-45 1-19-6-38-30-38Z";

export function HeadacheMap({ days, onDay }: { days: ReviewDay[]; onDay: (day: string) => void }) {
  const [selected, setSelected] = useState<HeadacheLocation | null>(null);
  const headacheDays = days.filter(({ entries }) => entries.some((entry) => entry.values.headache === 1));
  const areas = headacheLocations.map((location) => ({
    location, dates: headacheDays.filter(({ entries }) => entries.some((entry) => entry.headacheLocation === location)),
  }));
  const missing = headacheDays.filter(({ entries }) => entries.every((entry) => !entry.headacheLocation)).length;
  const selectedDates = areas.find(({ location }) => location === selected)?.dates ?? [];

  return <section className="card" aria-labelledby="headache-map-heading">
    <h2 className="section-title" id="headache-map-heading">Headache locations</h2>
    <p className="section-subtitle mt-1">{headacheDays.length} days with a headache reported · {missing} with no location recorded</p>
    <div className="mt-4 grid items-start gap-4 sm:grid-cols-[minmax(10rem,1fr)_minmax(0,1.2fr)]">
      <svg viewBox="0 0 210 125" className="w-full max-w-[260px]" aria-hidden="true">
        <path d={outline} fill="#eef2eb" stroke="#819589" />
        <path d={outline} transform="translate(103)" fill="#eef2eb" stroke="#819589" />
        <path d="M39 55h7m14 0h7m-14 4v10m-7 9q7 4 14 0" fill="none" stroke="#688074" strokeLinecap="round" />
        {areas.map(({ location, dates }, i) => dates.length > 0 &&
          <circle key={location} cx={spots[i][0]} cy={spots[i][1]} r={location === "All over" ? 27 : 8 + Math.min(dates.length, 7)}
            fill="#537aab" fillOpacity={selected === location ? 0.85 : 0.35} stroke="#537aab" />)}
        <text x="53" y="116" fill="#526058" fontSize="10" textAnchor="middle">Front</text>
        <text x="156" y="116" fill="#526058" fontSize="10" textAnchor="middle">Back</text>
      </svg>
      <ul className="space-y-1">
        {areas.map(({ location, dates }) => <li key={location}>
          <button type="button" aria-pressed={selected === location} onClick={() => setSelected(location)}
            className={"flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm tabular-nums focus-visible:outline focus-visible:outline-primary-400 " +
              (selected === location ? "bg-primary-100 text-primary-300" : "bg-slate-50 text-slate-700 hover:bg-slate-100")}>
            {location}<span>{dates.length} {dates.length === 1 ? "day" : "days"}</span>
          </button>
        </li>)}
      </ul>
    </div>
    {selected && <div className="mt-3" aria-live="polite">
      <p className="text-sm font-medium text-slate-900">{selected} source dates</p>
      {selectedDates.length ? <ul className="mt-1 flex flex-wrap gap-2">
        {selectedDates.map(({ day }) => <li key={day}><button type="button" onClick={() => onDay(day)} className="min-h-11 rounded-lg px-2 text-sm text-primary-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-primary-400">{shortDate(day)}</button></li>)}
      </ul> : <p className="mt-1 text-sm text-clinical-muted">No reports for this location in the selected period.</p>}
    </div>}
  </section>;
}
