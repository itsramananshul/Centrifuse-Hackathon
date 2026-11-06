"use client";

import { useState } from "react";
import { measures, metricText, pairReportedDays, shortDate, type Measure, type ReviewDay } from "@/lib/visit-review";

export function ReviewPatterns({ days, available, onDay }: {
  days: ReviewDay[];
  available: Measure[];
  onDay: (day: string) => void;
}) {
  const signals = available.filter((metric) => measures[metric].kind === "yes-no" && metric !== "checkin");
  const [signal, setSignal] = useState(signals[0]);
  const [outcomeChoice, setOutcome] = useState<Measure>();
  const [lag, setLag] = useState(0);
  const outcomes = available.filter((metric) => metric !== signal && metric !== "checkin");
  const outcome = outcomeChoice && outcomes.includes(outcomeChoice) ? outcomeChoice : outcomes[0];
  if (!signal || !outcome) return null;

  const { pairs, possible } = pairReportedDays(days, signal, outcome, lag);
  const groups = [1, 0].map((answer) => ({
    answer,
    pairs: pairs.filter((pair) => pair.answer === answer),
  }));
  const enough = groups.every((group) => group.pairs.length >= 2);
  const button = "min-h-11 rounded text-primary-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-primary-400";
  return <section className="card min-w-0" aria-labelledby="review-patterns-heading">
    <h2 className="section-title" id="review-patterns-heading">Compare patterns across measures</h2>
    <p className="section-subtitle mt-1">Compare outcomes on days with a “yes” answer and days with a “no” answer. Each pair needs a recorded answer and outcome. This shows associations in the selected records.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <label className="text-sm text-slate-700">Reported measure
        <select className="input mt-1 min-h-11 text-base" value={signal} onChange={(event) => setSignal(event.target.value as Measure)}>
          {signals.map((metric) => <option key={metric} value={metric}>{measures[metric].label}</option>)}
        </select>
      </label>
      <label className="text-sm text-slate-700">Outcome
        <select className="input mt-1 min-h-11 text-base" value={outcome} onChange={(event) => setOutcome(event.target.value as Measure)}>
          {outcomes.map((metric) => <option key={metric} value={metric}>{measures[metric].label}</option>)}
        </select>
      </label>
      <label className="text-sm text-slate-700">Outcome timing
        <select className="input mt-1 min-h-11 text-base" value={lag} onChange={(event) => setLag(Number(event.target.value))}>
          <option value={0}>Same day</option>
          <option value={1}>Next day</option>
        </select>
      </label>
    </div>
    <p role="status" className="mt-3 text-sm tabular-nums text-clinical-muted">{pairs.length} of {possible} possible pairs have both values. {possible - pairs.length} have a missing value.</p>
    {enough ? <dl className="mt-3 grid gap-2 sm:grid-cols-2">
      {groups.map((group) => {
        const sum = group.pairs.reduce((total, pair) => total + pair.value, 0);
        return <div key={group.answer} className="rounded-lg border border-clinical-border bg-slate-50 p-3">
          <dt className="text-sm text-slate-700">{measures[signal].label} · {group.answer === 1 ? "Yes" : "No"}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-900">
            {measures[outcome].kind === "yes-no" ? sum + " of " + group.pairs.length + " outcomes were Yes" : metricText(outcome, sum / group.pairs.length) + " average across " + group.pairs.length + " pairs"}
          </dd>
        </div>;
      })}
    </dl> : <p className="mt-2 text-sm text-slate-700">A comparison needs at least two pairs in each group. This range has {groups[0].pairs.length} with “yes” and {groups[1].pairs.length} with “no.”</p>}
    {pairs.length > 0 && <details className="mt-2">
      <summary className="flex min-h-11 cursor-pointer items-center rounded text-sm font-medium text-slate-900 focus-visible:outline focus-visible:outline-primary-400">View paired source dates</summary>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="text-clinical-muted"><tr>
            <th scope="col" className="px-2 py-2">Report date</th>
            <th scope="col" className="px-2 py-2">{measures[signal].label}</th>
            {lag > 0 && <th scope="col" className="px-2 py-2">Outcome date</th>}
            <th scope="col" className="px-2 py-2">{measures[outcome].label}</th>
          </tr></thead>
          <tbody className="divide-y divide-clinical-border text-slate-700">
            {pairs.map(({ day, answer, outcomeDay, value }) => <tr key={day}>
              <th scope="row" className="px-2 font-normal"><button type="button" className={button} onClick={() => onDay(day)}>{shortDate(day)}</button></th>
              <td className="px-2">{metricText(signal, answer)}</td>
              {lag > 0 && <td className="px-2"><button type="button" className={button} onClick={() => onDay(outcomeDay)}>{shortDate(outcomeDay)}</button></td>}
              <td className="px-2">{metricText(outcome, value)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </details>}
  </section>;
}
