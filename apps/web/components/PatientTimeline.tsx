import { useState } from "react";
import type {
  TimelineEvent,
  TimelineEventType,
  TimelineEventSeverity,
  PainDataPoint,
} from "@/lib/patient-timeline";
import { EmptyState } from "@/components/EmptyState";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import {
  Mic,
  Bell,
  Pill,
  ShieldAlert,
  Brain,
  Clock,
  Filter,
  TrendingUp,
} from "lucide-react";

// ── Event type config ───────────────────────────────────────

const typeConfig: Record<
  TimelineEventType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    dotColor: string;
  }
> = {
  checkin: { icon: Mic, label: "Check-in", dotColor: "bg-primary-500" },
  alert: { icon: Bell, label: "Alert", dotColor: "bg-red-500" },
  medication: { icon: Pill, label: "Medication", dotColor: "bg-amber-500" },
  adverse_event: {
    icon: ShieldAlert,
    label: "Adverse Event",
    dotColor: "bg-red-600",
  },
  ai_insight: { icon: Brain, label: "AI Insight", dotColor: "bg-purple-500" },
};

const severityBorder: Record<TimelineEventSeverity, string> = {
  critical: "border-l-red-500 bg-red-50/30",
  high: "border-l-amber-500 bg-amber-50/20",
  medium: "border-l-amber-300 bg-clinical-card",
  low: "border-l-slate-300 bg-clinical-card",
  neutral: "border-l-slate-200 bg-clinical-card",
  positive: "border-l-emerald-400 bg-emerald-50/20",
};

// ── Filter tabs ─────────────────────────────────────────────

const FILTERS: { key: TimelineEventType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "checkin", label: "Check-ins" },
  { key: "medication", label: "Meds" },
  { key: "alert", label: "Alerts" },
  { key: "ai_insight", label: "AI" },
];

// ── Sparkline ───────────────────────────────────────────────

function PainSparkline({ data }: { data: PainDataPoint[] }) {
  if (data.length < 2) return null;

  const lastPain = data[data.length - 1].maxPain;
  const strokeColor =
    lastPain >= 7 ? "#fa8088" : lastPain >= 4 ? "#f0a466" : "#69d6a6";
  const fillColor =
    lastPain >= 7 ? "#6a3038" : lastPain >= 4 ? "#694224" : "#295c48";

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    pain: d.maxPain,
  }));

  return (
    <div className="flex items-center gap-3">
      <div className="w-[200px] h-[48px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <YAxis domain={[0, 10]} hide />
            <Tooltip
              contentStyle={{ fontSize: 10, borderRadius: 6, backgroundColor: "#171819", color: "#f4f5f5", border: "1px solid #303234", padding: "4px 8px" }}
              formatter={(value: number) => [`${value}/10`, "Pain"]}
            />
            <Area
              type="monotone"
              dataKey="pain"
              stroke={strokeColor}
              strokeWidth={2}
              fill={fillColor}
              dot={false}
              activeDot={{ r: 3, fill: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-right">
        <div
          className="text-sm font-bold tabular-nums"
          style={{ color: strokeColor }}
        >
          {lastPain}/10
        </div>
        <div className="text-[10px] text-clinical-muted">latest</div>
      </div>
    </div>
  );
}

// ── Metadata badges helper ──────────────────────────────────

function MetadataBadges({ metadata }: { metadata: Record<string, unknown> }) {
  const pain = metadata.maxPain as number | undefined;
  const adherence = metadata.adherence as string | undefined;
  const acknowledged = metadata.acknowledged as boolean | undefined;

  const hasBadges =
    pain !== undefined || (adherence && adherence !== "low") || acknowledged === false;
  if (!hasBadges) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {pain !== undefined && (
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            pain >= 7
              ? "bg-red-100 text-red-700"
              : pain >= 4
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
          }`}
        >
          Pain: {pain}/10
        </span>
      )}
      {adherence && adherence !== "low" && (
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            adherence === "high"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          Meds: {adherence}
        </span>
      )}
      {acknowledged === false && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
          Unresolved
        </span>
      )}
    </div>
  );
}

// ── Timeline event card ─────────────────────────────────────

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const config = typeConfig[event.type];
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dotColor}`}
        />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-3 p-3 rounded-lg border-l-2 border border-slate-100 ${severityBorder[event.severity]}`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {config.label}
            </span>
          </div>
          <span className="text-[10px] text-clinical-muted flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {new Date(event.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <h4 className="text-sm font-medium text-slate-800">{event.title}</h4>
        <p className="text-xs text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
          {event.description}
        </p>

        {/* Metadata badges */}
        {event.metadata && (
          <MetadataBadges metadata={event.metadata} />
        )}
      </div>
    </div>
  );
}

// ── Main timeline component ─────────────────────────────────

export function PatientTimeline({
  events,
  painTrend,
}: {
  events: TimelineEvent[];
  painTrend: PainDataPoint[];
}) {
  const [filter, setFilter] = useState<TimelineEventType | "all">("all");

  const filteredEvents =
    filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div className="card">
      {/* Header with trend sparkline */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          Patient Timeline
        </h3>
        {painTrend.length >= 2 && (
          <div>
            <div className="text-[10px] text-clinical-muted mb-0.5 text-right">
              Pain trend
            </div>
            <PainSparkline data={painTrend} />
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? events.length
              : events.filter((e) => e.type === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex-shrink-0 ${
                filter === f.key
                  ? "bg-primary-100 text-primary-300"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timeline events"
          description={
            filter === "all"
              ? "Events will appear here as patient data comes in."
              : `No ${filter.replace("_", " ")} events found.`
          }
        />
      ) : (
        <div>
          {filteredEvents.map((event) => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
