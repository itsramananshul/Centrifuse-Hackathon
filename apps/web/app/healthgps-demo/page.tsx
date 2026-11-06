import Link from "next/link";
import { Activity } from "lucide-react";
import { VisitReview } from "@/components/VisitReview";
import { demoCases } from "@/lib/visit-review";

export const metadata = { title: "HealthGPS | Clinician demo" };

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-clinical-bg xl:grid xl:grid-cols-[12rem_minmax(0,1fr)]">
      <a href="#visit-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:p-3">Skip to review</a>
      <aside className="border-b border-clinical-border bg-clinical-card px-5 py-4 xl:border-b-0 xl:border-r xl:py-8">
        <div className="flex items-center gap-2 font-semibold text-slate-900" translate="no">
          <span className="rounded-lg bg-primary-100 p-2 text-primary-300"><Activity size={18} aria-hidden /></span>
          HealthGPS
        </div>
        <nav aria-label="Demo navigation" className="mt-3 flex gap-3 text-sm xl:mt-8 xl:flex-col">
          <a href="#visit-content" className="rounded-md bg-primary-100 px-3 py-2 text-primary-300">Visit review</a>
          <Link href="/login" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100">App sign-in</Link>
        </nav>
      </aside>
      <main id="visit-content" className="min-w-0 px-4 py-6 sm:px-7 xl:px-10">
        <VisitReview cases={demoCases} />
      </main>
    </div>
  );
}
