"use client";

import { Bell, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { markNotificationReadByIdAction } from "@/actions/notification-actions";
import { getNotificationHref } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function NotificationBell({
  count,
  notifications,
}: {
  count: number;
  notifications: NotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(() => notifications);
  const [unreadCount, setUnreadCount] = useState(count);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function removeNotification(notificationId: string) {
    setItems((current) => current.filter((item) => item.id !== notificationId));
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAsRead(notificationId: string, shouldRefresh = true) {
    setPendingId(notificationId);

    try {
      await markNotificationReadByIdAction(notificationId);
      removeNotification(notificationId);
      if (shouldRefresh) {
        router.refresh();
      }
    } finally {
      setPendingId((current) => (current === notificationId ? null : current));
    }
  }

  async function openNotification(notification: NotificationItem) {
    const targetHref = getNotificationHref(notification);
    await markAsRead(notification.id, false);
    setOpen(false);
    router.push(targetHref);
  }

  return (
    <div ref={rootRef} className="tg-notification-shell">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink)] transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-panel-soft)] hover:shadow-[0_16px_32px_rgba(17,17,17,0.12)]"
        aria-label="Open notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="pointer-events-none absolute -right-3 -top-3 z-20 inline-flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-[var(--color-background)] bg-[var(--color-accent)] px-1.5 text-center text-[11px] font-bold leading-none text-white shadow-[0_10px_20px_rgba(215,132,57,0.38)]">
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="tg-notification-panel" role="dialog" aria-label="Notifications">
          <div className="border-b border-[var(--color-border)] bg-[rgba(49,19,71,0.03)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  Notifications
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  Workflow alerts
                </p>
              </div>
              <div className="rounded-full bg-[rgba(49,19,71,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                {unreadCount} unread
              </div>
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto px-3 py-3">
            {items.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--color-border)] px-4 py-6 text-sm leading-6 text-[var(--color-muted)]">
                No unread notifications right now.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((notification) => {
                  const busy = pendingId === notification.id;

                  return (
                    <div
                      key={notification.id}
                      className="rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-4"
                    >
                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        disabled={busy}
                        className="block w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                                {notification.title}
                              </p>
                              <span className="rounded-full bg-[rgba(215,132,57,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                                New
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">
                              {notification.message}
                            </p>
                          </div>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                        </div>
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-[var(--color-muted)]">
                          {formatDateTime(notification.createdAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => void markAsRead(notification.id)}
                          disabled={busy}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-panel-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? "Updating..." : "Mark as read"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] bg-[rgba(255,253,249,0.96)] px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/admin/notifications");
              }}
              className="tg-button-live inline-flex w-full items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-panel-soft)]"
            >
              Open notification center
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
