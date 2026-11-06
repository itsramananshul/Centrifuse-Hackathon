import Link from "next/link";
import { Activity } from "lucide-react";
import { VisitReview } from "@/components/VisitReview";
import { demoCases } from "@/lib/visit-review";

export const metadata = { title: "HealthGPS | Clinician demo" };

export default function DemoPage() {
  return (
    <div className="workspace-shell">
      <a href="#visit-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:p-3">Skip to review</a>
      <aside className="workspace-rail border-b px-4 py-4 md:sticky md:top-0 md:h-dvh md:border-b-0 md:py-5">
        <div className="flex items-center gap-2 font-semibold text-slate-900" translate="no">
          <span className="workspace-mark size-9"><Activity size={18} aria-hidden /></span>
          HealthGPS
        </div>
        <nav aria-label="Demo navigation" className="mt-3 flex gap-2 text-sm md:mt-6 md:flex-col">
          <a href="#visit-content" className="rounded-md bg-primary-100 px-3 py-2 text-primary-300">Visit review</a>
          <Link href="/login" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">App sign-in</Link>
        </nav>
      </aside>
      <main id="visit-content" className="workspace-main pt-5">
        <VisitReview cases={demoCases} />
      </main>
    </div>
  );
}
