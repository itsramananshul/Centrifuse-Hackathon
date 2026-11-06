import type { CheckIn, Patient } from "@trialpulse/types";
import { checkInObservationDate, checkInReportedPain, questionsFor, readHeadacheLocation, readHomeAnswers, type HeadacheLocation } from "@/lib/home-tracker";

export const measures = {
  cough: { label: "Night cough", unit: "", kind: "yes-no", color: "#23704c" },
  activity: { label: "Activity limited", unit: "", kind: "yes-no", color: "#537aab" },
  lung: { label: "FEV₁", unit: "L", kind: "number", color: "#47668e" },
  medication: { label: "Medication missed", unit: "", kind: "yes-no", color: "#a45c2d" },
  headache: { label: "Headache", unit: "", kind: "yes-no", color: "#23704c" },
  school: { label: "School missed", unit: "", kind: "yes-no", color: "#537aab" },
  pain: { label: "Pain", unit: "/10", kind: "number", color: "#a45c2d" },
  checkin: { label: "Check-in", unit: "", kind: "yes-no", color: "#23704c" },
} as const;

export type Measure = keyof typeof measures;
export function metricText(metric: Measure, amount: number) {
  const measure = measures[metric];
  if (measure.kind === "yes-no") return amount ? "Yes" : "No";
  const value = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  return value + " " + measure.unit;
}

export type RecordSource = "Caregiver" | "Patient" | "Simulated spirometer" | "Check-in" | "Fictional check-in";
export type Observation = {
  id: string;
  day: string;
  recordedAt?: string;
  source: RecordSource;
  detail: string;
  headacheLocation?: HeadacheLocation;
  values: Partial<Record<Measure, number>>;
};
export type Milestone = { day: string; label: string };
type ChartEntry = {
  reference: string;
  timestamp: string;
  label: string;
};
export type ReviewCase = {
  id: string;
  name: string;
  age: number;
  condition: string;
  synthetic: boolean;
  practiceCase?: boolean;
  comparisonWidth?: number;
  recipientId?: string;
  lastVisit?: string;
  start: string;
  end: string;
  measures: Measure[];
  defaults: Measure[];
  milestones: Milestone[];
  records: Observation[];
  chart?: { patientReference: string; entries: ChartEntry[] };
};

export function shiftDay(day: string, offset: number) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function dayRange(start: string, end: string) {
  const count = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  return Array.from({ length: Math.min(366, Math.max(0, count)) }, (_, i) => shiftDay(start, i));
}

export function shortDate(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(day + "T00:00:00Z"));
}

export function makeDays(start: string, end: string, records: Observation[]) {
  const byDate = new Map<string, Observation[]>();
  for (const record of records) {
    const existing = byDate.get(record.day) ?? [];
    existing.push(record);
    byDate.set(record.day, existing);
  }
  return dayRange(start, end).map((day) => {
    const entries = (byDate.get(day) ?? []).sort((left, right) =>
      (left.recordedAt ? Date.parse(left.recordedAt) : 0) - (right.recordedAt ? Date.parse(right.recordedAt) : 0)
    );
    // Preserve every source record. The latest recorded value is shown in the trend.
    const values = Object.assign({}, ...entries.map((entry) => entry.values)) as Observation["values"];
    return { day, entries, values };
  });
}

export type ReviewDay = ReturnType<typeof makeDays>[number];

export function hasHomeReport(day: ReviewDay) {
  return day.entries.some((entry) => entry.source !== "Simulated spirometer");
}

export function summarize(days: ReviewDay[], measure: Measure) {
  const values = days.flatMap(({ values }) => values[measure] === undefined ? [] : [values[measure]]);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    logged: values.length,
    total: days.length,
    positive: sum,
    mean: values.length ? sum / values.length : null,
  };
}

export function comparison(records: Observation[], day: string, width: number) {
  return {
    before: makeDays(shiftDay(day, -width), shiftDay(day, -1), records),
    after: makeDays(day, shiftDay(day, width - 1), records),
  };
}

export function findDifference(periods: ReturnType<typeof comparison>, options: Measure[]) {
  const outcomes = (["cough", "activity", "headache", "school"] as const)
    .filter((measure) => options.includes(measure))
    .map((measure) => {
      const before = summarize(periods.before, measure);
      const after = summarize(periods.after, measure);
      const change = before.mean === null || after.mean === null ? 0 : after.mean - before.mean;
      return { measure, before, after, change };
    })
    .filter(({ before, after }) => before.logged >= 3 && after.logged >= 3);
  const less = outcomes.find(({ change }) => change < 0);
  const more = outcomes.find(({ change }) => change > 0);
  return less && more ? { less, more } : null;
}

