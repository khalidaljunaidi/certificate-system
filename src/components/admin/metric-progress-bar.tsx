export function MetricProgressBar({
  label,
  value,
  tone = "purple",
}: {
  label: string;
  value: number;
  tone?: "purple" | "gold" | "green" | "red";
}) {
  const normalized = Math.min(100, Math.max(0, Number(value.toFixed(2))));
  const color =
    tone === "gold"
      ? "from-[#d78439] to-[#f0b46f]"
      : tone === "green"
        ? "from-[#166534] to-[#4ade80]"
        : tone === "red"
          ? "from-[#991b1b] to-[#ef4444]"
          : "from-[#311347] to-[#7f4ca2]";

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-[var(--color-ink)]">
          {label}
        </span>
        <span className="shrink-0 text-[var(--color-muted)]">
          {normalized.toFixed(0)}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[rgba(49,19,71,0.08)]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}
