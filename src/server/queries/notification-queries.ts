import { prisma } from "@/lib/prisma";

export async function getNotificationsForUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getNotificationPreviewForUser(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}
