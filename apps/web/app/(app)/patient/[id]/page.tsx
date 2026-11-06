"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Patient, CheckIn, Alert } from "@trialpulse/types";
import { api } from "@/lib/api";
import { AlertFollowUp } from "@/components/AlertFollowUp";
import { isPracticePatient } from "@/lib/visit-review";
import {
  PatientStatusBadge,
  SeverityBadge,
  RiskBadge,
} from "@/components/StatusBadge";
import { DropoutRiskBar } from "@/components/DropoutRiskBar";
import { SymptomList } from "@/components/SymptomList";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "sonner";
import { MedicationScanner } from "@/components/MedicationScanner";
import {
  ArrowLeft,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  Mic,
} from "lucide-react";

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c, a] = await Promise.all([
        api.getPatient(id),
        api.getPatientCheckIns(id),
        api.getPatientAlerts(id),
      ]);
      setPatient(p);
      setCheckins(c);
      setAlerts(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        )
      );
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="card space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
        <div className="card space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-clinical-muted">Patient not found</p>
        <Link href="/dashboard" className="text-primary-400 hover:underline mt-2 block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const latestCheckIn = checkins[checkins.length - 1];
  const analysis = latestCheckIn?.analysis;
  const practice = isPracticePatient(patient);
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary-300 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {/* Patient Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="workspace-mark size-12">
              <User className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h1 className="break-words text-2xl font-bold text-slate-900 tracking-tight">
                {patient.name}
              </h1>
              <p className="text-sm text-clinical-muted">{patient.condition}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-clinical-muted">
                <span>Age {patient.age}</span>
                <span>{patient.trialId}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(patient.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PatientStatusBadge status={patient.status} />
            {practice && <span className="badge-neutral">Fictional practice data</span>}
            <Link href={"/patient/" + id + "/review"} className="btn-primary inline-flex min-h-11 items-center text-sm">Visit review</Link>
            {patient.userId && <Link href={"/messages?with=" + encodeURIComponent(patient.userId)} className="btn-secondary inline-flex min-h-11 items-center text-sm">Message patient</Link>}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="card border-red-200/80">
          <h2 className="section-title flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alerts ({unacknowledgedAlerts.length})
          </h2>
          <div className="space-y-2">
            {unacknowledgedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-3 rounded-lg bg-red-50/50 border border-red-100"
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
                  onClick={() => handleAcknowledge(alert.id)}
                  className="btn-ghost text-xs ml-3 flex-shrink-0"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Analysis */}
      {analysis ? (
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-primary-400" />
            Latest AI Analysis
          </h2>

          <div className="mb-5">
            <h3 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-2">
              Summary
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {analysis.summary}
            </p>
          </div>

          <details>
          <summary className="workspace-disclosure">Analysis details</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-3">
                Symptoms
              </h3>
              <SymptomList symptoms={analysis.symptoms} />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-2">
                  Dropout Risk
                </h3>
                <DropoutRiskBar risk={analysis.dropoutRisk} />
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-2">
                  Medication Adherence
                </h3>
                <RiskBadge risk={analysis.medicationAdherenceRisk} />
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-clinical-muted uppercase tracking-wider mb-2">
                  Adverse Event
                </h3>
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

          <div className="mt-5 p-4 rounded-lg bg-primary-50/60 border border-primary-200">
            <h3 className="text-xs font-semibold text-primary-300 uppercase tracking-wide mb-1">
              Recommended Action
            </h3>
            <p className="text-sm text-primary-300 leading-relaxed">
              {analysis.recommendedAction}
            </p>
          </div>
          </details>
        </div>
      ) : !practice && (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No analysis yet"
            description="Submit a voice check-in to generate an AI analysis."
            action={
              <Link href="/checkin" className="btn-primary text-sm">
                New Check-in
              </Link>
            }
          />
        </div>
      )}

      {/* Check-in History */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <Mic className="w-5 h-5 text-slate-400" />
          Check-in History
        </h2>
        {checkins.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No check-ins"
            description="Voice check-ins will appear here."
          />
        ) : (
          <div className="space-y-3">
            {[...checkins].reverse().map((ci) => (
              <details
                key={ci.id}
                className="p-3 rounded-lg bg-slate-50/80 border border-slate-100"
              >
                <summary className="workspace-disclosure">
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(ci.timestamp).toLocaleString()}
                  </span>
                  <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                    {ci.analysis?.adverseEvent && (
                      <span className="badge-danger">Adverse Event</span>
                    )}
                    {ci.audioUrl && (
                      <span className="badge-neutral">Audio</span>
                    )}
                  </span>
                </summary>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">
                  {ci.transcript}
                </p>
              </details>
            ))}
          </div>
        )}
      </div>
      <details className="workspace-panel">
        <summary className="workspace-disclosure">Medication scanner</summary>
        <MedicationScanner />
      </details>
    </div>
  );
}
