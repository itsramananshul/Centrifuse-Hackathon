"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AICompanionWidget } from "@/components/AICompanionWidget";
import { EmergencyButton } from "@/components/EmergencyButton";
import { api } from "@/lib/api";

type Role = "patient" | "clinician" | "super" | null;

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [ready, setReady] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  // Read role on mount AND on every pathname change
  useEffect(() => {
    const stored = localStorage.getItem("voxvitals-role") as Role;
    setRole(stored);
    setReady(true);

    // Resolve patient ID for emergency button
    if (stored === "patient" && !patientId) {
      api
        .getPatients()
        .then((pts) => {
          if (pts.length > 0) setPatientId(pts[0].id);
        })
        .catch(() => {});
    }
  }, [pathname]);

  // Handle redirects
  useEffect(() => {
    if (!ready || pathname === "/") return;

    if (!role) {
      router.replace("/");
      return;
    }

    // Patient can only access /checkin, /settings, and /medication-scan
    const patientAllowed = ["/checkin", "/settings", "/medication-scan", "/browse", "/messages"];
    if (
      role === "patient" &&
      !patientAllowed.some((p) => pathname.startsWith(p))
    ) {
      router.replace("/checkin");
    }

    // Lead doctor can access everything — no restrictions
    // Regular clinician cannot access /super
    if (role === "clinician" && pathname.startsWith("/super")) {
      router.replace("/dashboard");
    }
  }, [ready, role, pathname, router]);

  // Role selection page — no sidebar
  if (pathname === "/") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/30 to-slate-100">
        {children}
      </div>
    );
  }

  // Wait for localStorage
  if (!ready || !role) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center">
        <div className="animate-pulse text-clinical-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-clinical-bg">
      <Sidebar role={role} />
      <main className="flex-1 md:ml-64 p-4 md:p-8">{children}</main>
      {role === "patient" && <AICompanionWidget patient={null} />}
      {role === "patient" && patientId && (
        <EmergencyButton patientId={patientId} />
      )}
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppContent>{children}</AppContent>;
}
