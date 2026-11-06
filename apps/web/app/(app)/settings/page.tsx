"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@trialpulse/types";
import {
  Mic,
  MicOff,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  User,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Profile editing state ────────────────────────────────
  const [profile, setProfile] = useState({ name: "", age: "", condition: "" });
  const [patientId, setPatientId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("voxvitals-role");
    setRole(storedRole);

    if (storedRole === "patient") {
      api.getPatients().then((pts) => {
        if (pts.length > 0) {
          const p = pts[0];
          setPatientId(p.id);
          setProfile({ name: p.name, age: String(p.age), condition: p.condition });
        }
        setProfileLoaded(true);
      }).catch(() => setProfileLoaded(true));
    } else {
      // For doctors — load name from user_metadata
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.full_name) {
          setProfile((p) => ({ ...p, name: user.user_metadata.full_name }));
        }
        setProfileLoaded(true);
      });
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSavingProfile(true);
    try {
      // Update user_metadata name
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { full_name: profile.name.trim() },
      });

      // If patient, update patient record too
      if (role === "patient" && patientId) {
        await fetch(`/api/patients/${patientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: profile.name.trim(),
            age: Number(profile.age) || undefined,
            condition: profile.condition.trim() || undefined,
          }),
        });
      }

      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

        mediaRecorder.ondataavailable = () => {};
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorder.start();

        const SR =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        if (SR) {
          const recognition = new SR();
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
            setPhrase(finalTranscript + interim);
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
        toast.error("Microphone access denied");
      }
    }
  };

  const handleSave = async () => {
    if (!phrase.trim()) {
      toast.error("Please record or type a phrase");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/set-phrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: phrase.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to save");
        return;
      }
      toast.success("Voice phrase saved!");
      setSaved(true);
    } catch {
      toast.error("Failed to save phrase");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Voice Phrase Saved
        </h1>
        <p className="text-slate-600 mb-6">
          You can now use &ldquo;Sign in with Voice&rdquo; on the login page.
        </p>
        <button
          onClick={() => router.back()}
          className="btn-primary px-6"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="section-subtitle mt-0.5">
            Manage your profile and voice phrase
          </p>
        </div>
      </div>

      {/* ── Profile Section ──────────────────────────────── */}
      {profileLoaded && (
        <div className="card">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <User className="w-4.5 h-4.5 text-primary-400" />
            My Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="input"
                placeholder="Your full name"
              />
            </div>
            {role === "patient" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))}
                      className="input"
                      placeholder="e.g. 34"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                    <input
                      type="text"
                      value={profile.condition}
                      onChange={(e) => setProfile((p) => ({ ...p, condition: e.target.value }))}
                      className="input"
                      placeholder="e.g. Type 2 Diabetes"
                    />
                  </div>
                </div>
              </>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "Saving..." : "Update Profile"}
            </button>
          </div>
        </div>
      )}

      {/* ── Voice Phrase Section ──────────────────────────── */}
      <div className="card">
        <div className="p-3 rounded-lg bg-primary-50 border border-primary-200 text-sm text-primary-300 mb-5">
          Choose a unique phrase you&apos;ll remember (e.g., &ldquo;Blue Mango
          Seven&rdquo;). You&apos;ll speak this phrase to sign in with your
          voice.
        </div>

        {/* Record */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleRecord}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200"
                : "bg-primary-600 hover:bg-primary-700 shadow-primary-200"
            }`}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>
        </div>
        <p className="text-center text-sm text-slate-500 mb-5">
          {isRecording
            ? `Recording... ${recordingTime}s — tap to stop`
            : "Tap to record your phrase"}
        </p>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Your Phrase
          </label>
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            className="input"
            placeholder="Your phrase appears here, or type it"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!phrase.trim() || saving}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Voice Phrase"}
        </button>
      </div>
    </div>
  );
}
