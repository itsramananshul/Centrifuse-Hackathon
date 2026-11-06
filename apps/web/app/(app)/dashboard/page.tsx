"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type {
  Patient,
  Alert,
  AnalyticsSummary,
  CheckIn,
} from "@trialpulse/types";
import { api } from "@/lib/api";
import { rankPatientsByRisk, type RiskScoredPatient } from "@/lib/risk-scoring";
import { generateSmartAlerts } from "@/lib/alert-engine";
import { computeCohortMetrics } from "@/lib/cohort-analytics";
import { generateSyntheticData, type SyntheticData } from "@/lib/simulation/scenarios";
import { recordAuditEvent } from "@/lib/security/audit";
import {
  PatientDetailPanel,
  PatientDetailEmpty,
} from "@/components/PatientDetailPanel";
import { SmartAlertBar } from "@/components/SmartAlertBar";
import { CohortInsightsPanel } from "@/components/CohortInsightsPanel";
import { SimulationPanel, SyntheticBadge } from "@/components/SimulationPanel";
import { OptimizationPanel } from "@/components/OptimizationPanel";
import {
  profilePatient,
  getProfileDistribution,
  analyzeInterventionPatterns,
} from "@/lib/optimization/patient-profiles";
import { predictDropoutRisk } from "@/lib/dropout-risk";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
import {
  Users,
  AlertTriangle,
  Flame,
  Mic,
  Link2,
  UserPlus,
  X,
  Loader2,
  Activity,
  User,
  BarChart3,
  FlaskConical,
  Lock,
  Target,
  Mail,
} from "lucide-react";

// ── Kanban column config ─────────────────────────────────────

const KANBAN_COLUMNS = [
  {
    tier: "low" as const,
    label: "Stable",
    color: "bg-emerald-500",
    headerBg: "bg-emerald-50 border-emerald-200",
    cardBorder: "border-emerald-200 hover:border-emerald-400",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-700",
  },
  {
    tier: "medium" as const,
    label: "Moderate",
    color: "bg-blue-500",
    headerBg: "bg-blue-50 border-blue-200",
    cardBorder: "border-blue-200 hover:border-blue-400",
    dotColor: "bg-blue-500",
    textColor: "text-blue-700",
  },
  {
    tier: "high" as const,
    label: "High Risk",
    color: "bg-amber-500",
    headerBg: "bg-amber-50 border-amber-200",
    cardBorder: "border-amber-200 hover:border-amber-400",
    dotColor: "bg-amber-500",
    textColor: "text-amber-700",
  },
  {
    tier: "critical" as const,
    label: "Critical",
    color: "bg-red-500",
    headerBg: "bg-red-50 border-red-200",
    cardBorder: "border-red-200 hover:border-red-400",
    dotColor: "bg-red-500",
    textColor: "text-red-700",
  },
];

