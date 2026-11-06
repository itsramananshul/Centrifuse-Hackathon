export type InsightChipVariant = "critical" | "warning" | "info";

const variantStyles: Record<InsightChipVariant, string> = {
  critical: "badge-critical",
  warning: "badge-warning",
  info: "badge-neutral",
};

export function InsightChip({
  label,
  variant,
}: {
  label: string;
  variant: InsightChipVariant;
}) {
  return <span className={variantStyles[variant]}>{label}</span>;
}
