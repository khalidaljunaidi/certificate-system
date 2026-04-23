import type { Prisma } from "@prisma/client";

import type { CertificateSummaryView } from "@/lib/types";
import { prisma } from "@/lib/prisma";

type GlobalCertificateFilters = {
  search?: string;
  status?: string;
  projectId?: string;
  vendorId?: string;
  archive?: string;
};

type GlobalCertificateQueryOptions = {
  limit?: number;
};

function getCertificateArchiveWhere(
  archive?: string,
): Prisma.CertificateWhereInput {
  if (archive === "archived") {
    return {
      OR: [
        { isArchived: true },
        {
          project: {
            isArchived: true,
          },
        },
      ],
    };
  }

  if (archive === "all") {
    return {};
  }

  return {
    isArchived: false,
    project: {
      isArchived: false,
    },
  };
}

export async function getCertificateById(
  certificateId: string,
): Promise<CertificateSummaryView | null> {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      project: {
        select: {
          id: true,
          projectName: true,
          projectCode: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorName: true,
        },
      },
    },
  });

  if (!certificate) {
    return null;
  }

  return {
    id: certificate.id,
    certificateCode: certificate.certificateCode,
    projectId: certificate.projectId,
    projectName: certificate.project.projectName,
    projectCode: certificate.project.projectCode,
    vendorId: certificate.vendorId,
    vendorName: certificate.vendor.vendorName,
    projectVendorId: certificate.projectVendorId,
    issueDate: certificate.issueDate,
    completionDate: certificate.completionDate,
    poNumber: certificate.poNumber,
    contractNumber: certificate.contractNumber,
    totalAmount: certificate.totalAmount.toString(),
    executedScopeSummary: certificate.executedScopeSummary,
    clientName: certificate.clientName,
    clientTitle: certificate.clientTitle,
    approverName: certificate.approverName,
    approverTitle: certificate.approverTitle,
    pmName: certificate.pmName,
    pmEmail: certificate.pmEmail,
    pmTitle: certificate.pmTitle,
    pmApprovedAt: certificate.pmApprovedAt,
    approvalNotes: certificate.approvalNotes,
    status: certificate.status,
    isArchived: certificate.isArchived,
    archivedAt: certificate.archivedAt,
    issuedAt: certificate.issuedAt,
    pdfUrl: certificate.pdfUrl,
    revokedAt: certificate.revokedAt,
    revokedReason: certificate.revokedReason,
  };
}

export async function getGlobalCertificates(
  filters: GlobalCertificateFilters,
  options: GlobalCertificateQueryOptions = {},
) {
  const where: Prisma.CertificateWhereInput = {
    ...getCertificateArchiveWhere(filters.archive),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
    ...(filters.search
      ? {
          OR: [
            {
              certificateCode: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              poNumber: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              vendor: {
                vendorName: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            },
            {
              project: {
                projectName: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  return prisma.certificate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: options.limit,
    select: {
      id: true,
      certificateCode: true,
      poNumber: true,
      contractNumber: true,
      status: true,
      issueDate: true,
      issuedAt: true,
      vendor: {
        select: {
          id: true,
          vendorName: true,
        },
      },
      project: {
        select: {
          id: true,
          projectName: true,
          projectCode: true,
        },
      },
    },
  });
}

export async function getCertificateFilterOptions() {
  const [projects, vendors] = await Promise.all([
    prisma.project.findMany({
      orderBy: {
        projectName: "asc",
      },
      select: {
        id: true,
        projectName: true,
        projectCode: true,
      },
    }),
    prisma.vendor.findMany({
      orderBy: {
        vendorName: "asc",
      },
      select: {
        id: true,
        vendorName: true,
      },
    }),
  ]);

  return {
    projects,
    vendors,
  };
}

export async function getCertificateForPdf(certificateId: string) {
  return prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      project: true,
      vendor: true,
    },
  });
}
