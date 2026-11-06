"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, Loader2, Pill, ShieldCheck, ShieldAlert, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface MedicationMetadata {
  drugName: string;
  score: number;
  strength: string;
  quantity: string;
  expiry: string;
  fdaContext: string | null;
}

interface ScanResult {
  ocrTexts: string[];
  metadata: MedicationMetadata;
  advice: string;
  auditPassed: boolean;
  auditReason: string;
}

export function MedicationScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [yoloDown, setYoloDown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.yolo === "unavailable") setYoloDown(true);
      })
      .catch(() => {});
  }, []);

  const processImage = useCallback(async (base64: string, mimeType: string) => {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch("/api/medication-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Scan failed");
      }
      setResult(json.data);
      toast.success("Medication scanned successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        const base64 = dataUrl.split(",")[1];
        processImage(base64, file.type);
      };
      reader.readAsDataURL(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [processImage]
  );

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      toast.error("Could not access camera. Please use file upload instead.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    stopCamera();
    const base64 = dataUrl.split(",")[1];
    processImage(base64, "image/jpeg");
  }, [processImage]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setPreview(null);
    stopCamera();
  }, [stopCamera]);

  return (
    <div className="card">
      <h2 className="section-title flex items-center gap-2 mb-4">
        <Pill className="w-5 h-5 text-emerald-600" />
        Medication Scanner
      </h2>

      {yoloDown && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>YOLO detection service is offline — scanner will use full-image fallback.</span>
        </div>
      )}

      {/* Camera View */}
      {showCamera && (
        <div className="relative mb-4 rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-64 object-contain"
          />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <button
              onClick={capturePhoto}
              className="bg-clinical-card text-slate-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-slate-100 transition-colors"
            >
              Capture
            </button>
            <button
              onClick={stopCamera}
              className="bg-clinical-danger-action text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-clinical-danger-action transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preview Image */}
      {preview && !showCamera && (
        <div className="relative mb-4">
          <img
            src={preview}
            alt="Medication label"
            className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
          />
          {!scanning && (
            <button
              onClick={reset}
              className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Upload / Camera Buttons */}
      {!showCamera && !scanning && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors text-sm text-slate-600 hover:text-emerald-700"
          >
            <Upload className="w-4 h-4" />
            Upload Photo
          </button>
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors text-sm text-slate-600 hover:text-emerald-700"
          >
            <Camera className="w-4 h-4" />
            Use Camera
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Loading State */}
      {scanning && (
        <div className="flex items-center justify-center gap-3 py-6 text-emerald-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">
            Analyzing medication label...
          </span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Drug Info */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                {result.metadata.drugName}
              </h3>
              <span className="text-[11px] text-slate-500">
                Match: {(result.metadata.score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Strength:</span>{" "}
                {result.metadata.strength}
              </div>
              <div>
                <span className="text-slate-400">Quantity:</span>{" "}
                {result.metadata.quantity}
              </div>
              <div>
                <span className="text-slate-400">Expiry:</span>{" "}
                {result.metadata.expiry}
              </div>
            </div>
          </div>

          {/* OCR Extracted Text */}
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-700">
              <Eye className="w-3.5 h-3.5" />
              View extracted text ({result.ocrTexts.length} segments)
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-0.5">
              {result.ocrTexts.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          </details>

          {/* Advice */}
          <div
            className={`p-4 rounded-lg border ${
              result.auditPassed
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-amber-50/60 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.auditPassed ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              )}
              <h3
                className={`text-xs font-semibold uppercase tracking-wide ${
                  result.auditPassed ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {result.auditPassed ? "Verified Medical Advice" : "Advisory Notice"}
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {result.advice}
            </p>
          </div>

          {/* Scan Again */}
          <button
            onClick={reset}
            className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium py-2 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            Scan Another Medication
          </button>
        </div>
      )}
    </div>
  );
}
