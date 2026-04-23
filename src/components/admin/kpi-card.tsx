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
        <p className="min-w-0 text-sm font-medium leading-6 text-[var(--color-muted)]">
          {label}
        </p>
        <p className="truncate text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
