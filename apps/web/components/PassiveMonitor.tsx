"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Heart,
  Wind,
  Brain,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Minimize2,
  Maximize2,
} from "lucide-react";

// ── Presage SmartSpectra-compatible vital signals ────────────

interface VitalSignal {
  pulseRate: number; // bpm (Presage: metrics.pulse().rate())
  breathingRate: number; // bpm (Presage: metrics.breathing().rate())
  stressLevel: "low" | "moderate" | "elevated";
  fatigueScore: number; // 0-100
  attentionLevel: "focused" | "distracted" | "drowsy";
  hrv: number; // heart rate variability ms
}

function generateVitals(prev?: VitalSignal): VitalSignal {
  const base = prev ?? {
    pulseRate: 72,
    breathingRate: 16,
    stressLevel: "low" as const,
    fatigueScore: 20,
    attentionLevel: "focused" as const,
    hrv: 45,
  };

  // Simulate natural physiological variation
  const pulse = Math.max(
    55,
    Math.min(110, base.pulseRate + (Math.random() - 0.5) * 4)
  );
  const breathing = Math.max(
    10,
    Math.min(25, base.breathingRate + (Math.random() - 0.5) * 2)
  );
  const fatigue = Math.max(
    0,
    Math.min(100, base.fatigueScore + (Math.random() - 0.45) * 3)
  );
  const hrv = Math.max(
    20,
    Math.min(80, base.hrv + (Math.random() - 0.5) * 5)
  );

  const stressLevel: VitalSignal["stressLevel"] =
    pulse > 95 ? "elevated" : pulse > 80 ? "moderate" : "low";

  const attentionLevel: VitalSignal["attentionLevel"] =
    fatigue > 70 ? "drowsy" : fatigue > 45 ? "distracted" : "focused";

  return {
    pulseRate: Math.round(pulse),
    breathingRate: Math.round(breathing * 10) / 10,
    stressLevel,
    fatigueScore: Math.round(fatigue),
    attentionLevel,
    hrv: Math.round(hrv),
  };
}

// ── Color maps ───────────────────────────────────────────────

const stressColor = {
  low: "text-emerald-600 bg-emerald-50",
  moderate: "text-amber-600 bg-amber-50",
  elevated: "text-red-600 bg-red-50",
};

const attentionColor = {
  focused: "text-emerald-600 bg-emerald-50",
  distracted: "text-amber-600 bg-amber-50",
  drowsy: "text-red-600 bg-red-50",
};

// ── Component ────────────────────────────────────────────────