export function reviewQueue(cases: ReviewCase[]) {
  return cases.map((patient) => {
    // Count completed days in the real queue and use the full simulated date range in the demo.
    const through = patient.synthetic ? patient.end : shiftDay(patient.end, -1);
    const week = makeDays(shiftDay(through, -6), through, patient.records);
    const logged = week.filter(hasHomeReport).length;
    const trailingGap = week.slice(-3).every((day) => !hasHomeReport(day));
    const gap = patient.records.some((entry) => entry.source !== "Simulated spirometer") && trailingGap;
    const anchor = patient.milestones[0]?.day ?? shiftDay(through, -6);
    const periods = comparison(patient.records, anchor, 7);
    const changes = patient.measures
      .filter((metric) => ["cough", "activity", "headache", "school", "medication"].includes(metric))
      .flatMap((metric) => {
        const before = summarize(periods.before, metric);
        const after = summarize(periods.after, metric);
        const increase = (after.mean ?? 0) - (before.mean ?? 0);
        return before.logged >= 3 && after.logged >= 3 && increase >= 0.25
          ? [{ metric, before, after, increase }] : [];
      })
      .sort((a, b) => b.increase - a.increase);
    return { patient, through, anchor, logged, gap, changes, reasonCount: Number(gap) + Number(changes.length > 0) };
  }).sort((a, b) => b.reasonCount - a.reasonCount || a.logged - b.logged || a.patient.name.localeCompare(b.patient.name));
}

export function pairReportedDays(days: ReviewDay[], signal: Measure, outcome: Measure, lag: number) {
  const byDate = new Map(days.map((day) => [day.day, day]));
  const pairs = days.flatMap(({ day, values }) => {
    const outcomeDay = shiftDay(day, lag);
    const answer = values[signal];
    const value = byDate.get(outcomeDay)?.values[outcome];
    return (answer === 0 || answer === 1) && value !== undefined
      ? [{ day, answer, outcomeDay, value }] : [];
  });
  const possible = days.filter(({ day }) => byDate.has(shiftDay(day, lag))).length;
  return { pairs, possible };
}

export function isPracticePatient(patient: Patient) {
  return patient.id === "8f2de90f-719d-4ca2-9f91-71867dcb9d3e" && patient.trialId === "HEALTHGPS-DEMO-ASTHMA";
}

export function fromExistingPatient(patient: Patient, checkins: CheckIn[]): ReviewCase {
  const practiceCase = isPracticePatient(patient);
  const firstDay = practiceCase ? patient.enrolledAt.slice(0, 10) : undefined;
  const end = firstDay ? shiftDay(firstDay, 9) : new Date().toISOString().slice(0, 10);
  const conditionMeasures = questionsFor(patient.condition);
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    condition: patient.condition,
    synthetic: false,
    practiceCase,
    recipientId: patient.userId,
    lastVisit: firstDay,
    start: firstDay ?? shiftDay(end, -13),
    end,
    measures: [...conditionMeasures, "medication", "checkin", "pain"],
    defaults: [...conditionMeasures.slice(0, 2), ...(practiceCase ? [] : ["pain" as const])],
    comparisonWidth: practiceCase ? 5 : undefined,
    milestones: firstDay ? [{ day: shiftDay(firstDay, 5), label: "Example care-plan change" }] : [],
    records: checkins.flatMap((entry) => {
      const day = checkInObservationDate(entry);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day))) return [];
      const pain = checkInReportedPain(entry);
      const missed = /^Medications missed: /m.test(entry.transcript);
      const homeAnswers = readHomeAnswers(entry.transcript);
      return [{
        id: entry.id, day, recordedAt: entry.timestamp, source: practiceCase ? "Fictional check-in" : "Check-in",
        detail: entry.transcript,
        headacheLocation: homeAnswers.headache === 1 ? readHeadacheLocation(entry.transcript) : undefined,
        values: { checkin: 1, ...homeAnswers, ...(missed ? { medication: 1 } : {}), ...(pain === undefined ? {} : { pain }) },
      }];
    }),
  };
}

