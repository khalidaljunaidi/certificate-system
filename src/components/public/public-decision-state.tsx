export function PublicDecisionState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-6">
      <h2 className="text-2xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