type RightPanelView = "patient" | "cohort" | "simulation" | "optimization";

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanelView>("patient");
  const [showLinkPatient, setShowLinkPatient] = useState(false);
  const [linkingPatient, setLinkingPatient] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");


  // ── Slide-over panel ────────────────────────────────────────
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // ── Simulation state ────────────────────────────────────────
  const [syntheticData, setSyntheticData] = useState<SyntheticData | null>(null);
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);

  // ── Data loading ────────────────────────────────────────────

  const handleLinkPatient = async () => {
    if (!patientEmail.trim()) {
      toast.error("Please enter a patient email");
      return;
    }
    setLinkingPatient(true);
    try {
      const res = await fetch("/api/patients/link-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientEmail: patientEmail.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Linked to ${json.data.patientName || patientEmail}`);
        setShowLinkPatient(false);
        setPatientEmail("");
        load();
      } else {
        toast.error(json.message || "Failed to link patient");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link patient");
    } finally {
      setLinkingPatient(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, a, c, s] = await Promise.all([
        api.getPatients(),
        api.getUnacknowledgedAlerts(),
        api.getCheckIns(),
        api.getAnalyticsSummary(),
      ]);
      setPatients(p);
      setAlerts(a);
      setCheckins(c);
      setSummary(s);
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

  // Poll for new alerts every 15s
  useEffect(() => {
    if (loading) return;
    const alertInterval = setInterval(async () => {
      try {
        const freshAlerts = await api.getUnacknowledgedAlerts();
        setAlerts(freshAlerts);
      } catch {
        // Silent fail
      }
    }, 15_000);

    const fullInterval = setInterval(async () => {
      try {
        const [p, c] = await Promise.all([
          api.getPatients(),
          api.getCheckIns(),
        ]);
        setPatients(p);
        setCheckins(c);
      } catch {
        // Silent fail
      }
    }, 60_000);

    return () => {
      clearInterval(alertInterval);
      clearInterval(fullInterval);
    };
  }, [loading]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      recordAuditEvent("alert_acknowledged", { metadata: { alertId } });
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  // ── Merge real + synthetic data ─────────────────────────────

  const mergedPatients = useMemo(() => {
    if (!syntheticData) return patients;
    return [...patients, ...syntheticData.patients];
  }, [patients, syntheticData]);

  const mergedCheckins = useMemo(() => {
    if (!syntheticData) return checkins;
    return [...checkins, ...syntheticData.checkins];
  }, [checkins, syntheticData]);

  const mergedAlerts = useMemo(() => {
    if (!syntheticData) return alerts;
    return [...alerts, ...syntheticData.alerts];
  }, [alerts, syntheticData]);

  const syntheticPatientIds = useMemo(
    () => new Set(syntheticData?.patients.map((p) => p.id) ?? []),
    [syntheticData]
  );

  // ── Risk scoring ────────────────────────────────────────────

  const rankedPatients = useMemo(
    () => rankPatientsByRisk(mergedPatients, mergedCheckins, mergedAlerts),
    [mergedPatients, mergedCheckins, mergedAlerts]
  );

  const highRiskCount = rankedPatients.filter(
    (r) => r.riskTier === "critical" || r.riskTier === "high"
  ).length;

  const emergencyCount = rankedPatients.filter(
    (r) => r.riskTier === "critical"
  ).length;

  const checkinsToday = mergedCheckins.filter((c) => {
    const d = new Date(c.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  // ── Smart alerts ────────────────────────────────────────────

  const smartAlerts = useMemo(
    () => generateSmartAlerts(mergedPatients, mergedCheckins, mergedAlerts),
    [mergedPatients, mergedCheckins, mergedAlerts]
  );

  // ── Cohort metrics ──────────────────────────────────────────

  const cohortMetrics = useMemo(
    () => computeCohortMetrics(mergedPatients, mergedCheckins, rankedPatients),
    [mergedPatients, mergedCheckins, rankedPatients]
  );

  // ── Patient profiles (optimization) ─────────────────────────

  const patientProfiles = useMemo(() => {
    return rankedPatients.map((scored) => {
      const dp = predictDropoutRisk(scored.patient, mergedCheckins, mergedAlerts, scored.analysis);
      return profilePatient(scored, mergedCheckins, mergedAlerts, dp);
    });
  }, [rankedPatients, mergedCheckins, mergedAlerts]);

  const profileDistribution = useMemo(
    () => getProfileDistribution(patientProfiles),
    [patientProfiles]
  );

  const interventionInsights = useMemo(
    () => analyzeInterventionPatterns(patientProfiles),
    [patientProfiles]
  );

  // ── Group patients by Kanban tier ───────────────────────────

  const patientsByTier = useMemo(() => {
    const grouped: Record<string, RiskScoredPatient[]> = {
      low: [],
      medium: [],
      high: [],
      critical: [],
    };
    for (const scored of rankedPatients) {
      grouped[scored.riskTier]?.push(scored);
    }
    return grouped;
  }, [rankedPatients]);

  // ── Auto-select first patient ───────────────────────────────

  useEffect(() => {
    if (!loading && rankedPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(rankedPatients[0].patient.id);
    }
  }, [loading, rankedPatients, selectedPatientId]);

  const selectedScored = rankedPatients.find(
    (r) => r.patient.id === selectedPatientId
  );

  // ── Handlers ────────────────────────────────────────────────

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setRightPanel("patient");
    setSlideOverOpen(true);
    recordAuditEvent("patient_record_viewed", { patientId });
  };

  const handleGenerateSimulation = (scenarioIds: string[]) => {
    const data = generateSyntheticData(scenarioIds);
    setSyntheticData(data);
    setActiveScenarios(scenarioIds);
    setSelectedPatientId(null);
    recordAuditEvent("simulation_generated", {
      metadata: { scenarios: scenarioIds.length },
    });
    toast.success(`${data.patients.length} synthetic patients generated`);
  };

  const handleResetSimulation = () => {
    setSyntheticData(null);
    setActiveScenarios([]);
    setSelectedPatientId(null);
    recordAuditEvent("simulation_cleared");
    toast.success("Simulation data cleared");
  };

  // ── Error state ─────────────────────────────────────────────

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] flex flex-col">
      {/* ── Top Bar ──────────────────────────────────────── */}
      <div className="flex-shrink-0 mb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              High-Risk Patient Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-clinical-muted">
                AI-powered patient risk monitoring &amp; triage
              </p>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <Lock className="w-2.5 h-2.5" />
                Authorized access
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syntheticData && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-semibold text-purple-700">
                <FlaskConical className="w-3 h-3" />
                Simulation active
              </span>
            )}
            <button
              onClick={() => setShowLinkPatient(true)}
              className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
            >
              <Link2 className="w-3.5 h-3.5" />
              Link Patient
            </button>
            <Link
              href="/checkin"
              className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
            >
              <Mic className="w-3.5 h-3.5" />
              New Check-in
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        {loading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card py-2.5 px-3 flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <MiniStatCard
              icon={<Users className="w-4 h-4" />}
              label="Monitored"
              value={mergedPatients.length}
              accent="bg-primary-50 text-primary-400"
            />
            <MiniStatCard
              icon={<AlertTriangle className="w-4 h-4" />}
              label="High Risk"
              value={highRiskCount}
              accent="bg-amber-50 text-amber-600"
            />
            <MiniStatCard
              icon={<Flame className="w-4 h-4" />}
              label="Emergencies"
              value={emergencyCount}
              accent="bg-red-50 text-red-600"
            />
            <MiniStatCard
              icon={<Activity className="w-4 h-4" />}
              label="Check-ins Today"
              value={checkinsToday}
              accent="bg-emerald-50 text-emerald-600"
            />
          </div>
        )}
      </div>

      {/* ── Smart Alerts Bar ─────────────────────────────── */}
      {!loading && smartAlerts.length > 0 && (
        <div className="flex-shrink-0 mb-3">
          <SmartAlertBar
            alerts={smartAlerts}
            onAlertClick={handleSelectPatient}
          />
        </div>
      )}

      {/* ── Color Legend ──────────────────────────────────── */}
      {!loading && (
        <div className="flex-shrink-0 flex items-center gap-4 mb-3 px-1">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.tier} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
              <span className="text-[11px] font-medium text-slate-600">
                {col.label} ({patientsByTier[col.tier]?.length || 0})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Kanban Columns ───────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => {
          const colPatients = patientsByTier[col.tier] || [];
          return (
            <div
              key={col.tier}
              className="flex-1 min-w-[240px] flex flex-col min-h-0"
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-t-xl border ${col.headerBg}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className={`text-xs font-semibold ${col.textColor}`}>
                    {col.label}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-clinical-card/60 px-1.5 py-0.5 rounded-full">
                  {colPatients.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 border-x border-b border-slate-200 rounded-b-xl p-2 space-y-2">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="card py-3 px-3 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))
                ) : colPatients.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-clinical-muted">
                    No patients
                  </div>
                ) : (
                  colPatients.map((scored) => (
                    <KanbanCard
                      key={scored.patient.id}
                      scored={scored}
                      isSelected={scored.patient.id === selectedPatientId}
                      isSynthetic={syntheticPatientIds.has(scored.patient.id)}
                      col={col}
                      onClick={() => handleSelectPatient(scored.patient.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Slide-over Detail Panel ──────────────────────── */}
      {slideOverOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSlideOverOpen(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-clinical-card border-l border-clinical-border shadow-2xl z-50 flex flex-col">
            {/* Tab bar */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-clinical-border px-4">
              <div className="flex">
                <button
                  onClick={() => setRightPanel("patient")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    rightPanel === "patient"
                      ? "border-primary-600 text-primary-300"
                      : "border-transparent text-clinical-muted hover:text-slate-700"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Patient Detail
                </button>
                <button
                  onClick={() => {
                    setRightPanel("cohort");
                    recordAuditEvent("cohort_insights_viewed");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    rightPanel === "cohort"
                      ? "border-primary-600 text-primary-300"
                      : "border-transparent text-clinical-muted hover:text-slate-700"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Cohort
                </button>
                <button
                  onClick={() => setRightPanel("simulation")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    rightPanel === "simulation"
                      ? "border-purple-600 text-purple-700"
                      : "border-transparent text-clinical-muted hover:text-slate-700"
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  Simulation
                </button>
                <button
                  onClick={() => setRightPanel("optimization")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    rightPanel === "optimization"
                      ? "border-primary-600 text-primary-300"
                      : "border-transparent text-clinical-muted hover:text-slate-700"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Optimization
                </button>
              </div>
              <button
                onClick={() => setSlideOverOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-5">
              {rightPanel === "optimization" ? (
                loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-40" />
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                      ))}
                    </div>
                    <Skeleton className="h-40 rounded-lg" />
                  </div>
                ) : (
                  <OptimizationPanel
                    profiles={patientProfiles}
                    distribution={profileDistribution}
                    interventionInsights={interventionInsights}
                    onSelectPatient={handleSelectPatient}
                  />
                )
              ) : rightPanel === "simulation" ? (
                <SimulationPanel
                  activeScenarios={activeScenarios}
                  onGenerate={handleGenerateSimulation}
                  onReset={handleResetSimulation}
                  isSimulationActive={!!syntheticData}
                />
              ) : rightPanel === "cohort" ? (
                loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-40" />
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-lg" />
                      ))}
                    </div>
                    <Skeleton className="h-32 rounded-lg" />
                  </div>
                ) : (
                  <CohortInsightsPanel metrics={cohortMetrics} />
                )
              ) : loading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-40 w-full rounded-lg" />
                </div>
              ) : !selectedScored ? (
                <PatientDetailEmpty />
              ) : (
                <PatientDetailPanel
                  scored={selectedScored}
                  checkins={mergedCheckins}
                  allAlerts={mergedAlerts}
                  onAcknowledge={handleAcknowledge}
                  isSynthetic={syntheticPatientIds.has(selectedScored.patient.id)}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Link Patient Modal ─────────────────────────────── */}
      {showLinkPatient && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-clinical-card rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Link Patient
              </h2>
              <button
                onClick={() => setShowLinkPatient(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-clinical-muted mb-4">
              Enter the email of a patient who has already signed up. They will be linked to your account.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLinkPatient()}
                    className="input pl-10"
                    placeholder="patient@example.com"
                  />
                </div>
              </div>
              <button
                onClick={handleLinkPatient}
                disabled={linkingPatient}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {linkingPatient ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {linkingPatient ? "Linking..." : "Link Patient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kanban Patient Card ──────────────────────────────────────

function KanbanCard({
  scored,
  isSelected,
  isSynthetic,
  col,
  onClick,
}: {
  scored: RiskScoredPatient;
  isSelected: boolean;
  isSynthetic: boolean;
  col: (typeof KANBAN_COLUMNS)[number];
  onClick: () => void;
}) {
  const { patient, compositeScore, insightChips, analysis } = scored;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border-2 bg-clinical-card transition-all duration-150 cursor-pointer ${
        isSelected
          ? `${col.cardBorder} ring-2 ring-offset-1 ring-${col.tier === "critical" ? "red" : col.tier === "high" ? "amber" : col.tier === "medium" ? "blue" : "emerald"}-300`
          : `${col.cardBorder}`
      }`}
    >
      {/* Name + score */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {patient.name}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
          {compositeScore}
        </span>
      </div>

      {/* Condition + age */}
      <div className="text-[11px] text-clinical-muted ml-9 mb-1.5">
        {patient.condition} &middot; Age {patient.age}
      </div>

      {/* Insight chips (max 2) */}
      {insightChips.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-9">
          {insightChips.slice(0, 2).map((chip, i) => (
            <span
              key={i}
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                chip.variant === "critical"
                  ? "bg-red-100 text-red-700"
                  : chip.variant === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {chip.label}
            </span>
          ))}
          {isSynthetic && <SyntheticBadge />}
        </div>
      )}
    </button>
  );
}

// ── Mini Stat Card ───────────────────────────────────────────

function MiniStatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card py-2.5 px-3 flex items-center gap-2.5">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
          {value}
        </div>
        <div className="text-[11px] text-clinical-muted font-medium leading-tight">
          {label}
        </div>
      </div>
    </div>
  );
}
