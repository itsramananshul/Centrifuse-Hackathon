import type {
  PatientProfileResult,
  PatientProfile,
  InterventionInsight,
} from "@/lib/optimization/patient-profiles";
import {
  PROFILE_LABELS,
  PROFILE_COLOR,
} from "@/lib/optimization/patient-profiles";
import { EmptyState } from "@/components/EmptyState";
import {
  Target,
  Users,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Layers,
} from "lucide-react";

// ── Profile distribution bar ────────────────────────────────

function ProfileDistribution({
  distribution,
}: {
  distribution: Record<PatientProfile, number>;
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-clinical-muted">No data</p>;

  const entries = (Object.entries(distribution) as [PatientProfile, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-1.5">
      {entries.map(([profile, count]) => (
        <div key={profile} className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PROFILE_COLOR[profile]} w-32 truncate`}>
            {PROFILE_LABELS[profile]}
          </span>
          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-primary-400 rounded transition-all duration-500"
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 w-6 text-right tabular-nums">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Patient table (compact) ─────────────────────────────────

function PatientProfileTable({
  profiles,
  onSelectPatient,
}: {
  profiles: PatientProfileResult[];
  onSelectPatient: (patientId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 pr-2 text-[10px] font-semibold text-clinical-muted uppercase tracking-wider">Patient</th>
            <th className="text-left py-2 pr-2 text-[10px] font-semibold text-clinical-muted uppercase tracking-wider">Profile</th>
            <th className="text-center py-2 pr-2 text-[10px] font-semibold text-clinical-muted uppercase tracking-wider">Completion</th>
            <th className="text-left py-2 text-[10px] font-semibold text-clinical-muted uppercase tracking-wider">Top Reason</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr
              key={p.patientId}
              onClick={() => onSelectPatient(p.patientId)}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td className="py-2 pr-2 font-medium text-slate-800">
                {p.patientName}
              </td>
              <td className="py-2 pr-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PROFILE_COLOR[p.profile]}`}>
                  {PROFILE_LABELS[p.profile]}
                </span>
              </td>
              <td className="py-2 pr-2 text-center">
                <span className={`font-bold tabular-nums ${
                  p.completionLikelihood >= 70 ? "text-emerald-600" :
                  p.completionLikelihood >= 40 ? "text-amber-600" : "text-red-600"
                }`}>
                  {p.completionLikelihood}%
                </span>
              </td>
              <td className="py-2 text-clinical-muted truncate max-w-[180px]">
                {p.reasons[0] || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Intervention insights ───────────────────────────────────

function InterventionInsightsSection({
  insights,
}: {
  insights: InterventionInsight[];
}) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight, i) => (
        <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            {insight.effectiveness === "positive" ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            ) : insight.effectiveness === "negative" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="text-[11px] font-semibold text-slate-800">
              {insight.intervention}
            </span>
            <span className="text-[9px] text-clinical-muted ml-auto">
              {insight.confidence} confidence
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {insight.pattern}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function OptimizationPanel({
  profiles,
  distribution,
  interventionInsights,
  onSelectPatient,
}: {
  profiles: PatientProfileResult[];
  distribution: Record<PatientProfile, number>;
  interventionInsights: InterventionInsight[];
  onSelectPatient: (patientId: string) => void;
}) {
  if (profiles.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Not enough data"
        description="Optimization insights will appear once patient data is available."
      />
    );
  }

  const avgCompletion = Math.round(
    profiles.reduce((sum, p) => sum + p.completionLikelihood, 0) / profiles.length
  );
  const likelyCompleters = profiles.filter((p) => p.completionLikelihood >= 70).length;
  const atRisk = profiles.filter((p) => p.completionLikelihood < 40).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-4.5 h-4.5 text-primary-400" />
          Trial Optimization
        </h2>
        <p className="text-xs text-clinical-muted mt-0.5">
          Patient profiling, outcome prediction, and intervention analysis
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 px-3 text-center">
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">
            {likelyCompleters}
          </div>
          <div className="text-[10px] text-clinical-muted font-medium mt-0.5">
            Likely Completers
          </div>
        </div>
        <div className="card py-3 px-3 text-center">
          <div className="text-2xl font-bold text-red-600 tabular-nums">
            {atRisk}
          </div>
          <div className="text-[10px] text-clinical-muted font-medium mt-0.5">
            At Risk
          </div>
        </div>
        <div className="card py-3 px-3 text-center">
          <div className={`text-2xl font-bold tabular-nums ${
            avgCompletion >= 70 ? "text-emerald-600" :
            avgCompletion >= 40 ? "text-amber-600" : "text-red-600"
          }`}>
            {avgCompletion}%
          </div>
          <div className="text-[10px] text-clinical-muted font-medium mt-0.5">
            Avg Completion Likelihood
          </div>
        </div>
      </div>

      {/* ── Profile distribution ───────────────────────── */}
      <div className="card py-3 px-3">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider">
            Patient Profile Distribution
          </span>
        </div>
        <ProfileDistribution distribution={distribution} />
      </div>

      {/* ── Patient table ──────────────────────────────── */}
      <div className="card py-3 px-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider">
            Completion Likelihood by Patient
          </span>
        </div>
        <PatientProfileTable
          profiles={profiles}
          onSelectPatient={onSelectPatient}
        />
      </div>

      {/* ── Intervention insights ──────────────────────── */}
      <div className="card py-3 px-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider">
            Intervention Insights
          </span>
        </div>
        <InterventionInsightsSection insights={interventionInsights} />
        <p className="text-[9px] text-clinical-muted mt-2 italic">
          Insights based on observed patterns. Not causal medical evidence.
        </p>
      </div>
    </div>
  );
}
