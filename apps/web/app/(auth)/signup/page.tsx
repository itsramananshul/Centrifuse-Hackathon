"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Mic,
  MicOff,
  CheckCircle2,
  ArrowRight,
  Mail,
} from "lucide-react";

type Step = "credentials" | "verify-email" | "voice-setup" | "done";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [condition, setCondition] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [phrase, setPhrase] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [savingPhrase, setSavingPhrase] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Step 1: Create account via server route
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          age: age ? Number(age) : undefined,
          condition: condition.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message);
        setLoading(false);
        return;
      }

      // Set session if returned
      if (json.data?.session) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: json.data.session.access_token,
          refresh_token: json.data.session.refresh_token,
        });
      }

      setLoading(false);
      setStep("voice-setup");
    } catch {
      setError("Failed to create account");
      setLoading(false);
    }
  };

  // Step 2: Record voice phrase
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

  const handleSavePhrase = async () => {
    if (!phrase.trim()) {
      toast.error("Please record or type your voice phrase");
      return;
    }
    setSavingPhrase(true);
    try {
      const res = await fetch("/api/auth/set-phrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: phrase.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to save");
        setSavingPhrase(false);
        return;
      }
      toast.success("Voice phrase saved!");
      setStep("done");
    } catch {
      toast.error("Failed to save phrase");
    } finally {
      setSavingPhrase(false);
    }
  };

  // Step 1
  if (step === "credentials") {
    return (
      <div className="bg-clinical-card rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Create an account
        </h2>
        <p className="text-sm text-clinical-muted mb-6">
          Step 1 of 2 — Set up your credentials
        </p>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="input"
                placeholder="Sarah"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="input"
                placeholder="Chen"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input"
              placeholder="Minimum 6 characters"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-1.5">
                Age
              </label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input"
                placeholder="e.g. 34"
                min={1}
                max={120}
              />
            </div>
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-slate-700 mb-1.5">
                Medical Condition
              </label>
              <input
                id="condition"
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="input"
                placeholder="e.g. Type 2 Diabetes"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? "Creating..." : "Continue"}
          </button>
        </form>

        <p className="text-center text-sm text-clinical-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Verify email
  if (step === "verify-email") {
    return (
      <div className="bg-clinical-card rounded-2xl shadow-xl border border-slate-200/60 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-5">
          <Mail className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Check your email
        </h2>
        <p className="text-sm text-clinical-muted mb-2">
          We sent a verification link to:
        </p>
        <p className="text-sm font-semibold text-slate-900 mb-6">
          {email}
        </p>
        <p className="text-xs text-clinical-muted mb-6">
          Click the link in the email to verify your account, then come back and sign in.
        </p>
        <Link
          href="/login"
          className="btn-primary inline-flex items-center gap-2 px-6"
        >
          Go to Sign In
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Step 2
  if (step === "voice-setup") {
    return (
      <div className="bg-clinical-card rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Set Your Voice Phrase
        </h2>
        <p className="text-sm text-clinical-muted mb-6">
          Step 2 of 2 — Choose a phrase for voice sign-in
        </p>

        <div className="p-3 rounded-lg bg-primary-50 border border-primary-200 text-sm text-primary-300 mb-5">
          Say a memorable phrase (e.g., &ldquo;Blue Mango Seven&rdquo;). You&apos;ll
          use this to sign in with your voice.
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
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
          <p className="text-center text-sm text-slate-500">
            {isRecording ? `Recording... ${recordingTime}s — tap to stop` : "Tap to record your phrase"}
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Phrase</label>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="input"
              placeholder="Your phrase will appear here, or type it"
            />
          </div>

          <button
            onClick={handleSavePhrase}
            disabled={!phrase.trim() || savingPhrase}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            {savingPhrase ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {savingPhrase ? "Saving..." : "Save Voice Phrase"}
          </button>

          <button
            onClick={() => {
              setStep("done");
            }}
            className="w-full btn-ghost text-sm text-slate-400"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Done
  return (
    <div className="bg-clinical-card rounded-2xl shadow-xl border border-slate-200/60 p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        You&apos;re all set!
      </h2>
      <p className="text-sm text-clinical-muted mb-6">
        Your account is ready.
      </p>
      <button
        onClick={() => {
          router.push("/");
          router.refresh();
        }}
        className="btn-primary px-6"
      >
        Get Started
      </button>
    </div>
  );
}
