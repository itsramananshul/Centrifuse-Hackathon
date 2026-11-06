"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { homeQuestions, questionsFor, writeHomeAnswers, type HomeQuestion } from "@/lib/home-tracker";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@trialpulse/types";
import { toast } from "sonner";
import {
  Stethoscope,
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Pill,
  FileText,
  Sparkles,
  RotateCcw,
} from "lucide-react";

// ============================================================
// Pain levels
// ============================================================

type PainLevel = "normal" | "mild" | "high" | "very_high";

const PAIN_OPTIONS: {
  value: PainLevel;
  label: string;
  emoji: string;
  color: string;
  activeColor: string;
  description: string;
}[] = [
  {
    value: "normal",
    label: "Normal",
    emoji: "😊",
    color: "border-emerald-200 bg-clinical-card hover:bg-emerald-50",
    activeColor: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20",
    description: "No pain",
  },
  {
    value: "mild",
    label: "Mild",
    emoji: "😐",
    color: "border-amber-200 bg-clinical-card hover:bg-amber-50",
    activeColor: "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20",
    description: "Some discomfort",
  },
  {
    value: "high",
    label: "High",
    emoji: "😣",
    color: "border-orange-200 bg-clinical-card hover:bg-orange-50",
    activeColor: "border-orange-500 bg-orange-50 ring-2 ring-orange-500/20",
    description: "Significant pain",
  },
  {
    value: "very_high",
    label: "Very High",
    emoji: "😖",
    color: "border-red-200 bg-clinical-card hover:bg-red-50",
    activeColor: "border-red-500 bg-red-50 ring-2 ring-red-500/20",
    description: "Severe pain",
  },
];

const PAIN_SEVERITY_MAP: Record<PainLevel, number> = {
  normal: 1,
  mild: 4,
  high: 7,
  very_high: 9,
};

// ============================================================
// Medication items (demo set)
// ============================================================

interface MedItem {
  id: string;
  name: string;
  dosage: string;
  taken: boolean | null; // null = not answered
}

const DEFAULT_MEDICATIONS: Omit<MedItem, "taken">[] = [
  { id: "med-1", name: "Trial Medication A", dosage: "200mg, morning" },
  { id: "med-2", name: "Trial Medication B", dosage: "100mg, evening" },
];

// ============================================================
// Component
// ============================================================

