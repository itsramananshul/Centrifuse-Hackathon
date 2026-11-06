import type { DropoutPrediction, DropoutLevel } from "@/lib/dropout-risk";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

const levelColor: Record<DropoutLevel, string> = {
  high: "bg-red-50 border-red-200",
  medium: "bg-amber-50 border-amber-200",
  low: "bg-emerald-50 border-emerald-200",
};

const levelBadge: Record<DropoutLevel, string> = {
  high: "badge-critical",
  medium: "badge-warning",
  low: "badge-success",
};

const levelBarColor: Record<DropoutLevel, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const trendIcon = {
  worsening: <TrendingUp className="w-3.5 h-3.5 text-red-500" />,
  stable: <Minus className="w-3.5 h-3.5 text-slate-400" />,
  improving: <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />,
};

const trendLabel = {
  worsening: "Worsening",
  stable: "Stable",
  improving: "Improving",
};

export function DropoutRiskCard({
  prediction,
}: {
  prediction: DropoutPrediction;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${levelColor[prediction.level]}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-500" />
          Dropout Prediction
        </h3>
        <div className="flex items-center gap-2">
          <span className={levelBadge[prediction.level]}>
            {prediction.level} risk
          </span>
          <span className="text-[10px] text-clinical-muted">
            {prediction.confidence} confidence
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2.5 bg-clinical-card/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${levelBarColor[prediction.level]}`}
            style={{ width: `${prediction.score}%` }}
          />
        </div>
        <span className="text-sm font-bold text-slate-900 tabular-nums w-10 text-right">
          {prediction.score}%
        </span>
      </div>

      {/* Trend indicator */}
      <div className="flex items-center gap-1.5 mb-3">
        {trendIcon[prediction.trend]}
        <span className="text-[11px] font-medium text-slate-600">
          Trend: {trendLabel[prediction.trend]}
        </span>
      </div>

      {/* Reasons */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-semibold text-clinical-muted uppercase tracking-wider">
          Risk Signals
        </h4>
        {prediction.reasons.slice(0, 4).map((reason, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-[12px] text-slate-700"
          >
            <span className="mt-0.5 flex-shrink-0">
              {prediction.level === "low" ? (
                <CheckCircle className="w-3 h-3 text-emerald-500" />
              ) : (
                <Info className="w-3 h-3 text-slate-400" />
              )}
            </span>
            <span className="leading-relaxed">{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
