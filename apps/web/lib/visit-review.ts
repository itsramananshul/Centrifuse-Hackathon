import type { CheckIn, Patient } from "@trialpulse/types";
import { questionsFor, readHomeAnswers } from "@/lib/home-tracker";

export const measures = {
  cough: { label: "Night cough", unit: "", kind: "yes-no", color: "#79dcb5" },
  activity: { label: "Activity limited", unit: "", kind: "yes-no", color: "#bc9afa" },
  lung: { label: "FEV₁", unit: "L", kind: "number", color: "#86aff4" },
  medication: { label: "Medication missed", unit: "", kind: "yes-no", color: "#efa567" },
  headache: { label: "Headache", unit: "", kind: "yes-no", color: "#79dcb5" },
  school: { label: "School missed", unit: "", kind: "yes-no", color: "#bc9afa" },
  pain: { label: "Pain", unit: "/10", kind: "number", color: "#efa567" },
  checkin: { label: "Check-in", unit: "", kind: "yes-no", color: "#79dcb5" },
} as const;

export type Measure = keyof typeof measures;
export type RecordSource = "Caregiver" | "Patient" | "Simulated spirometer" | "Check-in";
export type Observation = {
  id: string;
  day: string;
  recordedAt?: string;
  source: RecordSource;
  detail: string;
  values: Partial<Record<Measure, number>>;
};
export type Milestone = { day: string; label: string };
export type ReviewCase = {
  id: string;
  name: string;
  age: number;
  condition: string;
  synthetic: boolean;
  recipientId?: string;
  lastVisit?: string;
  start: string;
  end: string;
  measures: Measure[];
  defaults: Measure[];
  milestones: Milestone[];
  records: Observation[];
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
    const entries = byDate.get(day) ?? [];
    // Preserve every source record. The latest recorded value is shown in the trend.
    const values = Object.assign({}, ...entries.map((entry) => entry.values)) as Observation["values"];
    return { day, entries, values };
  });
}

export type ReviewDay = ReturnType<typeof makeDays>[number];

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

export function fromExistingPatient(patient: Patient, checkins: CheckIn[]): ReviewCase {
  const end = new Date().toISOString().slice(0, 10);
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    condition: patient.condition,
    synthetic: false,
    recipientId: patient.userId,
    start: shiftDay(end, -13),
    end,
    measures: [...questionsFor(patient.condition), "medication", "checkin", "pain"],
    defaults: [...questionsFor(patient.condition).slice(0, 2), "pain"],
    milestones: [],
    records: checkins.flatMap((entry) => {
      const day = (entry.checkInDate ?? entry.timestamp).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day))) return [];
      const pain = entry.painLevel?.trim();
      const scores: Record<string, number> = { normal: 1, mild: 4, high: 7, very_high: 9 };
      const number = pain ? scores[pain] ?? Number(pain) : Number.NaN;
      const missed = /^Medications missed: /m.test(entry.transcript);
      return [{
        id: entry.id, day, recordedAt: entry.timestamp, source: "Check-in",
        detail: entry.transcript,
        values: { checkin: 1, ...readHomeAnswers(entry.transcript), ...(missed ? { medication: 1 } : {}), ...(Number.isFinite(number) && number >= 0 && number <= 10 ? { pain: number } : {}) },
      }];
    }),
  };
}

const asthmaHome: Array<[number, number, number, number]> = [
  [0, 1, 0, 0], [1, 0, 0, 0], [2, 1, 1, 1], [3, 1, 0, 0], [4, 0, 1, 0],
  [5, 1, 0, 0], [6, 0, 0, 0], [7, 0, 1, 0], [8, 0, 1, 0], [10, 1, 1, 1],
];
const asthmaRecords: Observation[] = [
  ...asthmaHome.map(([offset, cough, activity, medication]) => ({
    id: "home-" + offset, day: shiftDay("2026-10-23", offset), source: "Caregiver" as const,
    detail: [cough ? "Woke up coughing." : "No waking cough reported.", activity ? "Usual activity was limited." : "Usual activity was not limited.", medication ? "A scheduled dose was missed." : "No scheduled dose was reported missed."].join(" "),
    values: { cough, activity, medication },
  })),
  ...([[0, 1.54], [2, 1.61], [4, 1.56], [7, 1.65], [9, 1.62], [11, 1.67], [12, 1.63]] as const).map(([offset, lung]) => ({
    id: "device-" + offset, day: shiftDay("2026-10-23", offset), source: "Simulated spirometer" as const,
    detail: "Illustrative home spirometer measurement. No device was connected.", values: { lung },
  })),
];

const headacheHome = [
  [0, 1, 0, 4], [1, 1, 1, 6], [2, 0, 0, 0], [3, 1, 0, 3], [4, 1, 0, 5],
  [5, 1, 0, 4], [6, 0, 0, 0], [7, 0, 0, 0], [8, 0, 1, 0], [9, 1, 1, 3], [11, 0, 0, 0], [12, 0, 1, 0],
];

export const demoCases: ReviewCase[] = [
  {
    id: "maya", name: "Maya Chen", age: 13, condition: "Asthma", synthetic: true,
    lastVisit: "2026-10-23", start: "2026-10-23", end: "2026-11-05",
    defaults: ["cough", "activity", "lung"], measures: ["cough", "activity", "lung", "medication"],
    milestones: [{ day: "2026-10-30", label: "Asthma care plan updated" }], records: asthmaRecords,
  },
  {
    id: "jordan", name: "Jordan Lee", age: 15, condition: "Headache", synthetic: true,
    lastVisit: "2026-10-23", start: "2026-10-23", end: "2026-11-05",
    defaults: ["headache", "school", "pain"], measures: ["headache", "school", "pain"],
    milestones: [{ day: "2026-10-30", label: "Headache care plan updated" }],
    records: headacheHome.map(([offset, headache, school, pain]) => ({
      id: "headache-" + offset, day: shiftDay("2026-10-23", offset), source: "Patient",
      detail: [headache ? "Headache reported." : "No headache reported.", school ? "Missed school." : "Did not report missing school.", "Pain rating " + pain + "/10."].join(" "),
      values: { headache, school, pain },
    })),
  },
];
