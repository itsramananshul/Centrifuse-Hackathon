import type { Alert, CheckIn } from "@trialpulse/types";
import { newerCheckInForAlert } from "@/lib/alert-follow-up";
import { checkInObservationDate } from "@/lib/home-tracker";

const submittedLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function AlertFollowUp({ alert, checkIns }: { alert: Alert; checkIns: CheckIn[] }) {
  const update = newerCheckInForAlert(alert, checkIns);
  if (!update) return null;

  return <details className="mt-2 rounded-lg border border-primary-200 bg-primary-50 px-3">
    <summary className="min-h-9 cursor-pointer py-2 text-sm font-medium text-primary-700">Newer patient check-in</summary>
    <p className="text-xs text-clinical-muted">
      Submitted <time dateTime={update.timestamp}>{submittedLabel.format(new Date(update.timestamp))}</time>
      {" · Observation date " + checkInObservationDate(update)}
    </p>
    <p className="py-2 whitespace-pre-wrap break-words text-sm text-slate-700">{update.transcript}</p>
  </details>;
}
