"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Patient, AiAnalysis } from "@trialpulse/types";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { VoiceVerification } from "@/components/VoiceVerification";
import { PatientDailyCheckIn } from "@/components/PatientDailyCheckIn";
import { PatientInboxNotice } from "@/components/PatientInboxNotice";
import { PassiveMonitor } from "@/components/PassiveMonitor";
import { toast } from "sonner";
import { recordAuditEvent } from "@/lib/security/audit";
import {
  Mic,
  MicOff,
  Upload,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  X,
  ArrowLeft,
} from "lucide-react";

export default function CheckInPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [voiceVerified, setVoiceVerified] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [hasAdverseEvent, setHasAdverseEvent] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("voxvitals-role");
    setRole(storedRole);
    api
      .getPatients()
      .then((pts) => {
        setPatients(pts);
        // For patient role, auto-select the first patient as their record
        if (storedRole === "patient" && pts.length > 0) {
          setPatientRecord(pts[0]);
        }
      })
      .catch(() => toast.error("Failed to load patients"));
  }, []);

  // ── Patient mode: show guided daily check-in ──────────
  if (role === "patient" && patientRecord) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <PatientInboxNotice />
        <PatientDailyCheckIn patient={patientRecord} />
        <PassiveMonitor />
      </div>
    );
  }

  if (role === "patient" && !patientRecord) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400 mx-auto mb-3" />
        <p className="text-sm text-clinical-muted">Loading your profile...</p>
      </div>
    );
  }

  // ── Clinician mode: existing flow below ───────────────

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const file = new File([blob], `checkin-${Date.now()}.webm`, {
            type: "audio/webm",
          });
          setAudioFile(file);
          stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorder.start();

        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          let finalTranscript = "";
          recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal)
                finalTranscript += event.results[i][0].transcript + " ";
              else interim += event.results[i][0].transcript;
            }
            setTranscript(finalTranscript + interim);
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        }

        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(
          () => setRecordingTime((t) => t + 1),
          1000
        );
      } catch {
        toast.error(
          "Microphone access denied — type or paste transcript instead"
        );
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      toast.success(`Audio file selected: ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !transcript) {
      toast.error("Please select a patient and provide a transcript");
      return;
    }

    setIsAnalyzing(true);
    try {
      let audioUrl: string | undefined;
      if (audioFile) {
        setPipelineStep("Uploading audio...");
        const supabase = createClient();
        const fileName = `${selectedPatient}/${Date.now()}-${audioFile.name}`;
        const { data, error } = await supabase.storage
          .from("checkin-audio")
          .upload(fileName, audioFile);
        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("checkin-audio")
            .getPublicUrl(data.path);
          audioUrl = urlData.publicUrl;
        } else if (error) {
          console.warn("[CheckIn] Audio upload failed:", error.message);
          toast.error("Audio upload failed — submitting without recording");
        }
      }

      setPipelineStep("Saving check-in...");
      const checkIn = await api.createCheckIn({
        patientId: selectedPatient,
        transcript,
        ...(audioUrl && { audioUrl }),
      });

      setPipelineStep("Running AI analysis...");
      const pipelineResult = await api.analyzeCheckIn(checkIn.id);

      setAlertCount(pipelineResult.alerts.length);
      setHasAdverseEvent(pipelineResult.analysis.adverseEvent);
      setSubmitted(true);
      setPipelineStep("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setPipelineStep("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // After submit — show brief confirmation then redirect
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
            hasAdverseEvent
              ? "bg-red-100"
              : "bg-emerald-100"
          }`}
        >
          {hasAdverseEvent ? (
            <AlertTriangle className="w-8 h-8 text-red-600" />
          ) : (
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Check-in Complete
        </h1>

        <p className="text-slate-600 mb-2">
          {hasAdverseEvent
            ? "We've identified something that may need attention. Your care team will review this shortly."
            : "Thank you for the update. Everything has been recorded and analyzed."}
        </p>

        {role === "clinician" && alertCount > 0 && (
          <p className="text-sm font-medium text-red-600 mb-4">
            {alertCount} alert{alertCount > 1 ? "s" : ""} generated for review
          </p>
        )}

        <div className="mt-6">
          {role === "clinician" ? (
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="btn-primary px-8 py-3 text-base"
            >
              View Dashboard
            </button>
          ) : (
            <button
              onClick={() => {
                setSubmitted(false);
                setTranscript("");
                setAudioFile(null);
                setSelectedPatient("");
              }}
              className="btn-primary px-8 py-3 text-base"
            >
              Submit Another Check-in
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            New Patient Check-in
          </h1>
          <p className="section-subtitle mt-0.5">
            Record or enter a patient voice check-in for AI analysis
          </p>
        </div>
      </div>

      {/* Patient Select */}
      <div className="card">
        <label
          htmlFor="patient-select"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Patient
        </label>
        <select
          id="patient-select"
          value={selectedPatient}
          onChange={(e) => {
            setSelectedPatient(e.target.value);
            setVoiceVerified(false);
          }}
          className="input"
        >
          <option value="">Select a patient...</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.condition}
            </option>
          ))}
        </select>
      </div>

      {/* Voice Verification — shown after patient is selected, before check-in form */}
      {selectedPatient && !voiceVerified && (
        <VoiceVerification
          patientId={selectedPatient}
          onVerified={() => {
            setVoiceVerified(true);
            recordAuditEvent("voice_verification_passed", { patientId: selectedPatient });
          }}
          onSkip={() => {
            setVoiceVerified(true);
            recordAuditEvent("voice_verification_skipped", { patientId: selectedPatient });
            toast.warning("Voice verification skipped — proceeding without identity check");
          }}
        />
      )}

      {/* Voice Recording — only shown after verification */}
      {(selectedPatient && voiceVerified) && (
      <>

      {/* Voice Recording */}
      <div className="card">
        <label className="block text-sm font-medium text-slate-700 mb-4">
          Voice Recording
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRecord}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200"
                : "bg-primary-600 hover:bg-primary-700 shadow-primary-200"
            }`}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">
              {isRecording
                ? `Recording... ${recordingTime}s — Click to stop`
                : "Click to start recording"}
            </p>
            <p className="text-xs text-clinical-muted mt-0.5">
              {isRecording
                ? "Speak clearly into your microphone"
                : "Or upload an audio file / type transcript below"}
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {audioFile && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-primary-50 border border-primary-200">
            <FileAudio className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-primary-300 flex-1 truncate">
              {audioFile.name}
            </span>
            <button
              onClick={() => setAudioFile(null)}
              className="text-primary-400 hover:text-primary-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="card">
        <label
          htmlFor="transcript"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Transcript
        </label>
        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Patient transcript will appear here after recording, or type/paste manually..."
          rows={5}
          className="input resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedPatient || !transcript || isAnalyzing}
        className="btn-primary flex items-center gap-2 w-full justify-center py-3 text-base"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {pipelineStep || "Processing..."}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit & Analyze
          </>
        )}
      </button>

      </>
      )}
    </div>
  );
}
