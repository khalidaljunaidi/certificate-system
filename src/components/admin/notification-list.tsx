"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { markNotificationReadByIdAction } from "@/actions/notification-actions";
import { Button } from "@/components/ui/button";
import { getNotificationHref } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function NotificationList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const unreadCount = useMemo(
    () => items.filter((notification) => !notification.read).length,
    [items],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
        No notifications yet.
      </div>
    );
  }

  async function markAsRead(notificationId: string, shouldRefresh = true) {
    setPendingId(notificationId);

    try {
      await markNotificationReadByIdAction(notificationId);
      setItems((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read: true,
              }
            : item,
        ),
      );
      if (shouldRefresh) {
        router.refresh();
      }
    } finally {
      setPendingId((current) => (current === notificationId ? null : current));
    }
  }

  async function openNotification(notification: NotificationItem) {
    const href = getNotificationHref(notification);

    if (!notification.read) {
      await markAsRead(notification.id, false);
    }

    router.push(href);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Notification Status
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {unreadCount} unread out of {items.length} workflow notifications.
          </p>
        </div>
      </div>

      {items.map((notification) => {
        const href = getNotificationHref(notification);
        const busy = pendingId === notification.id;

        return (
          <div
            key={notification.id}
            className="rounded-[24px] border border-[var(--color-border)] bg-white p-5"
          >
            <button
              type="button"
              onClick={() => void openNotification(notification)}
              disabled={busy}
              className="block w-full rounded-[20px] text-left transition-colors hover:bg-[var(--color-panel-soft)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3">
                    <p className="text-base font-semibold text-[var(--color-ink)]">
                      {notification.title}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        notification.read
                          ? "bg-[rgba(49,19,71,0.08)] text-[var(--color-primary)]"
                          : "bg-[rgba(215,132,57,0.14)] text-[var(--color-accent)]"
                      }`}
                    >
                      {notification.read ? "Read" : "Unread"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {notification.message}
                  </p>
                  <p className="mt-3 text-xs font-medium text-[var(--color-primary)]">
                    View details
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--color-muted)]">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </button>

            <div className="mt-4">
              {!notification.read ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void markAsRead(notification.id)}
                  disabled={busy}
                >
                  {busy ? "Updating..." : "Mark as read"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(href)}
                >
                  View details
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
