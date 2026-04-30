import { prisma } from "@/lib/prisma";
import { withServerTiming } from "@/lib/server-performance";
import type { NotificationItem } from "@/lib/types";
import { getNotificationPreviewForUser } from "@/server/queries/notification-queries";

export async function getDashboardData(userId: string) {
  return withServerTiming("dashboard.data", async () => {
  const activeProjectWhere = { isArchived: false } as const;
  const activeCertificateWhere = {
    isArchived: false,
    project: {
      isArchived: false,
    },
  } as const;

  const [
    totalProjects,
    activeProjects,
    totalCertificates,
    certificateStatusCounts,
    recentActivity,
    recentNotifications,
    unreadCount,
  ] = await Promise.all([
    prisma.project.count({ where: activeProjectWhere }),
    prisma.project.count({ where: { ...activeProjectWhere, status: "ACTIVE" } }),
    prisma.certificate.count({ where: activeCertificateWhere }),
    prisma.certificate.groupBy({
      by: ["status"],
      where: activeCertificateWhere,
      _count: {
        _all: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        project: {
          select: {
            projectName: true,
            projectCode: true,
          },
        },
      },
    }),
    getNotificationPreviewForUser(userId),
    prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    }),
  ]);

  const certificateCounts = new Map(
    certificateStatusCounts.map((entry) => [entry.status, entry._count._all]),
  );

  return {
    kpis: {
      totalProjects,
      activeProjects,
      totalCertificates,
      draftCertificates: certificateCounts.get("DRAFT") ?? 0,
      pendingPmApproval: certificateCounts.get("PENDING_PM_APPROVAL") ?? 0,
      approvedCertificates: certificateCounts.get("PM_APPROVED") ?? 0,
      issuedCertificates: certificateCounts.get("ISSUED") ?? 0,
      revokedCertificates: certificateCounts.get("REVOKED") ?? 0,
    },
    recentActivity: recentActivity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      createdAt: entry.createdAt,
      actorName: entry.user?.name ?? null,
      details: {
        ...((entry.details as Record<string, unknown> | null) ?? {}),
        projectName: entry.project?.projectName ?? null,
        projectCode: entry.project?.projectCode ?? null,
      },
    })),
    recentNotifications: recentNotifications as NotificationItem[],
    unreadCount,
  };
  });
}
