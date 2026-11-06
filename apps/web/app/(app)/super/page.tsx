"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { Patient, Alert, CheckIn } from "@trialpulse/types";
import { api } from "@/lib/api";
import { rankPatientsByRisk, type RiskScoredPatient } from "@/lib/risk-scoring";
import { generateSmartAlerts } from "@/lib/alert-engine";
import { computeCohortMetrics } from "@/lib/cohort-analytics";
import { predictDropoutRisk } from "@/lib/dropout-risk";
import { recordAuditEvent } from "@/lib/security/audit";
import { MOCK_DOCTORS, type Doctor } from "@/data/mock-doctors";
import { HighRiskPatientCard } from "@/components/HighRiskPatientCard";
import { SmartAlertBar } from "@/components/SmartAlertBar";
import { Skeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import {
  Shield,
  Users,
  AlertTriangle,
  Flame,
  Activity,
  TrendingUp,
  UserCheck,
  Clock,
  BarChart3,
  Stethoscope,
  Target,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Doctor data imported from shared mock ────────────────────

const statusColor = {
  active: "bg-emerald-500",
  busy: "bg-amber-500",
  offline: "bg-slate-300",
};

// ── Component ────────────────────────────────────────────────

export default function SuperDoctorPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "doctors" | "alerts" | "analytics"
  >("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, a, c] = await Promise.all([
        api.getPatients(),
        api.getUnacknowledgedAlerts(),
        api.getCheckIns(),
      ]);
      setPatients(p);
      setAlerts(a);
      setCheckins(c);
      recordAuditEvent("dashboard_accessed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll alerts every 15s
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await api.getUnacknowledgedAlerts();
        setAlerts(fresh);
      } catch {}
    }, 15_000);
    return () => clearInterval(interval);
  }, [loading]);

  // ── Derived data ──────────────────────────────────────────

  const rankedPatients = useMemo(
    () => rankPatientsByRisk(patients, checkins, alerts),
    [patients, checkins, alerts]
  );

  const smartAlerts = useMemo(
    () => generateSmartAlerts(patients, checkins, alerts),
    [patients, checkins, alerts]
  );

  const cohort = useMemo(
    () => computeCohortMetrics(patients, checkins, rankedPatients),
    [patients, checkins, rankedPatients]
  );

  const criticalCount = rankedPatients.filter(
    (r) => r.riskTier === "critical"
  ).length;
  const highRiskCount = rankedPatients.filter(
    (r) => r.riskTier === "critical" || r.riskTier === "high"
  ).length;
  const emergencyAlerts = alerts.filter(
    (a) => a.type === "emergency" && !a.acknowledged
  ).length;

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success("Alert resolved");
    } catch {
      toast.error("Failed to resolve alert");
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Lead Doctor Command Center
          </h1>
          <p className="text-xs text-clinical-muted mt-0.5">
            Global oversight &bull; All doctors &bull; All patients &bull;
            Real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live monitoring
          </span>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Total Patients"
            value={patients.length}
            accent="bg-primary-50 text-primary-400"
          />
          <StatCard
            icon={<Stethoscope className="w-4 h-4" />}
            label="Active Doctors"
            value={MOCK_DOCTORS.length}
            accent="bg-purple-50 text-purple-600"
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="High Risk"
            value={highRiskCount}
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            label="Emergencies"
            value={emergencyAlerts}
            accent="bg-red-50 text-red-600"
          />
          <StatCard
            icon={<Activity className="w-4 h-4" />}
            label="Adherence"
            value={`${Math.round(cohort.adherenceRate)}%`}
            accent="bg-emerald-50 text-emerald-600"
          />
        </div>
      )}

      {/* ── Smart Alerts ───────────────────────────────────── */}
      {!loading && smartAlerts.length > 0 && (
        <SmartAlertBar alerts={smartAlerts} onAlertClick={() => {}} />
      )}

      {/* ── Tab Bar ────────────────────────────────────────── */}
      <div className="flex border-b border-clinical-border">
        {(
          [
            { id: "overview", label: "Global Overview", icon: Shield },
            { id: "doctors", label: "Doctor Performance", icon: Stethoscope },
            { id: "alerts", label: "All Alerts", icon: AlertTriangle },
            { id: "analytics", label: "Trial Analytics", icon: BarChart3 },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === tab.id
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-clinical-muted hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────── */}
      {selectedTab === "overview" && (
        <OverviewTab
          rankedPatients={rankedPatients}
          loading={loading}
          doctors={MOCK_DOCTORS}
        />
      )}

      {selectedTab === "doctors" && (
        <DoctorPerformanceTab doctors={MOCK_DOCTORS} />
      )}

      {selectedTab === "alerts" && (
        <AlertsTab
          alerts={alerts}
          patients={patients}
          onAcknowledge={handleAcknowledge}
        />
      )}

      {selectedTab === "analytics" && (
        <AnalyticsTab cohort={cohort} rankedPatients={rankedPatients} />
      )}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="card py-3 px-3 flex items-center gap-2.5">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
          {value}
        </div>
        <div className="text-[10px] text-clinical-muted font-medium">
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({
  rankedPatients,
  loading,
  doctors,
}: {
  rankedPatients: RiskScoredPatient[];
  loading: boolean;
  doctors: Doctor[];
}) {
  const top5 = rankedPatients.slice(0, 5);

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Left: Top 5 High-Risk Patients Globally */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-red-500" />
          Highest Risk Patients (Global)
        </h3>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : top5.length === 0 ? (
            <div className="card text-center py-8 text-sm text-clinical-muted">
              No patients enrolled
            </div>
          ) : (
            top5.map((scored, i) => (
              <div key={scored.patient.id} className="relative">
                <HighRiskPatientCard
                  scoredPatient={scored}
                  rank={i + 1}
                  onClick={() => {}}
                />
                {/* Assigned doctor badge */}
                <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                  {doctors[i % doctors.length]?.name.split(" ").slice(0, 2).join(" ")}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Doctor Status Overview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
          <Stethoscope className="w-4 h-4 text-purple-500" />
          Doctor Status
        </h3>
        <div className="space-y-2">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="card flex items-center gap-3 p-3"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {doc.name}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[doc.status]}`}
                  />
                </div>
                <div className="text-[11px] text-clinical-muted">
                  {doc.specialty} &bull; {doc.patientCount} patients
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {doc.unresolvedAlerts > 0 ? (
                  <span className="text-[10px] font-bold text-red-600">
                    {doc.unresolvedAlerts} unresolved
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-600">
                    All clear
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Doctor-level alerts */}
        <h3 className="text-sm font-semibold text-slate-900 mt-5 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Doctor Alerts
        </h3>
        <div className="space-y-2">
          {doctors
            .filter((d) => d.unresolvedAlerts > 0 || d.dropoutRate > 10)
            .map((doc) => (
              <div
                key={`alert-${doc.id}`}
                className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-800"
              >
                <div className="font-semibold">{doc.name}</div>
                {doc.unresolvedAlerts > 0 && (
                  <div>
                    {doc.unresolvedAlerts} unresolved high-risk alerts
                  </div>
                )}
                {doc.dropoutRate > 10 && (
                  <div>
                    Dropout rate {doc.dropoutRate}% — above threshold
                  </div>
                )}
                {Number(doc.avgResponseTime.replace(" min", "")) > 20 && (
                  <div>
                    Avg response time {doc.avgResponseTime} — delayed
                  </div>
                )}
              </div>
            ))}
          {doctors.filter((d) => d.unresolvedAlerts > 0 || d.dropoutRate > 10)
            .length === 0 && (
            <div className="card text-center py-4 text-sm text-emerald-600 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              All doctors performing well
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Doctor Performance Tab ───────────────────────────────────

function DoctorPerformanceTab({ doctors }: { doctors: Doctor[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {doctors.map((doc) => (
          <div key={doc.id} className="card space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {doc.name}
                </div>
                <div className="text-[11px] text-clinical-muted">
                  {doc.specialty}
                </div>
              </div>
              <div
                className={`ml-auto w-2.5 h-2.5 rounded-full ${statusColor[doc.status]}`}
              />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <MetricBox
                label="Patients"
                value={String(doc.patientCount)}
                icon={<Users className="w-3 h-3" />}
              />
              <MetricBox
                label="Response Time"
                value={doc.avgResponseTime}
                icon={<Clock className="w-3 h-3" />}
                warning={
                  Number(doc.avgResponseTime.replace(" min", "")) > 20
                }
              />
              <MetricBox
                label="Unresolved"
                value={String(doc.unresolvedAlerts)}
                icon={<AlertTriangle className="w-3 h-3" />}
                warning={doc.unresolvedAlerts > 2}
              />
              <MetricBox
                label="Dropout Rate"
                value={`${doc.dropoutRate}%`}
                icon={<TrendingUp className="w-3 h-3" />}
                warning={doc.dropoutRate > 10}
              />
            </div>

            {/* Score bar */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-clinical-muted">Performance Score</span>
                <span className="font-bold text-slate-700">
                  {Math.max(0, Math.min(100, Math.round(
                    100 -
                      doc.dropoutRate * 2 -
                      doc.unresolvedAlerts * 5 -
                      (Number(doc.avgResponseTime.replace(" min", "")) > 20
                        ? 15
                        : 0)
                  )))}
                  %
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    doc.dropoutRate > 10
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, Math.round(100 - doc.dropoutRate * 2 - doc.unresolvedAlerts * 5)))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  icon,
  warning = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={`p-2 rounded-lg border text-center ${
        warning
          ? "bg-red-50 border-red-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div
        className={`text-sm font-bold tabular-nums ${
          warning ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="flex items-center justify-center gap-1 text-[9px] text-clinical-muted mt-0.5">
        {icon}
        {label}
      </div>
    </div>
  );
}

// ── Alerts Tab ───────────────────────────────────────────────

function AlertsTab({
  alerts,
  patients,
  onAcknowledge,
}: {
  alerts: Alert[];
  patients: Patient[];
  onAcknowledge: (id: string) => void;
}) {
  const getPatientName = (id: string) =>
    patients.find((p) => p.id === id)?.name ?? "Unknown";

  const sortedAlerts = [...alerts].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const severityStyle: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-amber-100 text-amber-700 border-amber-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="space-y-2">
      {sortedAlerts.length === 0 ? (
        <div className="card text-center py-12 text-sm text-emerald-600 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          No unresolved alerts across the system
        </div>
      ) : (
        sortedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              alert.type === "emergency"
                ? "bg-red-50 border-red-300"
                : "bg-clinical-card border-slate-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-900">
                  {getPatientName(alert.patientId)}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    severityStyle[alert.severity] ?? severityStyle.low
                  }`}
                >
                  {alert.severity}
                </span>
                <span className="text-[10px] text-clinical-muted">
                  {alert.type.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">
                {alert.message}
              </p>
              <div className="text-[9px] text-clinical-muted mt-1">
                {new Date(alert.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold transition-colors"
            >
              Resolve
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────

function AnalyticsTab({
  cohort,
  rankedPatients,
}: {
  cohort: ReturnType<typeof computeCohortMetrics>;
  rankedPatients: RiskScoredPatient[];
}) {
  const riskDist = {
    critical: rankedPatients.filter((r) => r.riskTier === "critical").length,
    high: rankedPatients.filter((r) => r.riskTier === "high").length,
    medium: rankedPatients.filter((r) => r.riskTier === "medium").length,
    low: rankedPatients.filter((r) => r.riskTier === "low").length,
  };
  const total = rankedPatients.length || 1;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Cohort Stats */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Trial Cohort Metrics
        </h3>
        <div className="space-y-2">
          <CohortRow
            label="Adherence Rate"
            value={`${Math.round(cohort.adherenceRate)}%`}
            color="text-emerald-600"
          />
          <CohortRow
            label="Avg Pain Level"
            value={cohort.averagePainLevel.toFixed(1)}
            color="text-amber-600"
          />
          <CohortRow
            label="Avg Dropout Risk"
            value={`${Math.round(cohort.averageDropoutRisk * 100)}%`}
            color="text-red-600"
          />
          <CohortRow
            label="Engagement Rate"
            value={`${Math.round(cohort.engagementStats.participationRate)}%`}
            color="text-blue-600"
          />
          <CohortRow
            label="Total Check-ins"
            value={String(cohort.engagementStats.totalCheckins)}
            color="text-purple-600"
          />
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Risk Distribution
        </h3>
        <div className="space-y-2.5">
          {(
            [
              { tier: "critical", color: "bg-red-500", label: "Critical" },
              { tier: "high", color: "bg-amber-500", label: "High" },
              { tier: "medium", color: "bg-blue-400", label: "Medium" },
              { tier: "low", color: "bg-emerald-500", label: "Low" },
            ] as const
          ).map(({ tier, color, label }) => (
            <div key={tier}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold text-slate-800">
                  {riskDist[tier]}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{
                    width: `${(riskDist[tier] / total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Symptoms */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Top Symptoms (Trial-wide)
        </h3>
        <div className="space-y-2">
          {cohort.topSymptoms.slice(0, 6).map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-700 font-medium capitalize">
                    {s.name}
                  </span>
                  <span className="text-clinical-muted">
                    {s.count} reports
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s.avgSeverity >= 7
                        ? "bg-red-400"
                        : s.avgSeverity >= 4
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    }`}
                    style={{
                      width: `${(s.avgSeverity / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {cohort.topSymptoms.length === 0 && (
            <div className="text-sm text-clinical-muted text-center py-4">
              No symptom data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CohortRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[12px] text-slate-600">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}
