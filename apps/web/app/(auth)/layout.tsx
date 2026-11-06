import { APP_NAME } from "@trialpulse/config";
import { Compass } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-clinical-bg px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="workspace-mark mx-auto mb-4 size-14">
            <Compass className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{APP_NAME}</h1>
          <p className="text-sm text-clinical-muted mt-1">
            AI Voice Monitoring for Clinical Trials
          </p>
        </div>

        {children}
      </div>
    </main>
  );
}
