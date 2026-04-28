type CircularKpiMeterProps = {
  label: string;
  value: number;
  suffix?: string;
  tone?: "purple" | "gold" | "green" | "red";
};

const TONE_STYLES: Record<NonNullable<CircularKpiMeterProps["tone"]>, { stroke: string; track: string; text: string }> = {
  purple: {
    stroke: "#5b2a7a",
    track: "rgba(91,42,122,0.12)",
    text: "#311347",
  },
  gold: {
    stroke: "#d78439",
    track: "rgba(215,132,57,0.14)",
    text: "#a55d18",
  },
  green: {
    stroke: "#166534",
    track: "rgba(22,101,52,0.12)",
    text: "#166534",
  },
  red: {
    stroke: "#b91c1c",
    track: "rgba(185,28,28,0.12)",
    text: "#991b1b",
  },
};

export function CircularKpiMeter({
  label,
  value,
  suffix = "%",
  tone = "purple",
}: CircularKpiMeterProps) {
  const normalized = Math.min(100, Math.max(0, Number(value.toFixed(2))));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const palette = TONE_STYLES[tone];

  return (
    <div className="flex h-full min-w-0 flex-col rounded-[26px] border border-[var(--color-border)] bg-white p-4 shadow-[0_18px_44px_rgba(17,17,17,0.05)]">
      <p className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
        {label}
      </p>
      <div className="mt-4 flex flex-1 items-center justify-center">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={palette.track}
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={palette.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[clamp(1.25rem,1.4vw,1.65rem)] font-semibold text-[var(--color-ink)]">
              {normalized.toFixed(0)}
              {suffix}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
              KPI
            </p>
          </div>
        </div>
      </div>
      <p
        className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.10em]"
        style={{ color: palette.text }}
      >
        Live cycle signal
      </p>
    </div>
  );
}
