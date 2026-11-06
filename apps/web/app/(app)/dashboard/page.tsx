"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type {
  Patient,
  Alert,
  CheckIn,
} from "@trialpulse/types";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { checkInObservationDate } from "@/lib/home-tracker";
import { fromExistingPatient, isPracticePatient, shiftDay } from "@/lib/visit-review";
import { rankPatientsByRisk, type RiskScoredPatient } from "@/lib/risk-scoring";
import { generateSmartAlerts } from "@/lib/alert-engine";
import { computeCohortMetrics } from "@/lib/cohort-analytics";
import { generateSyntheticData, type SyntheticData } from "@/lib/simulation/scenarios";
import { recordAuditEvent } from "@/lib/security/audit";
import { SmartAlertBar } from "@/components/SmartAlertBar";
import { DashboardHomeReviewQueue } from "@/components/HomeReviewQueue";
import { DashboardOverview, overviewPanel } from "@/components/DashboardOverview";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import { SimulationPanel, SyntheticBadge } from "@/components/SimulationPanel";
import {
  profilePatient,
  getProfileDistribution,
  analyzeInterventionPatterns,
} from "@/lib/optimization/patient-profiles";
import { predictDropoutRisk } from "@/lib/dropout-risk";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
import {
  Mic,
  Link2,
  Loader2,
  User,
  FlaskConical,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  SlidersHorizontal,
  UserRound,
  Mail,
  Search,
} from "lucide-react";

const PatientDetailPanel = dynamic(() => import("@/components/PatientDetailPanel").then((module) => module.PatientDetailPanel), {
  loading: () => <p className="p-4 text-sm text-clinical-muted" role="status">Loading patient details…</p>,
});
const PatientSnapshot = dynamic(() => import("@/components/PatientSnapshot").then((module) => module.PatientSnapshot), {
  loading: () => <p className="p-2 text-sm text-clinical-muted" role="status">Loading patient snapshot…</p>,
});
const CohortInsightsPanel = dynamic(() => import("@/components/CohortInsightsPanel").then((module) => module.CohortInsightsPanel));
const OptimizationPanel = dynamic(() => import("@/components/OptimizationPanel").then((module) => module.OptimizationPanel));

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

