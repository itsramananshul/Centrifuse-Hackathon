"use client";

import { APP_NAME } from "@trialpulse/config";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Mic, Stethoscope, Shield, Loader2 } from "lucide-react";

export default function RoleSelectionPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check localStorage first (instant redirect if role already saved)
    const savedRole = localStorage.getItem("voxvitals-role");
    if (savedRole === "patient" || savedRole === "clinician" || savedRole === "super") {
      const dest = savedRole === "patient" ? "/checkin" : savedRole === "super" ? "/super" : "/dashboard";
      window.location.replace(dest);
      return;
    }

    // 2. No saved role — try to fetch from user_metadata (persisted across sessions)
    const fetchRole = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check user_metadata (saved permanently on role selection)
        const metaRole = user.user_metadata?.voxvitals_role;
        if (metaRole === "patient" || metaRole === "clinician" || metaRole === "super") {
          localStorage.setItem("voxvitals-role", metaRole);
          const dest = metaRole === "patient" ? "/checkin" : metaRole === "super" ? "/super" : "/dashboard";
          window.location.replace(dest);
          return;
        }

        // No role saved anywhere → show selection screen
      } catch {
        // Ignore errors, fall through to manual selection
      }
      setLoading(false);
    };

    fetchRole();
  }, []);

  const selectRole = async (role: "patient" | "clinician" | "super") => {
    localStorage.setItem("voxvitals-role", role);

    // Persist to user_metadata so it survives across sessions
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { voxvitals_role: role },
    });

    // Also update app_users.role in DB so doctors show in doctor lists
    // DB constraint only allows 'patient' | 'clinician', so map super → clinician
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const dbRole = role === "patient" ? "patient" : "clinician";
      await supabase
        .from("app_users")
        .update({ role: dbRole })
        .eq("auth_id", user.id);
    }

    const dest = role === "patient" ? "/checkin" : role === "super" ? "/super" : "/dashboard";
    window.location.assign(dest);
  };

  // Show loading while checking
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-clinical-bg">
        <div className="text-center">
          <div className="workspace-mark mx-auto mb-5 size-16">
            <Activity className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            {APP_NAME}
          </h1>
          <Loader2 className="w-5 h-5 animate-spin text-primary-400 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-clinical-bg py-8">
      <div className="max-w-lg w-full px-6 text-center animate-fade-in-up">
        {/* Logo */}
        <div className="workspace-mark mx-auto mb-5 size-16">
          <Activity className="size-8" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-slate-500 mt-1 mb-10">
          AI-Powered Voice Monitoring for Clinical Trials
        </p>

        {/* Role buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => selectRole("patient")}
            className="group bg-clinical-card border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:shadow-emerald-100/50 text-left animate-fade-in-up animate-delay-100"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Patient
            </h2>
            <p className="text-sm text-slate-500">
              Daily check-ins &amp; symptom reporting
            </p>
          </button>

          <button
            onClick={() => selectRole("clinician")}
            className="group bg-clinical-card border-2 border-slate-200 hover:border-primary-400 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:shadow-primary-100/50 text-left animate-fade-in-up animate-delay-200"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-6 h-6 text-primary-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Doctor
            </h2>
            <p className="text-sm text-slate-500">
              Monitor patients, alerts &amp; risk
            </p>
          </button>

          <button
            onClick={() => selectRole("super")}
            className="group bg-clinical-card border-2 border-slate-200 hover:border-purple-400 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:shadow-purple-100/50 text-left animate-fade-in-up animate-delay-300"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Lead Doctor
            </h2>
            <p className="text-sm text-slate-500">
              Oversee all doctors &amp; trial analytics
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}