export function PatientDailyCheckIn({
  patient,
}: {
  patient: Patient;
}) {
  // ── Assigned doctor ─────────────────────────────────────
  const [doctorName, setDoctorName] = useState<string | null>(null);

  useEffect(() => {
    if (patient.doctorId) {
      fetch("/api/doctors")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const doc = json.data.find((d: any) => d.id === patient.doctorId);
            if (doc) setDoctorName(doc.name);
          }
        })
        .catch(() => {});
    }
  }, [patient.doctorId]);

  // ── Voice state ─────────────────────────────────────────
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Date state ─────────────────────────────────────────
  const [checkInDate, setCheckInDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // ── Form state ──────────────────────────────────────────
  const [painLevel, setPainLevel] = useState<PainLevel | null>(null);
  const [sideEffects, setSideEffects] = useState("");
  const [homeAnswers, setHomeAnswers] = useState<Partial<Record<HomeQuestion, string>>>({});
  const [medications, setMedications] = useState<MedItem[]>(
    DEFAULT_MEDICATIONS.map((m) => ({ ...m, taken: null }))
  );

  // ── Submission state ────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hasAdverseEvent, setHasAdverseEvent] = useState(false);

  // ── Recording handlers ──────────────────────────────────

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const file = new File([blob], `checkin-${Date.now()}.webm`, { type: "audio/webm" });
          setAudioFile(file);
          stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorder.start();

        // Live transcription via Web Speech API
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      } catch {
        toast.error("Microphone access unavailable. You can type your update below.");
      }
    }
  };

  // ── Medication toggle ───────────────────────────────────

  const toggleMed = (medId: string, taken: boolean) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, taken } : m))
    );
  };

  // ── Build full transcript for AI ────────────────────────

  const buildFullTranscript = (): string => {
    const parts: string[] = [];

    // Voice transcript
    if (transcript.trim()) {
      parts.push(`Patient voice update: ${transcript.trim()}`);
    }

    // Pain level
    if (painLevel) {
      const sev = PAIN_SEVERITY_MAP[painLevel];
      const label = PAIN_OPTIONS.find((p) => p.value === painLevel)?.label ?? painLevel;
      parts.push(`Pain level: ${label} (${sev}/10).`);
    }

    // Side effects
    if (sideEffects.trim()) {
      parts.push(`Side effects reported: ${sideEffects.trim()}.`);
    }

    // Medication
    const takenMeds = medications.filter((m) => m.taken === true);
    const missedMeds = medications.filter((m) => m.taken === false);
    if (takenMeds.length > 0) {
      parts.push(`Medications taken: ${takenMeds.map((m) => m.name).join(", ")}.`);
    }
    if (missedMeds.length > 0) {
      parts.push(`Medications missed: ${missedMeds.map((m) => m.name).join(", ")}.`);
    }

    return [...parts, ...writeHomeAnswers(homeAnswers)].join("\n");
  };

  // ── Submit ──────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!painLevel) {
      toast.error("Please select your pain level");
      return;
    }

    const fullTranscript = buildFullTranscript();
    if (!fullTranscript.trim()) {
      toast.error("Please provide at least a voice update or pain level");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload audio if available
      let audioUrl: string | undefined;
      if (audioFile) {
        setPipelineStep("Uploading your recording...");
        const supabase = createClient();
        const fileName = `${patient.id}/${Date.now()}-${audioFile.name}`;
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

      setPipelineStep("Saving your check-in...");
      const checkIn = await api.createCheckIn({
        patientId: patient.id,
        transcript: fullTranscript,
        ...(audioUrl && { audioUrl }),
        checkInDate: checkInDate || undefined,
        painLevel: painLevel || undefined,
      });

      setPipelineStep("Analyzing your health update...");
      const result = await api.analyzeCheckIn(checkIn.id);

      setHasAdverseEvent(result.analysis.adverseEvent);
      setSubmitted(true);
      setPipelineStep("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPipelineStep("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────

  const resetForm = () => {
    setTranscript("");
    setAudioFile(null);
    setPainLevel(null);
    setSideEffects("");
    setHomeAnswers({});
    setCheckInDate(new Date().toISOString().split("T")[0]);
    setMedications(DEFAULT_MEDICATIONS.map((m) => ({ ...m, taken: null })));
    setSubmitted(false);
    setHasAdverseEvent(false);
  };

  // ── Adherence streak (from medications) ─────────────────

  const allMedsAnswered = medications.every((m) => m.taken !== null);
  const allMedsTaken = medications.every((m) => m.taken === true);

  // Persistent streak tracking via localStorage
  const getStreak = (): number => {
    try {
      const data = JSON.parse(localStorage.getItem("voxvitals-med-streak") || "{}");
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (data.lastDate === today) return data.count ?? 0;
      if (data.lastDate === yesterday) return data.count ?? 0;
      return 0; // streak broken
    } catch {
      return 0;
    }
  };

  const updateStreak = (tookAll: boolean) => {
    try {
      const today = new Date().toDateString();
      const prev = JSON.parse(localStorage.getItem("voxvitals-med-streak") || "{}");
      if (prev.lastDate === today) return; // Already logged today
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const streak = tookAll
        ? (prev.lastDate === yesterday ? (prev.count ?? 0) + 1 : 1)
        : 0;
      localStorage.setItem("voxvitals-med-streak", JSON.stringify({ count: streak, lastDate: today }));
    } catch { /* ignore */ }
  };

  // Update streak when submitted
  useEffect(() => {
    if (submitted) updateStreak(allMedsTaken);
  }, [submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const streakCount = getStreak();

  // ── Success state ───────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
            hasAdverseEvent ? "bg-red-100" : "bg-emerald-100"
          }`}
        >
          {hasAdverseEvent ? (
            <AlertTriangle className="w-10 h-10 text-red-600" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Check-in Complete
        </h1>

        <p className="text-slate-600 mb-6 leading-relaxed">
          {hasAdverseEvent
            ? "We've noted some concerns from your update. Your care team will review this shortly."
            : "Thank you for your update! Your care team can now review today's check-in."}
        </p>

        {allMedsTaken && (
          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700">
              <Sparkles className="w-4 h-4" />
              Great job staying on track with your medication!
            </div>
            {streakCount > 0 && (
              <div className="text-sm text-amber-600 font-semibold">
                🔥 {streakCount} day streak!
              </div>
            )}
          </div>
        )}

        <div>
          <button
            onClick={resetForm}
            className="btn-primary px-8 py-3 text-base flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            New Check-in
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Daily Health Check-in
        </h1>
        <p className="text-sm text-clinical-muted mt-1">
          Hi {patient.name.split(" ")[0]}, how are you feeling today?
        </p>
        {doctorName && (
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-sm text-primary-300">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Your doctor: <strong>{doctorName}</strong></span>
          </div>
        )}
      </div>

      {/* ── Check-in Date ────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-300">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            Check-in Date
          </h2>
        </div>
        <p className="text-xs text-clinical-muted mb-3">
          Select the date for this check-in. Defaults to today.
        </p>
        <input
          type="date"
          value={checkInDate}
          onChange={(e) => setCheckInDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="input text-sm w-full max-w-xs"
        />
      </div>

      {/* ── Step 1: Voice Update ────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-300">
            1
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            Voice Update
          </h2>
          <span className="text-[10px] text-clinical-muted">Optional</span>
        </div>

        <p className="text-xs text-clinical-muted mb-4">
          Tell us how you're feeling in your own words. Tap to record.
        </p>

        {/* Record button */}
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={handleRecord}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md flex-shrink-0 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200"
                : "bg-primary-600 hover:bg-primary-700 shadow-primary-200"
            }`}
          >
            {isRecording ? (
              <MicOff className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </button>

          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">
              {isRecording
                ? `Recording... ${recordingTime}s`
                : audioFile
                  ? "Recording saved"
                  : "Tap to start recording"}
            </p>
            <p className="text-xs text-clinical-muted mt-0.5">
              {isRecording
                ? "Speak naturally, then tap again to stop"
                : "Your message will be shared with your care team"}
            </p>
          </div>
        </div>

        {/* Transcript preview / manual input */}
        {(transcript || !isRecording) && (
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your words will appear here as you speak, or type your update..."
            rows={3}
            className="input resize-none text-sm"
          />
        )}
      </div>

      {/* ── Step 2: Pain Level ──────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-300">
            2
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            Pain Level
          </h2>
          <span className="text-[10px] text-red-500 font-medium">Required</span>
        </div>

        <p className="text-xs text-clinical-muted mb-4">
          How would you describe your pain right now?
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PAIN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPainLevel(opt.value)}
              className={`rounded-xl border-2 p-4 text-center transition-all duration-150 ${
                painLevel === opt.value ? opt.activeColor : opt.color
              }`}
            >
              <div className="text-2xl mb-1">{opt.emoji}</div>
              <div className="text-sm font-semibold text-slate-800">
                {opt.label}
              </div>
              <div className="text-[10px] text-clinical-muted mt-0.5">
                {opt.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 3: Side Effects ────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-300">
            3
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            Side Effects
          </h2>
          <span className="text-[10px] text-clinical-muted">Optional</span>
        </div>

        <p className="text-xs text-clinical-muted mb-3">
          Have you noticed any side effects? Describe anything unusual — nausea,
          fatigue, dizziness, rashes, or other changes.
        </p>

        <textarea
          value={sideEffects}
          onChange={(e) => setSideEffects(e.target.value)}
          placeholder="e.g., I've been feeling more tired than usual and had some nausea after my morning dose..."
          rows={3}
          className="input resize-none text-sm"
        />
      </div>

      {/* ── Step 4: Medication Tracking ─────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-300">
            4
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            Medication
          </h2>
          <span className="text-[10px] text-red-500 font-medium">Required</span>
        </div>

        <p className="text-xs text-clinical-muted mb-4">
          Did you take your medications today?
        </p>

        <div className="space-y-3">
          {medications.map((med) => (
            <div
              key={med.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-clinical-card"
            >
              <Pill className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">
                  {med.name}
                </div>
                <div className="text-[11px] text-clinical-muted">
                  {med.dosage}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleMed(med.id, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    med.taken === true
                      ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200"
                  }`}
                >
                  Taken
                </button>
                <button
                  onClick={() => toggleMed(med.id, false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    med.taken === false
                      ? "bg-red-100 text-red-700 ring-2 ring-red-500/20"
                      : "bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200"
                  }`}
                >
                  Missed
                </button>
              </div>
            </div>
          ))}
        </div>

        {allMedsTaken && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            All medications taken — great job!
          </div>
        )}
      </div>

      <fieldset className="card">
        <legend className="section-title">Symptoms and daily life</legend>
        <p className="section-subtitle mb-3">Share what you noticed. You can leave any question unanswered.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {questionsFor(patient.condition).map((key) => (
            <label key={key} className="text-sm text-slate-700">{homeQuestions[key].question}
              <select className="input mt-1 min-h-11 text-base" value={homeAnswers[key] ?? ""} onChange={(event) => setHomeAnswers((previous) => ({ ...previous, [key]: event.target.value }))}>
                <option value="">Not entered</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        onClick={handleSubmit}
        disabled={!painLevel || isSubmitting}
        className="btn-primary flex items-center gap-2 w-full justify-center py-4 text-base rounded-xl"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {pipelineStep || "Processing..."}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit Check-in
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-clinical-muted">
        Your data is securely shared with your care team only.
      </p>
    </div>
  );
}
