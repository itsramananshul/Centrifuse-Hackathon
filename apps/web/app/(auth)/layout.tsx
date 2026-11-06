import { APP_NAME } from "@trialpulse/config";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{APP_NAME}</h1>
          <p className="text-sm text-clinical-muted mt-1">
            AI Voice Monitoring for Clinical Trials
          </p>
        </div>

        {children}
        <p className="mt-5 text-center text-sm">
          <Link href="/healthgps-demo" className="inline-flex min-h-11 items-center text-primary-300 hover:underline">Open synthetic clinician demo</Link>
        </p>
      </div>
    </div>
  );
}
