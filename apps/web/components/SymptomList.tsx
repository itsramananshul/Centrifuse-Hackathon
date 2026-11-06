import type { Symptom } from "@trialpulse/types";

export function SymptomList({ symptoms }: { symptoms: Symptom[] }) {
  return (
    <div className="space-y-2">
      {symptoms.map((symptom, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-sm text-slate-700">{symptom.name}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  symptom.severity >= 7
                    ? "bg-red-500"
                    : symptom.severity >= 4
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${symptom.severity * 10}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 w-6 text-right">
              {symptom.severity}/10
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
