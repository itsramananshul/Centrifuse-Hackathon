"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Step = "credentials" | "done";

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
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: json.data.session.access_token,
          refresh_token: json.data.session.refresh_token,
        });
        if (sessionError) {
          router.replace("/login");
          return;
        }
        setStep("done");
      } else {
        router.replace("/login");
      }
      setLoading(false);
    } catch {
      setError("Failed to create account");
      setLoading(false);
    }
  };

  // Step 1
  if (step === "credentials") {
    return (
      <div className="workspace-panel sm:p-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Create an account
        </h2>
        <p className="text-sm text-clinical-muted mb-6">
          Set up your credentials
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
            {loading ? "Creating\u2026" : "Create account"}
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

  // Done
  return (
    <div className="workspace-panel sm:p-8 text-center">
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
