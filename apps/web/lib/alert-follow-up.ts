import type { Alert, CheckIn } from "@trialpulse/types";
import { demoCheckInPrefix } from "@/lib/home-tracker";

export function newerCheckInForAlert(alert: Alert, checkIns: CheckIn[]) {
  if (alert.acknowledged) return undefined;
  const opened = Date.parse(alert.createdAt);
  let newest: CheckIn | undefined;
  for (const checkIn of checkIns) {
    if (checkIn.patientId !== alert.patientId || checkIn.id === alert.checkInId ||
      checkIn.transcript.startsWith(demoCheckInPrefix) || checkIn.transcript.startsWith("Fictional HealthGPS demo check-in.")) continue;
    const submitted = Date.parse(checkIn.timestamp);
    if (submitted > opened && (!newest || submitted > Date.parse(newest.timestamp))) newest = checkIn;
  }
  return newest;
}
