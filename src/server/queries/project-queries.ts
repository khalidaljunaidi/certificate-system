import type { Prisma } from "@prisma/client";

import type { ProjectListItem, ProjectWorkspaceView } from "@/lib/types";
import { prisma } from "@/lib/prisma";

type ProjectListFilters = {
  search?: string;
  status?: string;
  archive?: string;
};

type ProjectWorkspaceFilters = {
  projectVendorId?: string;
  status?: string;
  archive?: string;
};

function getProjectArchiveWhere(archive?: string): Prisma.ProjectWhereInput {
  if (archive === "archived") {
    return { isArchived: true };
  }

  if (archive === "all") {
    return {};
  }

  return { isArchived: false };
}

function getCertificateArchiveWhere(
  archive?: string,
): Prisma.CertificateWhereInput {
  if (archive === "archived") {
    return { isArchived: true };
  }

  if (archive === "all") {
    return {};
  }

  return { isArchived: false };
}

export async function getProjectList(
  filters: ProjectListFilters,
): Promise<ProjectListItem[]> {
  const where: Prisma.ProjectWhereInput = {
    ...getProjectArchiveWhere(filters.archive),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.search
      ? {
          OR: [
            {
              projectCode: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              projectName: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      projectCode: true,
      projectName: true,
      projectLocation: true,
      clientName: true,
      status: true,
      isArchived: true,
      archivedAt: true,
      startDate: true,
      endDate: true,
      vendorLinks: {
        select: {
          id: true,
          vendorId: true,
        },
      },
      certificates: {
        where: getCertificateArchiveWhere("active"),
        select: {
          status: true,
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    projectCode: project.projectCode,
    projectName: project.projectName,
    projectLocation: project.projectLocation,
    clientName: project.clientName,
    status: project.status,
    isArchived: project.isArchived,
    archivedAt: project.archivedAt,
    startDate: project.startDate,
    endDate: project.endDate,
    vendorCount: new Set(project.vendorLinks.map((item) => item.vendorId)).size,
    certificateCount: project.certificates.length,
    issuedCount: project.certificates.filter((item) => item.status === "ISSUED").length,
  }));
}

export async function getProjectWorkspace(
  projectId: string,
  filters: ProjectWorkspaceFilters = {},
): Promise<ProjectWorkspaceView | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      projectCode: true,
      projectName: true,
      projectLocation: true,
      clientName: true,
      status: true,
      isArchived: true,
      archivedAt: true,
      startDate: true,
      endDate: true,
      vendorLinks: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          poNumber: true,
          contractNumber: true,
          isActive: true,
          vendor: {
            select: {
              id: true,
              vendorId: true,
              vendorName: true,
              vendorEmail: true,
            },
          },
          certificates: {
            where: getCertificateArchiveWhere("active"),
            orderBy: {
              updatedAt: "desc",
            },
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      certificates: {
        where: {
          ...getCertificateArchiveWhere(filters.archive),
          ...(filters.projectVendorId
            ? { projectVendorId: filters.projectVendorId }
            : {}),
          ...(filters.status ? { status: filters.status as never } : {}),
        },
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          certificateCode: true,
          poNumber: true,
          contractNumber: true,
          status: true,
          isArchived: true,
          archivedAt: true,
          issueDate: true,
          issuedAt: true,
          vendor: {
            select: {
              vendorName: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 14,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          details: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    project: {
      id: project.id,
      projectCode: project.projectCode,
      projectName: project.projectName,
      projectLocation: project.projectLocation,
      clientName: project.clientName,
      status: project.status,
      isArchived: project.isArchived,
      archivedAt: project.archivedAt,
      startDate: project.startDate,
      endDate: project.endDate,
    },
    vendors: project.vendorLinks.map((vendorLink) => ({
      id: vendorLink.id,
      vendorId: vendorLink.vendor.vendorId,
      vendorName: vendorLink.vendor.vendorName,
      vendorEmail: vendorLink.vendor.vendorEmail,
      poNumber: vendorLink.poNumber,
      contractNumber: vendorLink.contractNumber,
      isActive: vendorLink.isActive,
      certificateCount: vendorLink.certificates.length,
      latestCertificateId: vendorLink.certificates[0]?.id ?? null,
      latestCertificateStatus: vendorLink.certificates[0]?.status ?? null,
    })),
    certificates: project.certificates.map((certificate) => ({
      id: certificate.id,
      certificateCode: certificate.certificateCode,
      vendorName: certificate.vendor.vendorName,
      poNumber: certificate.poNumber,
      contractNumber: certificate.contractNumber,
      status: certificate.status,
      isArchived: certificate.isArchived,
      archivedAt: certificate.archivedAt,
      issueDate: certificate.issueDate,
      issuedAt: certificate.issuedAt,
    })),
    activity: project.auditLogs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      createdAt: entry.createdAt,
      actorName: entry.user?.name ?? null,
      details: entry.details,
    })),
  };
}

export async function getProjectVendorOptions(projectId: string) {
  return prisma.projectVendor.findMany({
    where: {
      projectId,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      poNumber: true,
      contractNumber: true,
      vendor: {
        select: {
          id: true,
          vendorId: true,
          vendorName: true,
          vendorEmail: true,
        },
      },
    },
  });
}
