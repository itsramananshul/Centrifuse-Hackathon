"use client";

import { APP_NAME } from "@trialpulse/config";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Mic,
  Activity,
  LogOut,
  User,
  Menu,
  X,
  Users,
  Heart,
  ShieldCheck,
  Pill,
  Shield,
  BarChart3,
  Search,
  UserPlus,
  MessageSquare,
} from "lucide-react";

const clinicianNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/checkin", label: "New Check-in", icon: Mic },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: ShieldCheck },
];

const patientNav = [
  { href: "/checkin", label: "Voice Check-in", icon: Mic },
  { href: "/medication-scan", label: "Medication Scanner", icon: Pill },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/browse", label: "Browse Diseases", icon: Search },
  { href: "/settings", label: "Settings", icon: ShieldCheck },
];

const superNav = [
  { href: "/super", label: "Command Center", icon: Shield },
  { href: "/super/assign-patient", label: "Assign Patient", icon: UserPlus },
  { href: "/dashboard", label: "Doctor Dashboard", icon: LayoutDashboard },
  { href: "/checkin", label: "New Check-in", icon: Mic },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: ShieldCheck },
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
      {/* Logo */}
      <div className="p-5 border-b border-clinical-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {APP_NAME}
            </h1>
            <p className="text-[11px] text-clinical-muted font-medium uppercase tracking-wider">
              {role === "patient" ? "Patient Portal" : role === "super" ? "Command Center" : "Doctor Dashboard"}
            </p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-3 pt-3">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            role === "patient"
              ? "bg-emerald-50 text-emerald-700"
              : role === "super"
                ? "bg-purple-50 text-purple-700"
                : "bg-primary-50 text-primary-300"
          }`}
        >
          {role === "patient" ? (
            <Heart className="w-3.5 h-3.5" />
          ) : role === "super" ? (
            <Shield className="w-3.5 h-3.5" />
          ) : (
            <Users className="w-3.5 h-3.5" />
          )}
          {role === "patient" ? "Patient Mode" : role === "super" ? "Lead Doctor" : "Doctor Mode"}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary-100 text-primary-300 ring-1 ring-inset ring-primary-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-clinical-border">
        {displayName && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <span className="text-sm font-medium text-slate-700 truncate">
              {displayName}
            </span>
          </div>
        )}
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
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-clinical-card border border-clinical-border shadow-sm flex items-center justify-center"
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
        className={`fixed left-0 top-0 h-full w-64 bg-clinical-card border-r border-clinical-border flex flex-col z-50 md:hidden transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-clinical-card border-r border-clinical-border flex-col z-10">
        {sidebarContent}
      </aside>
    </>
  );
}