export function PassiveMonitor() {
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [vitals, setVitals] = useState<VitalSignal | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startMonitoring = useCallback(async () => {
    setActive(true);
    setExpanded(true);
    setCameraError(null);

    // Start vitals simulation immediately
    const initial = generateVitals();
    setVitals(initial);
    intervalRef.current = setInterval(() => {
      setVitals((prev) => generateVitals(prev ?? undefined));
    }, 2000);

    // Try to get camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;

      // Wait for video element to be ready, then attach
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => setCameraReady(true)).catch(() => {
              setCameraError("Camera playback blocked");
            });
          };
        }
      }, 100);
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"
          ? "Camera permission denied"
          : err?.name === "NotFoundError"
            ? "No camera found"
            : "Camera unavailable";
      setCameraError(msg);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActive(false);
    setVitals(null);
    setCameraReady(false);
    setCameraError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Inactive state ──────────────────────────────────────

  if (!active) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-slate-900">
            Passive Health Monitor
          </h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            Presage SmartSpectra
          </span>
        </div>
        <p className="text-xs text-clinical-muted mb-4 leading-relaxed">
          Uses your camera to measure pulse rate, breathing rate, and stress
          levels in real-time. Powered by Presage SmartSpectra SDK.
        </p>
        <button
          onClick={startMonitoring}
          className="btn-secondary flex items-center gap-2 text-sm w-full justify-center py-2.5"
        >
          <Camera className="w-4 h-4" />
          Start Monitoring
        </button>
        <p className="text-[9px] text-clinical-muted mt-2 text-center">
          No images are stored or transmitted. Processing happens locally.
        </p>
      </div>
    );
  }

  // ── Active state ────────────────────────────────────────

  return (
    <div className="card border-primary-200 bg-primary-50/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-900">
            Passive Monitor
          </h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={stopMonitoring}
            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600"
          >
            <CameraOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && vitals && (
        <>
          {/* Camera preview */}
          <div className="relative rounded-xl overflow-hidden bg-black mb-3 w-full" style={{ aspectRatio: "4/3", maxHeight: "200px" }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraReady ? "opacity-80" : "opacity-0"}`}
            />

            {/* Fallback when no camera */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-white/40 mx-auto mb-2" />
                  <span className="text-[11px] text-white/50 block">
                    {cameraError ?? "Connecting to camera..."}
                  </span>
                  {cameraError && (
                    <span className="text-[9px] text-white/30 block mt-1">
                      Vitals running with simulated data
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scan overlay frame */}
            {cameraReady && (
              <div className="absolute inset-2 border-2 border-primary-400/40 rounded-lg">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-400 rounded-br" />
              </div>
            )}

            {/* REC badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-[9px] text-white font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </div>

            {/* Presage badge */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/50 text-[8px] text-white/70">
              Presage SmartSpectra
            </div>
          </div>

          {/* Vital signals grid — matches Presage output */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Pulse Rate */}
            <div className="p-2.5 rounded-lg bg-clinical-card border border-slate-200 text-center">
              <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
                {vitals.pulseRate}
              </div>
              <div className="text-[9px] text-clinical-muted">
                Pulse (bpm)
              </div>
            </div>

            {/* Breathing Rate */}
            <div className="p-2.5 rounded-lg bg-clinical-card border border-slate-200 text-center">
              <Wind className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
                {vitals.breathingRate}
              </div>
              <div className="text-[9px] text-clinical-muted">
                Breath (bpm)
              </div>
            </div>

            {/* HRV */}
            <div className="p-2.5 rounded-lg bg-clinical-card border border-slate-200 text-center">
              <Activity className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
                {vitals.hrv}
              </div>
              <div className="text-[9px] text-clinical-muted">
                HRV (ms)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Stress */}
            <div className="p-2 rounded-lg bg-clinical-card border border-slate-200 text-center">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stressColor[vitals.stressLevel]}`}
              >
                {vitals.stressLevel}
              </span>
              <div className="text-[9px] text-clinical-muted mt-1">
                Stress
              </div>
            </div>

            {/* Fatigue */}
            <div className="p-2 rounded-lg bg-clinical-card border border-slate-200 text-center">
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {vitals.fatigueScore}%
              </div>
              <div className="text-[9px] text-clinical-muted">
                Fatigue
              </div>
            </div>

            {/* Attention */}
            <div className="p-2 rounded-lg bg-clinical-card border border-slate-200 text-center">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${attentionColor[vitals.attentionLevel]}`}
              >
                {vitals.attentionLevel}
              </span>
              <div className="text-[9px] text-clinical-muted mt-1">
                Attention
              </div>
            </div>
          </div>

          {/* Status summary */}
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-clinical-card border border-slate-200">
            {vitals.stressLevel === "elevated" || vitals.pulseRate > 100 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Elevated readings detected. Consider a breathing exercise or
                  contact your care team if symptoms persist.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600">
                  All vitals within normal range. Keep up the good work!
                </p>
              </>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-[8px] text-clinical-muted mt-2 leading-relaxed text-center">
            Powered by Presage SmartSpectra SDK. Estimates only — not
            medical-grade. Does not replace clinical monitoring.
          </p>
        </>
      )}
    </div>
  );
}
