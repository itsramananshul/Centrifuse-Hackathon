"use client";

import { MedicationScanner } from "@/components/MedicationScanner";
import { Pill } from "lucide-react";

export default function MedicationScanPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Pill className="w-5 h-5 text-emerald-600" />
          </div>
          Medication Scanner
        </h1>
        <p className="text-sm text-clinical-muted mt-1.5">
          Take a photo or upload an image of your medication label to get AI-powered advice
        </p>
      </div>

      <MedicationScanner />

      <div className="card bg-amber-50/50 border-amber-200">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Disclaimer:</strong> This tool provides general medication information only.
          It is not a substitute for professional medical advice. Always consult your healthcare
          provider before making any changes to your medication regimen.
        </p>
      </div>
    </div>
  );
}
