"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import type { VoiceVerificationResult } from "@trialpulse/types";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldX,
  Mic,
  MicOff,
  Loader2,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

interface VoiceVerificationProps {
  patientId: string;
  onVerified: () => void;
  onSkip: () => void;
}

export function VoiceVerification({
  patientId,
  onVerified,
  onSkip,
}: VoiceVerificationProps) {
  const [state, setState] = useState<
    "idle" | "recording" | "verifying" | "success" | "failed" | "error"
  >("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [result, setResult] = useState<VoiceVerificationResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `verify-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await verify(file);
      };

      mediaRecorder.start();
      setState("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingTime(0);
    setState("verifying");
  };

  const verify = async (audioFile: File) => {
    setState("verifying");
    try {
      const res = await api.verifyVoice(audioFile, patientId);
      setResult(res);
      if (res.verified) {
        setState("success");
        toast.success("Voice verified");
        setTimeout(onVerified, 1200);
      } else {
        setState("failed");
      }
    } catch {
      setState("error");
    }
  };

  const retry = () => {
    setState("idle");
    setResult(null);
  };

  const reasonText = (reason: string) => {
    switch (reason) {
      case "phrase_mismatch":
        return "The phrase didn't match. Please try again.";
      case "transcription_failed":
        return "Could not process audio. Try speaking more clearly.";
      case "missing_phrase":
        return "No verification phrase set for this patient.";
      case "no_audio":
        return "No audio received. Please try again.";
      default:
        return "Verification failed. Please try again.";
    }
  };

  return (
    <div className="card border-primary-200 bg-primary-50/30">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-5 h-5 text-primary-400" />
        <h3 className="font-semibold text-slate-900 text-sm">
          Voice Verification
        </h3>
      </div>

      {state === "idle" && (
        <>
          <p className="text-sm text-slate-600 mb-4">
            Please say your personal verification phrase to confirm your
            identity.
          </p>
          <button
            onClick={startRecording}
            className="btn-primary flex items-center gap-2 w-full justify-center"
          >
            <Mic className="w-4 h-4" />
            Verify with Voice
          </button>
          <button
            onClick={onSkip}
            className="text-[11px] w-full mt-3 flex items-center justify-center gap-1 text-slate-300 hover:text-slate-500 transition-colors"
          >
            Skip verification
            <ChevronRight className="w-3 h-3" />
          </button>
        </>
      )}

      {state === "recording" && (
        <div className="text-center py-4">
          <button
            onClick={stopRecording}
            className="w-20 h-20 mx-auto rounded-full bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200 flex items-center justify-center mb-3"
          >
            <MicOff className="w-8 h-8 text-white" />
          </button>
          <p className="text-sm font-medium text-slate-700">
            Listening... {recordingTime}s
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Say your verification phrase, then tap to stop
          </p>
        </div>
      )}

      {state === "verifying" && (
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            Verifying your voice...
          </p>
        </div>
      )}

      {state === "success" && (
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-emerald-700">
            Identity Verified
          </p>
          {result?.transcript && (
            <p className="text-xs text-slate-500 mt-1">
              Heard: &ldquo;{result.transcript}&rdquo;
            </p>
          )}
        </div>
      )}

      {state === "failed" && (
        <div className="text-center py-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ShieldX className="w-7 h-7 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-red-700 mb-1">
            Verification Failed
          </p>
          <p className="text-xs text-slate-500 mb-4">
            {result ? reasonText(result.reason) : "Please try again."}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={retry}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button onClick={onSkip} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors px-3 py-2">
              Skip
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-600 mb-3">
            Voice verification is temporarily unavailable.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={retry}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            <button onClick={onSkip} className="btn-primary text-sm">
              Continue Without
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
