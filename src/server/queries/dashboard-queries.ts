import { prisma } from "@/lib/prisma";
import type { NotificationItem } from "@/lib/types";

export async function getDashboardData(userId: string) {
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
    draftCertificates,
    pendingPmApproval,
    approvedCertificates,
    issuedCertificates,
    revokedCertificates,
    recentActivity,
    recentNotifications,
    unreadCount,
  ] = await Promise.all([
    prisma.project.count({ where: activeProjectWhere }),
    prisma.project.count({ where: { ...activeProjectWhere, status: "ACTIVE" } }),
    prisma.certificate.count({ where: activeCertificateWhere }),
    prisma.certificate.count({
      where: { ...activeCertificateWhere, status: "DRAFT" },
    }),
    prisma.certificate.count({
      where: { ...activeCertificateWhere, status: "PENDING_PM_APPROVAL" },
    }),
    prisma.certificate.count({
      where: { ...activeCertificateWhere, status: "PM_APPROVED" },
    }),
    prisma.certificate.count({
      where: { ...activeCertificateWhere, status: "ISSUED" },
    }),
    prisma.certificate.count({
      where: { ...activeCertificateWhere, status: "REVOKED" },
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
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    }),
  ]);

  return {
    kpis: {
      totalProjects,
      activeProjects,
      totalCertificates,
      draftCertificates,
      pendingPmApproval,
      approvedCertificates,
      issuedCertificates,
      revokedCertificates,
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
}
