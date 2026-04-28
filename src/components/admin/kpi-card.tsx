import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: number;
  accent?: string;
  className?: string;
}) {
  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardContent className="relative flex h-full min-w-0 flex-col justify-between gap-4 p-5">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: accent ?? "var(--color-primary)" }}
        />
        <p className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
          {label}
        </p>
        <p className="truncate text-[clamp(1.7rem,1.8vw,2.35rem)] font-semibold tracking-tight text-[var(--color-ink)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
