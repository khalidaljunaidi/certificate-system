import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
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

type NotificationQueryOptions = {
  limit?: number;
};

async function getNotificationsByUserId(
  userId: string,
  options: NotificationQueryOptions = {},
) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
    select: notificationSelect,
  });

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
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 6,
    select: notificationSelect,
  });

  return notifications as NotificationItem[];
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}
