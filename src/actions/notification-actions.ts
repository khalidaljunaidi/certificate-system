"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function revalidateNotificationSurfaces() {
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin", "layout");
}

export async function markNotificationReadAction(formData: FormData) {
  const session = await requireAdminSession();
  const notificationId = String(formData.get("notificationId"));
  const returnPath =
    String(formData.get("returnPath") || "/admin/notifications");

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  revalidatePath(returnPath);
  revalidateNotificationSurfaces();
}

export async function markNotificationReadByIdAction(notificationId: string) {
  const session = await requireAdminSession();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();
}

export async function markNotificationActionedByIdAction(notificationId: string) {
  const session = await requireAdminSession();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
    },
    data: {
      read: true,
      readAt: new Date(),
      actionedAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();
}

export async function markAllNotificationsReadAction() {
  const session = await requireAdminSession();

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();
}

export async function openNotificationAction(formData: FormData) {
  const session = await requireAdminSession();
  const notificationId = String(formData.get("notificationId"));
  const targetHref = String(formData.get("targetHref") || "/admin/notifications");

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.user.id,
    },
    data: {
      read: true,
      readAt: new Date(),
      actionedAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();
  redirect(targetHref);
}
