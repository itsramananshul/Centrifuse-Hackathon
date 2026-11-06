import type { RiskScoredPatient, RiskTier } from "@/lib/risk-scoring";
import { PatientStatusBadge } from "@/components/StatusBadge";
import { InsightChip } from "@/components/InsightChip";
import { SyntheticBadge } from "@/components/SimulationPanel";
import { User } from "lucide-react";

// ── Tier visual mapping ──────────────────────────────────────

const tierBorder: Record<RiskTier, string> = {
  critical: "border-l-red-500",
  high: "border-l-amber-500",
  medium: "border-l-blue-400",
  low: "border-l-emerald-500",
};

const tierBg: Record<RiskTier, string> = {
  critical: "bg-red-50/40",
  high: "bg-amber-50/30",
  medium: "bg-clinical-card",
  low: "bg-clinical-card",
};

const rankColor: Record<RiskTier, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-emerald-100 text-emerald-700",
};

// ── Component ────────────────────────────────────────────────

export function HighRiskPatientCard({
  scoredPatient,
  rank,
  isSelected = false,
  isSynthetic = false,
  onClick,
}: {
  scoredPatient: RiskScoredPatient;
  rank: number;
  isSelected?: boolean;
  isSynthetic?: boolean;
  onClick?: () => void;
}) {
  const { patient, riskTier, insightChips, compositeScore } = scoredPatient;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border shadow-sm p-3.5 border-l-4 transition-all duration-150 cursor-pointer animate-fade-in-up ${tierBorder[riskTier]} ${tierBg[riskTier]} ${
        riskTier === "critical" ? "alert-critical" : ""
      } ${
        isSelected
          ? "ring-2 ring-primary-500 shadow-md border-primary-300"
          : "hover:shadow-md hover:border-slate-300/80"
      }`}
      style={{ animationDelay: `${Math.min(rank * 50, 500)}ms` }}
    >
      {/* Top row: rank + name + status */}
      <div className="flex items-center gap-2.5">
        {/* Rank circle */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankColor[riskTier]}`}
        >
          {rank}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Name + condition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-slate-900 truncate text-sm leading-tight">
              {patient.name}
            </h3>
            <PatientStatusBadge status={patient.status} />
            {isSynthetic && <SyntheticBadge />}
          </div>
          <p className="text-[11px] text-clinical-muted truncate">
            {patient.condition} &middot; Age {patient.age}
          </p>
        </div>

        {/* Score */}
        <span className="text-[11px] font-bold text-clinical-muted tabular-nums flex-shrink-0">
          {compositeScore}
        </span>
      </div>

      {/* Insight chips */}
      <div className="flex flex-wrap items-center gap-1 mt-2 ml-[4.25rem]">
        {insightChips.map((chip, i) => (
          <InsightChip key={i} label={chip.label} variant={chip.variant} />
        ))}
      </div>
    </button>
  );
}
