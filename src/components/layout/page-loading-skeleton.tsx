export function PageLoadingSkeleton({
  title = "Loading workspace",
}: {
  title?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <section className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 shadow-[0_24px_80px_rgba(17,17,17,0.06)]">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-panel-soft)]" />
        <div className="mt-5 h-8 w-full max-w-xl animate-pulse rounded-full bg-[var(--color-panel-soft)]" />
        <p className="sr-only">{title}</p>
        <div className="mt-4 h-4 w-full max-w-3xl animate-pulse rounded-full bg-[var(--color-panel-soft)]" />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[26px] border border-[var(--color-border)] bg-white shadow-[0_18px_50px_rgba(17,17,17,0.05)]"
          />
        ))}
      </section>

      <section className="rounded-[28px] border border-[var(--color-border)] bg-white p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="mb-3 h-20 animate-pulse rounded-[22px] bg-[var(--color-panel-soft)] last:mb-0"
          />
        ))}
      </section>
    </div>
  );
}
