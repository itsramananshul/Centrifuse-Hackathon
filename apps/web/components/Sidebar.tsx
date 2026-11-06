"use client";

import { APP_NAME } from "@trialpulse/config";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  ArrowUpRight,
  Compass,
  House,
  Settings,
  Users,
  Mic,
  LogOut,
  Menu,
  X,
  Pill,
  Shield,
  Search,
  UserPlus,
  MessageSquare,
} from "lucide-react";

const clinicianNav = [
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/dashboard#patient-roster", label: "Patients", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

const patientNav = [
  { href: "/checkin", label: "Voice Check-in", icon: Mic },
  { href: "/medication-scan", label: "Medication Scanner", icon: Pill },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/browse", label: "Browse Diseases", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

const superNav = [
  { href: "/super", label: "Command Center", icon: Shield },
  { href: "/super/assign-patient", label: "Assign Patient", icon: UserPlus },
  { href: "/dashboard", label: "Doctor Dashboard", icon: LayoutDashboard },
  { href: "/checkin", label: "New Check-in", icon: Mic },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ role }: { role: "patient" | "clinician" | "super" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = role === "patient" ? patientNav : role === "super" ? superNav : clinicianNav;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // 1. Check auth user_metadata for full_name (set during signup)
      const metaName = user.user_metadata?.full_name;
      if (metaName && metaName.trim()) {
        setDisplayName(metaName.trim());
        return;
      }

      // 2. For patient role, try to get their patient name from DB
      if (role === "patient") {
        const { data: patients } = await supabase
          .from("patients")
          .select("name")
          .eq("user_id", user.id)
          .limit(1);
        if (patients && patients.length > 0) {
          setDisplayName(patients[0].name);
          return;
        }
      }

      // 3. Fallback: derive name from email (e.g. "ar.dev@..." → "Ar Dev")
      const local = (user.email ?? "").split("@")[0];
      const name = local
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\d+/g, "")
        .trim();
      setDisplayName(name || user.email || "User");
    });
  }, [role]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("voxvitals-role");
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <>
      <Link href={role === "patient" ? "/checkin" : role === "super" ? "/super" : "/dashboard"} className="flex min-h-14 items-center gap-2 px-4 py-3 text-slate-900 sm:px-6" translate="no">
        <Compass className="size-6 shrink-0 text-primary-700" strokeWidth={1.5} aria-hidden="true" />
        <span className="font-[family-name:var(--display-font)] text-xl tracking-tight">{APP_NAME}</span>
      </Link>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 pt-5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard#patient-roster" && pathname.startsWith("/patient/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 font-[family-name:var(--display-font)] text-base transition-colors duration-150 ${
                isActive
                  ? "bg-primary-100 font-semibold text-primary-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.55} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="space-y-1 px-3 pb-4">
        {displayName && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <span className="initials-badge size-8" aria-hidden="true">{displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</span>
            <span className="text-sm font-medium text-slate-700 truncate">
              {displayName}
            </span>
          </div>
        )}
        {role !== "patient" && <a href="/dashboard#advanced-tools" onClick={() => setMobileOpen(false)}
          className="flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-slate-700 underline-offset-4 hover:bg-slate-100 hover:underline">
          Advanced tools <ArrowUpRight size={14} aria-hidden="true" />
        </a>}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-50 flex size-11 items-center justify-center rounded-xl border border-clinical-border bg-clinical-card md:hidden"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="mobile-workspace-navigation"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        id="mobile-workspace-navigation"
        inert={!mobileOpen}
        className={`workspace-rail fixed left-0 top-0 z-50 flex h-dvh w-64 transform flex-col overflow-auto border-r transition-transform duration-200 motion-reduce:transition-none md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="workspace-rail hidden min-w-0 flex-col md:sticky md:top-0 md:flex md:h-dvh md:overflow-auto">
        {sidebarContent}
      </aside>
    </>
  );
}