type RightPanelView = "patient" | "cohort" | "simulation" | "optimization" | "review";
const panelTitle: Record<RightPanelView, string> = {
  patient: "Patient details",
  cohort: "Cohort insights",
  simulation: "Simulation",
  optimization: "Optimization",
  review: "Review and risk tools",
};

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const acknowledgedIds = useRef(new Set<string>());
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanelView>("patient");
  const [showLinkPatient, setShowLinkPatient] = useState(false);
  const [linkingPatient, setLinkingPatient] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");
  const [search, setSearch] = useState("");
  const [queueTier, setQueueTier] = useState<"all" | "review" | "critical" | "high">("all");
  const [wide, setWide] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const notifications = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    void createClient().auth.getSession().then(({ data }) => {
      const name = data.session?.user.user_metadata?.full_name;
      if (typeof name === "string") setDisplayName(name.trim());
    });
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const [queueLimit, setQueueLimit] = useState(5);


  // ── Slide-over panel ────────────────────────────────────────
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // ── Simulation state ────────────────────────────────────────
  const [syntheticData, setSyntheticData] = useState<SyntheticData | null>(null);
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);

  // ── Data loading ────────────────────────────────────────────
  const applyAlerts = useCallback((incoming: Alert[]) => {
    setAlerts(incoming.filter((alert) => !acknowledgedIds.current.has(alert.id)));
  }, []);

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
      const snapshot = await api.getDashboard();
      setPatients(snapshot.patients);
      applyAlerts(snapshot.alerts);
      setCheckins(snapshot.checkIns);
      recordAuditEvent("dashboard_accessed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [applyAlerts]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const section = window.location.hash.slice(1);
    if (section === "advanced-tools" || section === "patient-roster") document.getElementById(section)?.scrollIntoView();
  }, [loading]);

  // Refresh alerts every 15 seconds and the roster every fourth refresh.
  useEffect(() => {
    if (loading) return;
    let active = true;
    let ticks = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        ticks += 1;
        if (ticks % 4 === 0) {
          const snapshot = await api.getDashboard();
          if (active) {
            setPatients(snapshot.patients);
            setCheckins(snapshot.checkIns);
            applyAlerts(snapshot.alerts);
          }
        } else {
          const freshAlerts = await api.getDashboardAlerts();
          if (active) applyAlerts(freshAlerts);
        }
      } catch {
        // Silent fail
      } finally {
        if (active) timer = setTimeout(refresh, 15_000);
      }
    }
    timer = setTimeout(refresh, 15_000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loading, applyAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      acknowledgedIds.current.add(alertId);
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


  const overviewRecords = useMemo(() => {
    const patientIds = new Set(mergedPatients.map((patient) => patient.id));
    return {
      checkIns: mergedCheckins.filter((entry) => patientIds.has(entry.patientId)),
      alerts: mergedAlerts.filter((alert) => patientIds.has(alert.patientId)),
    };
  }, [mergedPatients, mergedCheckins, mergedAlerts]);

  const checkinsToday = overviewRecords.checkIns.filter((c) => {
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
    () => slideOverOpen && rightPanel === "cohort" ? computeCohortMetrics(mergedPatients, mergedCheckins, rankedPatients) : null,
    [mergedPatients, mergedCheckins, rankedPatients, rightPanel, slideOverOpen]
  );

  // ── Patient profiles (optimization) ─────────────────────────

  const patientProfiles = useMemo(() => {
    if (!slideOverOpen || rightPanel !== "optimization") return [];
    return rankedPatients.map((scored) => {
      const dp = predictDropoutRisk(scored.patient, mergedCheckins, mergedAlerts, scored.analysis);
      return profilePatient(scored, mergedCheckins, mergedAlerts, dp);
    });
  }, [rankedPatients, mergedCheckins, mergedAlerts, rightPanel, slideOverOpen]);

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

  const selectedScored = rankedPatients.find(({ patient }) => patient.id === selectedPatientId)
    ?? rankedPatients.find(({ patient }) => isPracticePatient(patient))
    ?? rankedPatients[0];

  const queue = useMemo(() => {
    const checkedIn = new Map<string, Set<string>>();
    for (const entry of mergedCheckins) {
      const dates = checkedIn.get(entry.patientId) ?? new Set<string>();
      dates.add(checkInObservationDate(entry));
      checkedIn.set(entry.patientId, dates);
    }
    return rankedPatients.map((row) => {
      const { patient, alerts, riskTier } = row;
      const open = alerts.filter((alert) => !alert.acknowledged);
      if (open.some(({ severity }) => severity === "critical")) return { row, needsReview: true, reason: "Critical alert open" };
      if (open.length) return { row, needsReview: true, reason: open.length + (open.length === 1 ? " open alert" : " open alerts") };
      if (riskTier === "critical" || riskTier === "high") return { row, needsReview: true, reason: "High dashboard risk" };
      const dates = checkedIn.get(patient.id);
      if (isPracticePatient(patient)) {
        const record = fromExistingPatient(patient, []);
        const anchor = record.milestones[0].day;
        const width = record.comparisonWidth ?? 5;
        const missing = Array.from({ length: width }, (_, offset) => shiftDay(anchor, offset))
          .filter((day) => !dates?.has(day)).length;
        if (missing) return { row, needsReview: true, reason: missing + (missing === 1 ? " missing check-in" : " missing check-ins") };
      }
      return { row, needsReview: false, reason: dates?.size ? "Check-ins available" : "No check-ins recorded" };
    }).sort((left, right) => Number(right.needsReview) - Number(left.needsReview));
  }, [mergedCheckins, rankedPatients]);
  const reviewCount = queue.filter(({ needsReview }) => needsReview).length;
  const searchText = search.trim().toLowerCase();
  const visibleQueue = queue.filter(({ row: { patient, riskTier }, needsReview }) =>
    (queueTier === "all" || (queueTier === "review" ? needsReview : riskTier === queueTier)) &&
    (patient.name + " " + patient.condition).toLowerCase().includes(searchText)
  );

  const closeSnapshot = () => {
    setSnapshotOpen(false);
    setSlideOverOpen(false);
    if (wide) requestAnimationFrame(() => {
      const row = selectedScored && document.getElementById("patient-row-" + selectedScored.patient.id);
      (row || searchInput.current)?.focus();
    });
  };
  const showInlineSnapshot = wide && snapshotOpen && !!selectedScored && !loading;

  const snapshot = (onClose?: () => void) => selectedScored && <PatientSnapshot
    key={selectedScored.patient.id}
    patient={selectedScored.patient}
    checkIns={mergedCheckins}
    simulated={syntheticPatientIds.has(selectedScored.patient.id)}
    onClose={onClose}
    alertCount={selectedScored.alerts.filter((alert) => !alert.acknowledged).length}
    details={<PatientDetailPanel
      scored={selectedScored}
      checkins={mergedCheckins}
      allAlerts={mergedAlerts}
      onAcknowledge={handleAcknowledge}
      isSynthetic={syntheticPatientIds.has(selectedScored.patient.id)}
    />}
  />;

  // ── Handlers ────────────────────────────────────────────────

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSnapshotOpen(true);
    setRightPanel("patient");
    setSlideOverOpen(true);
    recordAuditEvent("patient_record_viewed", { patientId });
  };

  const openTool = (view: Exclude<RightPanelView, "patient">) => {
    setRightPanel(view);
    setSlideOverOpen(true);
    if (view === "cohort") recordAuditEvent("cohort_insights_viewed");
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 px-0.5">
        <div className="min-w-0">
          <p suppressHydrationWarning className="text-[11px] font-semibold uppercase tracking-[0.19em] text-primary-700">
            {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
          </p>
          <h1 className="mt-1 break-words text-[clamp(1.75rem,2.8vw,2.4rem)] leading-tight tracking-tight">
            {displayName ? "Good " + (new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening") + ", " + displayName + "." : "Clinical overview"}
          </h1>
          <p className="mt-1 text-sm text-clinical-muted">{loading ? "Loading your workspace…" : mergedPatients.length + (mergedPatients.length === 1 ? " patient in your care" : " patients in your care")}</p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search patients</span>
            <Search size={17} className="pointer-events-none absolute left-1 top-3 text-primary-700" aria-hidden="true" />
            <input ref={searchInput} type="search" name="patient-search" className="min-h-11 w-full border-b border-clinical-border bg-transparent pl-7 pr-2 text-base placeholder:text-slate-500 focus:border-primary-400 sm:w-[clamp(11rem,24vw,22rem)]"
              value={search} placeholder="Search patients" onChange={(event) => { setSearch(event.target.value); setQueueLimit(5); }} />
          </label>
          <button type="button" popoverTarget="dashboard-notifications" aria-label={"Notifications" + (smartAlerts.length ? " (" + smartAlerts.length + ")" : "")}
            className="btn-ghost relative grid size-10 shrink-0 place-items-center !p-0">
            <Bell size={18} aria-hidden="true" />
            {smartAlerts.length > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-clinical-danger-action px-0.5 text-[10px] font-semibold text-white" aria-hidden="true">{smartAlerts.length}</span>}
          </button>
          <div id="dashboard-notifications" ref={notifications} popover="auto" aria-label="Notifications"
            className="workspace-panel fixed inset-auto right-3 top-16 m-0 max-h-[calc(100dvh-5rem)] w-[min(25rem,calc(100%-1.5rem))] overflow-auto shadow-xl sm:right-6">
            <h2 className="mb-2 text-xl tracking-tight">Notifications</h2>
            {smartAlerts.length ? <SmartAlertBar stacked alerts={smartAlerts} onAlertClick={(patientId) => {
              notifications.current?.hidePopover();
              handleSelectPatient(patientId);
            }} /> : <p className="text-sm text-clinical-muted">No smart alerts to review.</p>}
          </div>
          <Link href="/settings" aria-label="Profile settings" className="initials-badge">
            <UserRound size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {loading ? <div className="grid gap-4 sm:grid-cols-2" aria-label="Loading dashboard">
        <Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" />
      </div> : <div className={"grid min-w-0 items-start gap-4 xl:gap-5 " + (showInlineSnapshot ? "xl:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]" : "")}>
        <DashboardOverview patients={mergedPatients} checkIns={overviewRecords.checkIns} alerts={overviewRecords.alerts} queue={
          <section id="patient-roster" className="scroll-mt-5 px-1" aria-labelledby="priority-queue-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="priority-queue-title" className="flex flex-wrap items-center gap-2 text-[clamp(1.35rem,2.15vw,1.8rem)] tracking-tight">
                Patients to review <span className="rounded-full bg-primary-100 px-2 py-0.5 font-sans text-xs font-semibold tabular-nums text-primary-700">{reviewCount}</span>
              </h2>
              <button type="button" onClick={() => { setQueueTier("all"); setQueueLimit(mergedPatients.length); }}
                className="btn-ghost inline-flex min-h-10 items-center gap-1 text-sm">View all <ArrowUpRight size={15} aria-hidden="true" /></button>
            </div>
            <div className="my-2 flex flex-wrap gap-1" aria-label="Filter patients">
              {([{ value: "all", label: "All patients" }, { value: "review", label: "Needs review" }, { value: "critical", label: "Critical" }, { value: "high", label: "High risk" }] as const).map(({ value, label }) =>
                <button key={value} type="button" aria-pressed={queueTier === value} onClick={() => { setQueueTier(value); setQueueLimit(5); }}
                  className={"min-h-9 rounded-lg px-2.5 text-xs sm:min-h-8 " + (queueTier === value ? "bg-primary-100 font-semibold text-primary-700" : "text-slate-600 hover:bg-slate-100")}>{label}</button>
              )}
            </div>
            <ul className="divide-y divide-clinical-border">
              {visibleQueue.slice(0, queueLimit).map(({ row, reason, needsReview }) => {
                const { patient } = row;
                const selected = (showInlineSnapshot || (slideOverOpen && rightPanel === "patient")) && selectedScored?.patient.id === patient.id;
                const demo = isPracticePatient(patient) || syntheticPatientIds.has(patient.id);
                const name = demo ? patient.name.replace(/\s+\(Demo\)$/, "") : patient.name;
                return <li key={patient.id}>
                  <button type="button" id={"patient-row-" + patient.id} aria-pressed={selected} onClick={() => handleSelectPatient(patient.id)}
                    className={"grid min-h-[3.5rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-l-2 px-2 py-2 text-left sm:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] " +
                      (selected ? "rounded-xl border-primary-500 bg-primary-50" : "border-transparent hover:rounded-xl hover:bg-slate-50")}>
                    <span className="initials-badge col-start-1 row-span-2 row-start-1 sm:row-span-1" aria-hidden="true">{name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</span>
                    <span className="col-start-2 row-start-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 break-words font-[family-name:var(--display-font)] text-[clamp(1rem,1.35vw,1.2rem)] text-slate-900">{name}{demo && <span className="practice-badge font-sans">Demo</span>}</span>
                      <span className="block break-words text-xs text-clinical-muted">{patient.condition}</span>
                    </span>
                    <span className={"col-start-2 row-start-2 min-w-0 break-words text-xs sm:col-start-3 sm:row-start-1 sm:text-sm " + (needsReview ? "font-medium text-primary-700" : "text-slate-600")}>{reason}</span>
                    <ArrowRight size={16} className="col-start-3 row-start-1 shrink-0 text-primary-700 sm:col-start-4" aria-hidden="true" />
                  </button>
                </li>;
              })}
            </ul>
            {!visibleQueue.length && <p className="mt-3 text-sm text-clinical-muted">No patients match this view.</p>}
            {visibleQueue.length > queueLimit && <button type="button" className="btn-secondary mt-3 min-h-10 text-sm" onClick={() => setQueueLimit((count) => count + 5)}>Show more patients</button>}
          </section>
        } />
        {showInlineSnapshot && <aside className="patient-snapshot">{snapshot(closeSnapshot)}</aside>}
      </div>}

      {!loading && <section id="advanced-tools" className={overviewPanel + " scroll-mt-5"} aria-labelledby="advanced-tools-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="advanced-tools-title" className="text-xl tracking-tight">Advanced tools</h2>
            <p className="mt-0.5 text-xs text-clinical-muted">{checkinsToday} check-ins today · {highRiskCount} high or critical</p>
          </div>
          {syntheticData && <span className="practice-badge">Simulation active</span>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {([
            { view: "simulation", icon: FlaskConical, description: "Try sample scenarios" },
            { view: "cohort", icon: ChartNoAxesCombined, description: "Explore cohort trends" },
            { view: "optimization", icon: SlidersHorizontal, description: "Review intervention insights" },
            { view: "review", icon: ClipboardList, description: "Open the review queue and risk tiers" },
          ] as const).map(({ view, icon: Icon, description }) =>
            <button key={view} type="button" onClick={() => openTool(view)}
              aria-labelledby={"tool-title-" + view} aria-describedby={"tool-description-" + view}
              className="flex min-h-16 items-center gap-2 rounded-xl border border-clinical-border px-3 py-2 text-left hover:bg-primary-50">
              <span className="initials-badge !size-8"><Icon size={16} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span id={"tool-title-" + view} className="block text-sm font-medium">{panelTitle[view]}</span>
                <span id={"tool-description-" + view} className="block text-xs text-clinical-muted">{description}</span>
              </span>
              <ArrowUpRight size={14} className="shrink-0 text-primary-700" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowLinkPatient(true)} className="btn-ghost inline-flex min-h-11 items-center gap-1.5 text-sm"><Link2 size={15} aria-hidden="true" /> Link Patient</button>
          <Link href="/checkin" className="btn-ghost inline-flex min-h-11 items-center gap-1.5 text-sm"><Mic size={15} aria-hidden="true" /> New Check-in</Link>
        </div>
      </section>}


      {/* ── Slide-over Detail Panel ──────────────────────── */}
      {slideOverOpen && (rightPanel !== "patient" || !wide) && (
        <WorkspaceDialog title={panelTitle[rightPanel]} drawer onClose={rightPanel === "patient" ? closeSnapshot : () => setSlideOverOpen(false)}>
            {/* Panel content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
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
                  cohortMetrics && <CohortInsightsPanel metrics={cohortMetrics} />
                )
              ) : rightPanel === "review" ? (
                <div>
      <div className="mb-4"><DashboardHomeReviewQueue patients={patients} checkIns={checkins} /></div>
      {/* ── Color Legend ──────────────────────────────────── */}
      {!loading && (
        <div className="mb-3 flex flex-wrap items-center gap-3 px-1">
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
      <div className="grid min-h-0 gap-3 pb-2 sm:grid-cols-2">
        {KANBAN_COLUMNS.map((col) => {
          const colPatients = patientsByTier[col.tier] || [];
          return (
            <div
              key={col.tier}
              className="flex min-h-0 min-w-0 flex-col"
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
                </div>
              ) : selectedScored ? snapshot() : (
                <p className="p-4 text-sm text-clinical-muted">Select a patient to see their details.</p>
              )}
            </div>
        </WorkspaceDialog>
      )}

      {/* ── Link Patient Modal ─────────────────────────────── */}
      {showLinkPatient && (
        <WorkspaceDialog title="Link Patient" onClose={() => setShowLinkPatient(false)}>
          <div className="overflow-y-auto p-5">
            <p className="text-sm text-clinical-muted mb-4">
              Enter the email of a patient who has already signed up. They will be linked to your account.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="link-patient-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="link-patient-email"
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
        </WorkspaceDialog>
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
