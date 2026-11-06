"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { recordAuditEvent } from "@/lib/security/audit";
import { toast } from "sonner";
import {
  ShieldAlert,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function EmergencyButton({ patientId, placement = "floating" }: {
  patientId: string;
  placement?: "floating" | "inline";
}) {
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-close success state after 3s
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => {
      setSubmitted(false);
      setShowModal(false);
      setNote("");
    }, 3000);
    return () => clearTimeout(t);
  }, [submitted]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.triggerEmergencyAlert(patientId, note || undefined);
      recordAuditEvent("emergency_alert_triggered", {
        patientId,
        metadata: { note: note || "none" },
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send alert. Please try again or call your care team directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return; // Don't close while sending
    setShowModal(false);
    setNote("");
    setSubmitted(false);
  };

  return (
    <>
      {/* ── Floating Emergency Button ──────────────────────── */}
      <button
        onClick={() => setShowModal(true)}
        className={"flex min-h-11 items-center gap-2 bg-clinical-danger-action px-4 py-2.5 text-white transition-colors hover:bg-clinical-danger-action-hover " +
          (placement === "inline" ? "rounded-xl" : "fixed right-6 top-20 z-50 rounded-full shadow-lg shadow-red-300/50 emergency-pulse")}
        aria-label="Emergency - I Need Help Now"
      >
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-semibold">I Need Help Now</span>
      </button>

      {/* ── Confirmation Modal ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="emergency-dialog-title" className="workspace-panel max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto !p-0 shadow-2xl">
            {/* ── Success State ─────────────────────────── */}
            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 id="emergency-dialog-title" className="text-lg font-bold text-slate-900 mb-2">
                  Alert Sent
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your care team has been notified and will review your concern
                  as soon as possible.
                </p>
              </div>
            ) : (
              <>
                {/* ── Header ──────────────────────────── */}
                <div className="flex items-center gap-3 p-5 pb-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h2 id="emergency-dialog-title" className="text-lg font-bold text-slate-900">
                      Send Emergency Alert?
                    </h2>
                  </div>
                  <button
                    onClick={handleClose}
                    aria-label="Close emergency alert"
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ── Body ────────────────────────────── */}
                <div className="p-5 space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    This will immediately notify your care team that you may
                    need urgent attention. Use this if you feel something is
                    wrong or need help right away.
                  </p>

                  {/* Optional note */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      What are you experiencing?{" "}
                      <span className="text-clinical-muted font-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., I feel dizzy and my chest hurts..."
                      rows={3}
                      className="input resize-none text-sm"
                      disabled={submitting}
                    />
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      This notifies your care team but is not a replacement for
                      emergency services. If you are in immediate danger, call{" "}
                      <strong>911</strong>.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleClose}
                      disabled={submitting}
                      className="flex-1 btn-secondary py-2.5 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-clinical-danger-action hover:bg-clinical-danger-action-hover disabled:bg-red-300 text-white font-semibold text-sm shadow-sm transition-all"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4" />
                          Send Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
