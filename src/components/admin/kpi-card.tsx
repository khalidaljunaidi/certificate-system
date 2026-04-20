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
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="relative p-5">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: accent ?? "var(--color-primary)" }}
        />
        <p className="text-sm text-[var(--color-muted)]">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
