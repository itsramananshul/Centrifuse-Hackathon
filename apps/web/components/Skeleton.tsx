export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/70 rounded-lg ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function PatientCardSkeleton() {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="pt-3 border-t border-clinical-border flex justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </div>
  );
}

export function HighRiskCardSkeleton() {
  return (
    <div className="card border-l-4 border-l-slate-200 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="flex gap-2 ml-11">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="ml-11 flex items-center gap-4">
        <div className="flex-1 max-w-xs space-y-1">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function AlertSkeleton() {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
