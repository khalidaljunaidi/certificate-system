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
        "overflow-hidden rounded-[30px] border px-7 py-7 shadow-[0_24px_72px_rgba(27,16,51,0.07)]",
        feature
          ? "border-[rgba(229,201,138,0.16)] [background:var(--tg-dark-gradient)] text-white"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]",
        className,
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-3">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.09em]",
              feature ? "text-[var(--tg-gold-soft)]" : "text-[var(--accent)]",
            )}
          >
            {eyebrow}
          </p>
          <h1
            className={cn(
              "max-w-4xl text-3xl font-semibold leading-tight tracking-tight",
              feature ? "text-white" : "text-[var(--text-main)]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "max-w-3xl text-sm leading-7",
                feature ? "text-[rgba(248,247,251,0.74)]" : "text-[var(--text-muted)]",
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
          ? "border-[rgba(229,201,138,0.16)] bg-white/12 text-white"
          : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-main)]",
      )}
    >
          <p
            className={cn(
              "truncate text-[11px] font-medium uppercase tracking-[0.09em]",
              accent ? "text-[var(--tg-gold-soft)]" : "text-[var(--text-muted)]",
            )}
      >
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p
          className={cn(
            "mt-2 text-xs leading-5",
            accent ? "text-[rgba(248,247,251,0.74)]" : "text-[var(--text-muted)]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export { PageHeader, PageHeroMetric, PageHeroMetrics, PageShell };
