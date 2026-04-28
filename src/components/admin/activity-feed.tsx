import { formatDateTime } from "@/lib/utils";

export function ActivityFeed({
  items,
}: {
  items: Array<{
    id: string;
    action: string;
    entityType: string;
    actorName: string | null;
    createdAt: Date;
  }>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="min-w-0 rounded-[24px] border border-[var(--color-border)] bg-white p-5"
        >
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="tg-micro-label tg-micro-label--caps text-[var(--color-accent)]">
                {item.action.replaceAll("_", " ")}
              </p>
              <p className="mt-2 break-words text-base text-[var(--color-ink)]">
                {item.actorName ?? "System"} updated {item.entityType}.
              </p>
            </div>
            <p className="shrink-0 text-xs text-[var(--color-muted)]">
              {formatDateTime(item.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
