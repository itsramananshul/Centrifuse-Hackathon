"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  ArrowLeft,
  User,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
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

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-2" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="section-subtitle mt-0.5">
            Manage your profile
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
    </div>
  );
}
