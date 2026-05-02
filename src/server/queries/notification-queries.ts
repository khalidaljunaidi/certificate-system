import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withServerTiming } from "@/lib/server-performance";
import type { NotificationItem } from "@/lib/types";

const notificationSelect = {
  id: true,
  type: true,
  eventKey: true,
  severity: true,
  title: true,
  message: true,
  createdAt: true,
  read: true,
  actionedAt: true,
  relatedProjectId: true,
  relatedCertificateId: true,
  relatedVendorId: true,
  relatedProjectVendorId: true,
  relatedTaskId: true,
  href: true,
} satisfies Prisma.NotificationSelect;

const UNREAD_COUNT_CACHE_MS = 5_000;
const unreadCountCache = new Map<
  string,
  {
    expiresAt: number;
    count: number;
  }
>();

type NotificationQueryOptions = {
  limit?: number;
};

function getUnreadVisibleNotificationWhere(userId: string) {
  return {
    userId,
    read: false,
  } satisfies Prisma.NotificationWhereInput;
}

async function getNotificationsByUserId(
  userId: string,
  options: NotificationQueryOptions = {},
) {
  const notifications = await withServerTiming("notifications.list", () => prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 20,
    select: notificationSelect,
  }));

  return notifications as NotificationItem[];
}

export async function getNotificationsForUser(
  userId: string,
  options: NotificationQueryOptions = {},
) {
  return getNotificationsByUserId(userId, options);
}

export async function getNotificationPreviewForUser(
  userId: string,
  options: NotificationQueryOptions = {},
) {
  const where = getUnreadVisibleNotificationWhere(userId);
  const notifications = await withServerTiming("notifications.preview", () => prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 6,
    select: notificationSelect,
  }));

  return notifications as NotificationItem[];
}

export async function getNotificationHeaderStateForUser(
  userId: string,
  options: NotificationQueryOptions = {},
) {
  const where = getUnreadVisibleNotificationWhere(userId);
  const limit = options.limit ?? 5;

  const [unreadCount, notifications, debugUnreadIds] = await Promise.all([
    withServerTiming("notifications.headerUnreadCount", () => prisma.notification.count({
      where,
    })),
    withServerTiming("notifications.headerPreview", () => prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: notificationSelect,
    })),
    process.env.NODE_ENV !== "production"
      ? withServerTiming("notifications.headerDebugIds", () => prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
          },
        }))
      : Promise.resolve([]),
  ]);

  if (process.env.NODE_ENV !== "production") {
    console.info("[notifications.header] unread visibility check", {
      currentUserId: userId,
      unreadCount,
      dropdownItemsLength: notifications.length,
      countQueryVisibleIds: debugUnreadIds.map((notification) => notification.id),
      dropdownQueryIds: notifications.map((notification) => notification.id),
    });
  }

  return {
    unreadCount,
    notificationPreview: notifications as NotificationItem[],
  };
}

export async function getUnreadNotificationCount(userId: string) {
  const cached = unreadCountCache.get(userId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.count;
  }

  const count = await withServerTiming("notifications.unreadCount", () => prisma.notification.count({
    where: {
      ...getUnreadVisibleNotificationWhere(userId),
    },
  }));

  unreadCountCache.set(userId, {
    expiresAt: Date.now() + UNREAD_COUNT_CACHE_MS,
    count,
  });

  return count;
}
