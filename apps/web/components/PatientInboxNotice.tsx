"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function PatientInboxNotice() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const update = async () => {
      try {
        const response = await fetch("/api/messages/unread", { signal: controller.signal, cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          if (!controller.signal.aborted) setUnread(result.data.unread);
        }
      } catch { /* Leave the most recent inbox state visible. */ }
    };
    void update();
    const timer = window.setInterval(update, 15000);
    window.addEventListener("focus", update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  return <div className="rounded-xl border border-primary-200 bg-primary-50 px-3" aria-live="polite">
    <Link href="/messages" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-300 hover:underline">
      <Bell size={17} aria-hidden /> {unread > 0 ? unread + " unread message" + (unread === 1 ? "" : "s") + " · Open inbox" : "Messages and care updates"}
    </Link>
  </div>;
}
