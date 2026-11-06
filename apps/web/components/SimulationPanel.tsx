"use client";

import { useState } from "react";
import {
  SCENARIO_CATALOG,
  type SimulationScenario,
} from "@/lib/simulation/scenarios";
import {
  FlaskConical,
  Play,
  RotateCcw,
  Check,
  Zap,
  AlertTriangle,
  TrendingUp,
  Shield,
} from "lucide-react";

const categoryColor: Record<string, string> = {
  critical: "bg-red-50 border-red-200 text-red-700",
  high: "bg-amber-50 border-amber-200 text-amber-700",
  medium: "bg-blue-50 border-blue-200 text-blue-700",
  low: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const categoryDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-emerald-500",
};

export function SimulationPanel({
  activeScenarios,
  onGenerate,
  onReset,
  isSimulationActive,
}: {
  activeScenarios: string[];
  onGenerate: (scenarioIds: string[]) => void;
  onReset: () => void;
  isSimulationActive: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleScenario = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(SCENARIO_CATALOG.map((s) => s.id)));
  };

  const handleGenerate = () => {
    if (selected.size === 0) return;
    onGenerate(Array.from(selected));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="w-4.5 h-4.5 text-purple-600" />
          Simulation Lab
        </h2>
        <p className="text-xs text-clinical-muted mt-0.5">
          Generate synthetic patients to test alerts, risk scoring, and clinical
          workflows
        </p>
      </div>

      {/* Status */}
      {isSimulationActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
          <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700">
            Simulation active — {activeScenarios.length} scenario
            {activeScenarios.length !== 1 ? "s" : ""} loaded
          </span>
          <button
            onClick={onReset}
            className="ml-auto text-[11px] font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      )}

      {/* Scenario grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider">
            Scenario Presets
          </span>
          <button
            onClick={selectAll}
            className="text-[11px] text-primary-400 hover:text-primary-300 font-medium"
          >
            Select all
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {SCENARIO_CATALOG.map((scenario) => {
            const isSelected = selected.has(scenario.id);
            return (
              <button
                key={scenario.id}
                onClick={() => toggleScenario(scenario.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                  isSelected
                    ? "ring-2 ring-primary-500 border-primary-300 bg-primary-50/30"
                    : "border-slate-200 bg-clinical-card hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                      isSelected
                        ? "bg-primary-600 border-primary-600"
                        : "bg-clinical-card border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${categoryDot[scenario.category]}`}
                      />
                      <span className="text-sm font-medium text-slate-800">
                        {scenario.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-clinical-muted mt-0.5 truncate">
                      {scenario.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={selected.size === 0}
          className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
        >
          <Play className="w-3.5 h-3.5" />
          Generate {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
        {isSimulationActive && (
          <button
            onClick={onReset}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Info note */}
      <div className="text-[10px] text-clinical-muted leading-relaxed p-2 rounded bg-slate-50 border border-slate-100">
        Synthetic patients are clearly labeled and do not affect real patient
        data. Simulation data is session-only and will be cleared on page
        refresh.
      </div>
    </div>
  );
}

// ── Synthetic badge (inline marker for synthetic patients) ──

export function SyntheticBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 ring-1 ring-purple-200">
      <FlaskConical className="w-2.5 h-2.5" />
      Synthetic
    </span>
  );
}