const asthmaHome: Array<[number, number, number, number]> = [
  [0, 1, 0, 0], [1, 0, 0, 0], [2, 1, 1, 1], [3, 1, 0, 0], [4, 0, 1, 0],
  [5, 1, 0, 0], [6, 0, 0, 0], [7, 0, 1, 0], [8, 0, 1, 0], [10, 1, 1, 1],
];
const asthmaVisit = "2021-02-16";
// Selected fields from the official 100-patient Synthea FHIR R4 archive.
// Bundle filename: Lonny638_Beier427_337f0745-95ef-af89-6f88-e00fe0e29b6d.json
const asthmaChart = {
  patientReference: "Patient/337f0745-95ef-af89-6f88-e00fe0e29b6d",
  entries: [
    { reference: "Condition/337f0745-95ef-af89-c215-84842856de39", timestamp: "2011-12-19T21:38:10+00:00", label: "Childhood asthma (disorder)" },
    { reference: "Encounter/337f0745-95ef-af89-b0ca-39f2651d5082", timestamp: "2021-02-16T21:38:10+00:00", label: "Well child visit (procedure)" },
    { reference: "MedicationRequest/337f0745-95ef-af89-4644-a0970e6ad7d8", timestamp: "2021-02-16T21:38:10+00:00", label: "NDA020983 200 ACTUAT albuterol 0.09 MG/ACTUAT Metered Dose Inhaler [Ventolin]" },
    { reference: "MedicationRequest/337f0745-95ef-af89-06ef-924d2086ccdd", timestamp: "2021-02-16T21:38:10+00:00", label: "120 ACTUAT fluticasone propionate 0.044 MG/ACTUAT Metered Dose Inhaler [Flovent]" },
  ],
};
const asthmaRecords: Observation[] = [
  ...asthmaHome.map(([offset, cough, activity, medication]) => ({
    id: "home-" + offset, day: shiftDay(asthmaVisit, offset), source: "Caregiver" as const,
    recordedAt: shiftDay(asthmaVisit, offset === 10 ? offset + 1 : offset) + "T15:00:00Z",
    detail: [cough ? "Woke up coughing." : "No waking cough reported.", activity ? "Usual activity was limited." : "Usual activity was not limited.", medication ? "A scheduled dose was missed." : "No scheduled dose was reported missed."].join(" "),
    values: { cough, activity, medication },
  })),
  ...([[0, 1.54], [2, 1.61], [4, 1.56], [7, 1.65], [9, 1.62], [11, 1.67], [12, 1.63]] as const).map(([offset, lung]) => ({
    id: "device-" + offset, day: shiftDay(asthmaVisit, offset), source: "Simulated spirometer" as const,
    recordedAt: shiftDay(asthmaVisit, offset) + "T13:00:00Z",
    detail: "Illustrative home spirometer measurement. No device was connected.", values: { lung },
  })),
];

const headacheHome: Array<[number, number, number, number, HeadacheLocation?]> = [
  [0, 1, 0, 4, "Forehead"], [1, 1, 1, 6, "Left temple"], [2, 0, 0, 0],
  [3, 1, 0, 3, "Forehead"], [4, 1, 0, 5, "Left temple"], [5, 1, 0, 4],
  [6, 0, 0, 0], [7, 0, 0, 0], [8, 0, 1, 0], [9, 1, 1, 3, "Back of head"], [11, 0, 0, 0], [12, 0, 1, 0],
];

export const demoCases: ReviewCase[] = [
  {
    id: "maya", name: "Maya Chen", age: 13, condition: "Asthma", synthetic: true,
    lastVisit: asthmaVisit, start: asthmaVisit, end: shiftDay(asthmaVisit, 13), chart: asthmaChart,
    defaults: ["cough", "activity", "lung"], measures: ["cough", "activity", "lung", "medication"],
    milestones: [{ day: shiftDay(asthmaVisit, 7), label: "Simulated asthma care plan update" }], records: asthmaRecords,
  },
  {
    id: "jordan", name: "Jordan Lee", age: 15, condition: "Headache", synthetic: true,
    lastVisit: "2026-10-23", start: "2026-10-23", end: "2026-11-05",
    defaults: ["headache", "school", "pain"], measures: ["headache", "school", "pain"],
    milestones: [{ day: "2026-10-30", label: "Headache care plan updated" }],
    records: headacheHome.map(([offset, headache, school, pain, headacheLocation]) => ({
      id: "headache-" + offset, day: shiftDay("2026-10-23", offset), source: "Patient",
      detail: [headache ? "Headache reported." : "No headache reported.", school ? "Missed school." : "Did not report missing school.", "Pain rating " + pain + "/10."].join(" "),
      headacheLocation,
      values: { headache, school, pain },
    })),
  },
];
