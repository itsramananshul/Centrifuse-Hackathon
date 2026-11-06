import { useMemo } from "react";
import Link from "next/link";
import type { CheckIn, Alert } from "@trialpulse/types";
import type { RiskScoredPatient } from "@/lib/risk-scoring";
import { buildPatientTimeline, getPainTrend } from "@/lib/patient-timeline";
import { predictDropoutRisk } from "@/lib/dropout-risk";
import { SeverityBadge, RiskBadge } from "@/components/StatusBadge";
import { AlertFollowUp } from "@/components/AlertFollowUp";
import { DropoutRiskBar } from "@/components/DropoutRiskBar";
import { SymptomList } from "@/components/SymptomList";
import { InsightChip } from "@/components/InsightChip";
import { DropoutRiskCard } from "@/components/DropoutRiskCard";
import { PatientTimeline } from "@/components/PatientTimeline";
import { CommunicationPanel } from "@/components/CommunicationPanel";
import { EmptyState } from "@/components/EmptyState";
import { SyntheticBadge } from "@/components/SimulationPanel";
import { comparison, fromExistingPatient, isPracticePatient, measures, summarize } from "@/lib/visit-review";
import {
  User,
  Calendar,
  AlertTriangle,
  FileText,
  Stethoscope,
  ShieldAlert,
} from "lucide-react";

// ── Tier colors ─────────────────────────────────────────────

const tierHeaderBg: Record<string, string> = {
  critical: "bg-red-50 border-red-200",
  high: "bg-amber-50 border-amber-200",
  medium: "bg-blue-50 border-blue-200",
  low: "bg-emerald-50 border-emerald-200",
};

const tierDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-emerald-500",
};

// ── Empty state ─────────────────────────────────────────────

export function PatientDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Stethoscope className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        Select a patient
      </h3>
      <p className="text-sm text-clinical-muted max-w-xs">
        Click on a patient from the list to view their clinical details, AI
        analysis, and check-in history.
      </p>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────

