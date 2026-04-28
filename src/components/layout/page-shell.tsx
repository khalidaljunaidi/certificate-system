import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  metrics,
  variant = "default",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  metrics?: ReactNode;
  variant?: "default" | "feature";
  className?: string;
}) {
  const feature = variant === "feature";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[30px] border px-7 py-7 shadow-[0_24px_72px_rgba(17,17,17,0.06)]",
        feature
          ? "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(70,34,102,0.96)_62%,rgba(215,132,57,0.92))] text-white"
          : "border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,252,247,0.96))] text-[var(--color-ink)]",
        className,
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-3">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.09em]",
              feature ? "text-[#f7c08b]" : "text-[var(--color-accent)]",
            )}
          >
            {eyebrow}
          </p>
          <h1
            className={cn(
              "max-w-4xl text-3xl font-semibold leading-tight tracking-tight",
              feature ? "text-white" : "text-[var(--color-ink)]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "max-w-3xl text-sm leading-7",
                feature ? "text-[#efe3f5]" : "text-[var(--color-muted)]",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        {actions || metrics ? (
          <div className="flex flex-col gap-4 xl:items-end">
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            {metrics ? <div className="w-full xl:w-auto">{metrics}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PageHeroMetrics({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4 md:grid-cols-3", className)}>{children}</div>;
}

function PageHeroMetric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[24px] border px-4 py-4 backdrop-blur-sm",
        accent
          ? "border-white/12 bg-white/12 text-white"
          : "border-[var(--color-border)] bg-[var(--color-panel-soft)] text-[var(--color-ink)]",
      )}
    >
          <p
            className={cn(
              "truncate text-[11px] font-medium uppercase tracking-[0.09em]",
              accent ? "text-[#f7c08b]" : "text-[var(--color-muted)]",
            )}
      >
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p
          className={cn(
            "mt-2 text-xs leading-5",
            accent ? "text-[#efe3f5]" : "text-[var(--color-muted)]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export { PageHeader, PageHeroMetric, PageHeroMetrics, PageShell };
