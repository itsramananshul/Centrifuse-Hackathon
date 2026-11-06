export function DropoutRiskBar({ risk }: { risk: number }) {
  const percentage = Math.round(risk * 100);
  const color =
    risk >= 0.7
      ? "bg-red-500"
      : risk >= 0.4
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-700 w-10 text-right">
        {percentage}%
      </span>
    </div>
  );
}
