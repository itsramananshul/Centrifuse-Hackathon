import { useState } from "react";
import type { SmartAlert, SmartAlertType, SmartAlertSeverity } from "@/lib/alert-engine";
import {
  Zap,
  TrendingUp,
  UserX,
  MessageCircleWarning,
  ShieldAlert,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Type icon mapping ───────────────────────────────────────

const typeIcon: Record<SmartAlertType, React.ComponentType<{ className?: string }>> = {
  mismatch: MessageCircleWarning,
  trend_spike: TrendingUp,
  engagement_drop: UserX,
  distress_signal: Zap,
  adverse_reaction: ShieldAlert,
  dropout_warning: LogOut,
  emergency: ShieldAlert,
};

const severityColor: Record<SmartAlertSeverity, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-blue-400",
};

const severityBg: Record<SmartAlertSeverity, string> = {
  high: "bg-red-50 border-red-200 hover:bg-red-100/60",
  medium: "bg-amber-50 border-amber-200 hover:bg-amber-100/60",
  low: "bg-slate-50 border-slate-200 hover:bg-slate-100/60",
};

// ── Component ───────────────────────────────────────────────

export function SmartAlertBar({
  alerts,
  onAlertClick,
  stacked = false,
}: {
  alerts: SmartAlert[];
  onAlertClick: (patientId: string) => void;
  stacked?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  // Show max 4 collapsed, all when expanded
  const visible = expanded ? alerts : alerts.slice(0, 4);
  const remaining = alerts.length - 4;

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center gap-2 mb-1.5">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Smart Alerts
        </h3>
        <span className="text-[10px] font-bold text-white bg-clinical-danger-action rounded-full w-5 h-5 flex items-center justify-center">
          {alerts.length}
        </span>
      </div>
      <div className={"flex flex-wrap gap-2 pb-1 " + (stacked ? "flex-col" : "overflow-x-auto")}>
        {visible.map((alert) => {
          const Icon = typeIcon[alert.type];
          return (
            <button
              key={alert.id}
              onClick={() => onAlertClick(alert.patientId)}
              className={`flex shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors duration-150 ${stacked ? "w-full min-w-0" : "min-w-[220px] max-w-[280px]"} ${severityBg[alert.severity]}`}
            >
              {/* Severity dot + label + icon */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${severityColor[alert.severity]}`}
                />
                <span className={`text-[8px] font-bold uppercase tracking-wider ${
                  alert.severity === "high" ? "text-red-600"
                    : alert.severity === "medium" ? "text-amber-600"
                    : "text-blue-500"
                }`}>
                  {alert.severity}
                </span>
                <Icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-slate-800 truncate">
                  {alert.title}
                </div>
                <div className="text-[10px] text-clinical-muted truncate">
                  {alert.patientName}
                </div>
              </div>
            </button>
          );
        })}
        {remaining > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 flex items-center gap-1 px-3 text-[11px] text-primary-400 font-medium hover:text-primary-300 transition-colors cursor-pointer"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                +{remaining} more
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