export function PatientDetailPanel({
  scored,
  checkins,
  allAlerts,
  onAcknowledge,
  isSynthetic = false,
}: {
  scored: RiskScoredPatient;
  checkins: CheckIn[];
  allAlerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  isSynthetic?: boolean;
}) {
  const { patient, analysis, alerts, riskTier, insightChips, compositeScore } =
    scored;

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const practice = isPracticePatient(patient);
  const practiceComparison = useMemo(() => {
    if (!practice) return null;
    const record = fromExistingPatient(patient, checkins.filter((entry) => entry.patientId === patient.id));
    return comparison(record.records, record.milestones[0].day, record.comparisonWidth ?? 5);
  }, [practice, patient, checkins]);

  // ── Timeline ────────────────────────────────────────────
  const timelineEvents = useMemo(
    () => buildPatientTimeline(patient, checkins, allAlerts),
    [patient, checkins, allAlerts]
  );

  const painTrend = useMemo(
    () => getPainTrend(checkins, patient.id),
    [checkins, patient.id]
  );

  // ── Dropout prediction ──────────────────────────────────
  const dropoutPrediction = useMemo(
    () => predictDropoutRisk(patient, checkins, allAlerts, analysis),
    [patient, checkins, allAlerts, analysis]
  );

  return (
    <div className="space-y-4">
      {/* ── Patient Header ─────────────────────────────── */}
      <div className={`rounded-xl border p-4 ${tierHeaderBg[riskTier]}`}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-clinical-card/80 flex items-center justify-center flex-shrink-0 shadow-sm">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {patient.name}
              </h2>
              {isSynthetic && <SyntheticBadge />}
              {practice && <span className="badge-neutral">Fictional practice data</span>}
              {!practice && <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${tierDot[riskTier]}`}
                />
                <span className="text-xs font-semibold text-slate-600 capitalize">
                  {riskTier} risk
                </span>
                <span className="text-xs text-clinical-muted tabular-nums">
                  ({compositeScore})
                </span>
              </div>}
            </div>
            <p className="text-sm text-clinical-muted mt-0.5">
              {patient.condition} &middot; Age {patient.age}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-clinical-muted">
              <span>{patient.trialId}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Enrolled{" "}
                {new Date(patient.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Insight chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {insightChips.map((chip, i) => (
            <InsightChip key={i} label={chip.label} variant={chip.variant} />
          ))}
        </div>
        {!isSynthetic && <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={"/patient/" + encodeURIComponent(patient.id) + "/review"} className="btn-primary inline-flex min-h-11 items-center text-sm">Visit review</Link>
          <Link href={"/patient/" + encodeURIComponent(patient.id)} className="btn-secondary inline-flex min-h-11 items-center text-sm">Full patient record</Link>
          {patient.userId && <Link href={"/messages?with=" + encodeURIComponent(patient.userId)} className="btn-secondary inline-flex min-h-11 items-center text-sm">Message patient</Link>}
        </div>}
      </div>

      {/* ── Emergency Alerts ───────────────────────────── */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
          <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4" />
            Active Alerts ({unacknowledgedAlerts.length})
          </h3>
          <div className="space-y-2">
            {unacknowledgedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  alert.severity === "critical"
                    ? "bg-red-100/60 border-red-300 alert-critical"
                    : "bg-clinical-card/60 border-red-100"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-[11px] text-clinical-muted uppercase tracking-wide">
                      {alert.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <AlertFollowUp alert={alert} checkIns={checkins} />
                </div>
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="btn-ghost text-xs ml-3 flex-shrink-0"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {practiceComparison && <section className="workspace-panel" aria-labelledby="practice-summary">
        <h3 id="practice-summary" className="section-title">What changed over 10 days</h3>
        <p className="mt-1 text-sm text-clinical-muted">Compare five days before and after the example care-plan change.</p>
        <dl className="mt-3 space-y-2 text-sm">
          {(["cough", "activity"] as const).map((metric) => {
            const before = summarize(practiceComparison.before, metric);
            const after = summarize(practiceComparison.after, metric);
            return <div key={metric} className="flex flex-wrap justify-between gap-1">
              <dt className="text-slate-700">{measures[metric].label}</dt>
              <dd className="font-medium tabular-nums text-slate-900">{before.positive}/{before.logged} → {after.positive}/{after.logged} reported days</dd>
            </div>;
          })}
        </dl>
        <p className="mt-3 text-sm text-clinical-muted">Open Visit review for missing days, the original check-ins, and follow-up questions.</p>
      </section>}
      {!practice && analysis?.summary && <section className="workspace-panel">
        <h3 className="section-title">Latest AI summary</h3>
        <p className="mt-2 break-words text-sm text-slate-700">{analysis.summary}</p>
      </section>}

      <PatientTimeline events={timelineEvents} painTrend={painTrend} />
      {!practice && <details className="workspace-panel">
      <summary className="workspace-disclosure">Analysis and risk details</summary>
      <div className="space-y-3">
      <DropoutRiskCard prediction={dropoutPrediction} />

      {/* ── AI Clinical Summary ────────────────────────── */}
      {analysis ? (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary-400" />
            AI Clinical Summary
          </h3>

          <p className="text-sm text-slate-700 leading-relaxed mb-4">
            {analysis.summary}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h4 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-2">
                Symptoms
              </h4>
              <SymptomList symptoms={analysis.symptoms} />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-1.5">
                  Dropout Risk (AI)
                </h4>
                <DropoutRiskBar risk={analysis.dropoutRisk} />
              </div>
              <div>
                <h4 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-1.5">
                  Medication Adherence
                </h4>
                <RiskBadge risk={analysis.medicationAdherenceRisk} />
              </div>
              <div>
                <h4 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-1.5">
                  Adverse Event
                </h4>
                {analysis.adverseEvent ? (
                  <span className="badge-critical flex items-center gap-1 w-fit">
                    <AlertTriangle className="w-3 h-3" />
                    Flagged
                  </span>
                ) : (
                  <span className="badge-success">None detected</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-primary-50/60 border border-primary-200">
            <h4 className="text-[11px] font-semibold text-primary-300 uppercase tracking-wide mb-1">
              Recommended Action
            </h4>
            <p className="text-sm text-primary-300 leading-relaxed">
              {analysis.recommendedAction}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No analysis yet"
            description="Submit a voice check-in to generate an AI analysis."
          />
        </div>
      )}
      </div>
      </details>}

      {!practice && <details className="workspace-panel">
      <summary className="workspace-disclosure">Simulated follow-up</summary>
      <CommunicationPanel
        scored={scored}
        checkins={checkins}
        alerts={alerts}
        dropoutPrediction={dropoutPrediction}
      />
      </details>}
    </div>
  );
}
