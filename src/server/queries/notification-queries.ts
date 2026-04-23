import { prisma } from "@/lib/prisma";
import type { NotificationItem } from "@/lib/types";

export async function getNotificationsForUser(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications as NotificationItem[];
}

export async function getNotificationPreviewForUser(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: { createdAt: "desc" },
    take: 6,
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
