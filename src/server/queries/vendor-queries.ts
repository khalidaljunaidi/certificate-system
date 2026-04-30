import type {
  Prisma,
  VendorEvaluationGrade,
  VendorStatus,
} from "@prisma/client";

import type {
  VendorEvaluationPublicView,
  VendorGovernanceOptions,
  VendorPickerOption,
  VendorRegistryItem,
  VendorRegistryView,
} from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { withServerTiming } from "@/lib/server-performance";
import { hashToken } from "@/server/services/token-service";

type VendorRegistryFilters = {
  search?: string;
  categoryId?: string;
  subcategoryId?: string;
  finalGrade?: string;
  evaluationYear?: string;
  status?: string;
  activeProject?: string;
};

const VENDOR_GOVERNANCE_OPTIONS_CACHE_MS = 60_000;
const VENDOR_REGISTRY_CACHE_MS = 10_000;
let vendorGovernanceOptionsCache:
  | {
      expiresAt: number;
      value: VendorGovernanceOptions;
    }
  | null = null;
const vendorRegistryCache = new Map<
  string,
  {
    expiresAt: number;
    value: VendorRegistryItem[];
  }
>();

type VendorRegistryQueryOptions = {
  limit?: number;
};

function buildVendorRegistryWhere(
  filters: VendorRegistryFilters,
): Prisma.VendorWhereInput {
  return {
    ...(filters.search
      ? {
          OR: [
            {
              vendorName: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              vendorId: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              vendorEmail: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.subcategoryId
      ? {
          AND: [
            {
              OR: [
                { subcategoryId: filters.subcategoryId },
                {
                  subcategorySelections: {
                    some: {
                      subcategoryId: filters.subcategoryId,
                    },
                  },
                },
              ],
            },
          ],
        }
      : {}),
    ...(filters.status ? { status: filters.status as VendorStatus } : {}),
    ...(filters.finalGrade
      ? {
          evaluationCycles: {
            some: {
              finalGrade: filters.finalGrade as VendorEvaluationGrade,
            },
          },
        }
      : {}),
    ...(filters.evaluationYear
      ? {
          evaluationCycles: {
            some: {
              year: Number(filters.evaluationYear),
            },
          },
        }
      : {}),
    ...(filters.activeProject === "active"
      ? {
          projectLinks: {
            some: {
              project: {
                isArchived: false,
                status: "ACTIVE",
              },
            },
          },
        }
      : {}),
  };
}

type VendorSubcategorySelectionSnapshot = {
  id: string;
  name: string;
  externalKey: string | null;
};

function mapVendorSubcategorySelections(vendor: {
  subcategoryId?: string | null;
  subcategory?: VendorSubcategorySelectionSnapshot | null;
  subcategorySelections?: Array<{
    subcategory: VendorSubcategorySelectionSnapshot;
  }>;
}) {
  const selected =
    vendor.subcategorySelections?.map((entry) => entry.subcategory) ?? [];

  if (selected.length > 0) {
    return selected;
  }

  return vendor.subcategoryId && vendor.subcategory
    ? [vendor.subcategory]
    : [];
}

export async function getVendorRegistry(
  filters: VendorRegistryFilters = {},
  options: VendorRegistryQueryOptions = {},
): Promise<VendorRegistryItem[]> {
  const cacheKey = JSON.stringify({
    filters,
    limit: options.limit ?? null,
  });
  const cached = vendorRegistryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const vendors = await withServerTiming("vendors.registry", () =>
    prisma.vendor.findMany({
    where: buildVendorRegistryWhere(filters),
    orderBy: {
      vendorName: "asc",
    },
    take: options.limit,
    select: {
      id: true,
      vendorId: true,
      supplierId: true,
      vendorName: true,
      vendorEmail: true,
      vendorPhone: true,
      status: true,
      classification: true,
      notes: true,
      categoryId: true,
      subcategoryId: true,
      odooSyncStatus: true,
      odooPartnerId: true,
      odooSyncError: true,
      odooSyncedAt: true,
      category: {
        select: {
          name: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
          externalKey: true,
        },
      },
      _count: {
        select: {
          projectLinks: true,
          certificates: true,
        },
      },
    },
    }),
  );

  const vendorIds = vendors.map((vendor) => vendor.id);
  const [
    activeAssignmentCounts,
    issuedCertificateMetrics,
    latestEvaluationRows,
    subcategorySelectionRows,
  ] =
    vendorIds.length > 0
      ? await Promise.all([
          prisma.projectVendor.groupBy({
            by: ["vendorId"],
            where: {
              vendorId: {
                in: vendorIds,
              },
              project: {
                isArchived: false,
                status: "ACTIVE",
              },
            },
            _count: {
              _all: true,
            },
          }),
          prisma.certificate.groupBy({
            by: ["vendorId"],
            where: {
              vendorId: {
                in: vendorIds,
              },
              status: "ISSUED",
            },
            _count: {
              _all: true,
            },
            _max: {
              issuedAt: true,
            },
          }),
          prisma.vendorEvaluationCycle.findMany({
            where: {
              vendorId: {
                in: vendorIds,
              },
            },
            orderBy: [{ year: "desc" }, { createdAt: "desc" }],
            take: Math.max(vendorIds.length * 5, 25),
            select: {
              vendorId: true,
              year: true,
              status: true,
              finalGrade: true,
              finalScorePercent: true,
            },
          }),
          prisma.vendorSubcategorySelection.findMany({
            where: {
              vendorId: {
                in: vendorIds,
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              vendorId: true,
              subcategory: {
                select: {
                  id: true,
                  name: true,
                  externalKey: true,
                },
              },
            },
          }),
        ])
      : [[], [], [], []];

  const activeAssignmentsByVendorId = new Map(
    activeAssignmentCounts.map((item) => [item.vendorId, item._count._all]),
  );
  const issuedCertificateMetricsByVendorId = new Map(
    issuedCertificateMetrics.map((item) => [
      item.vendorId,
      {
        count: item._count._all,
        latestIssuedAt: item._max.issuedAt,
      },
    ]),
  );
  const latestEvaluationByVendorId = new Map<
    string,
    (typeof latestEvaluationRows)[number]
  >();

  for (const evaluation of latestEvaluationRows) {
    if (!latestEvaluationByVendorId.has(evaluation.vendorId)) {
      latestEvaluationByVendorId.set(evaluation.vendorId, evaluation);
    }
  }
  const subcategorySelectionsByVendorId = new Map<
    string,
    VendorSubcategorySelectionSnapshot[]
  >();

  for (const selection of subcategorySelectionRows) {
    const current = subcategorySelectionsByVendorId.get(selection.vendorId) ?? [];
    current.push(selection.subcategory);
    subcategorySelectionsByVendorId.set(selection.vendorId, current);
  }

  const value = vendors.map((vendor) => {
    const latestEvaluation = latestEvaluationByVendorId.get(vendor.id) ?? null;
    const subcategorySelections =
      subcategorySelectionsByVendorId.get(vendor.id) ??
      mapVendorSubcategorySelections(vendor);
    const issuedCertificateMetric = issuedCertificateMetricsByVendorId.get(vendor.id);

    return {
      id: vendor.id,
      vendorId: vendor.vendorId,
      supplierId: vendor.supplierId,
      vendorName: vendor.vendorName,
      vendorEmail: vendor.vendorEmail,
      vendorPhone: vendor.vendorPhone,
      status: vendor.status,
      classification: vendor.classification,
      notes: vendor.notes,
      categoryId: vendor.categoryId,
      categoryName: vendor.category?.name ?? null,
      subcategoryId: vendor.subcategoryId,
      subcategoryName: vendor.subcategory?.name ?? null,
      subcategorySelections,
      odooSyncStatus: vendor.odooSyncStatus,
      odooPartnerId: vendor.odooPartnerId,
      odooSyncError: vendor.odooSyncError,
      odooSyncedAt: vendor.odooSyncedAt,
      projectCount: vendor._count.projectLinks,
      activeProjectCount: activeAssignmentsByVendorId.get(vendor.id) ?? 0,
      assignmentCount: vendor._count.projectLinks,
      certificateCount: vendor._count.certificates,
      issuedCertificateCount: issuedCertificateMetric?.count ?? 0,
      latestIssuedAt: issuedCertificateMetric?.latestIssuedAt ?? null,
      latestEvaluationYear: latestEvaluation?.year ?? null,
      latestEvaluationStatus: latestEvaluation?.status ?? null,
      latestFinalGrade: latestEvaluation?.finalGrade ?? null,
      latestFinalScorePercent: latestEvaluation?.finalScorePercent
        ? Number(latestEvaluation.finalScorePercent)
        : null,
    };
  });

  vendorRegistryCache.set(cacheKey, {
    expiresAt: Date.now() + VENDOR_REGISTRY_CACHE_MS,
    value,
  });

  return value;
}

export async function getVendorGovernanceOptions(): Promise<VendorGovernanceOptions> {
  if (
    vendorGovernanceOptionsCache &&
    vendorGovernanceOptionsCache.expiresAt > Date.now()
  ) {
    return vendorGovernanceOptionsCache.value;
  }

  return withServerTiming("vendors.governanceOptions", async () => {
    const categories = await prisma.vendorCategory.findMany({
      orderBy: {
        name: "asc",
      },
      take: 50,
      select: {
        id: true,
        name: true,
        externalKey: true,
        subcategories: {
          orderBy: {
            name: "asc",
          },
          take: 250,
          select: {
            id: true,
            name: true,
            externalKey: true,
            categoryId: true,
          },
        },
      },
    });

    const value = {
      categories,
    };

    vendorGovernanceOptionsCache = {
      expiresAt: Date.now() + VENDOR_GOVERNANCE_OPTIONS_CACHE_MS,
      value,
    };

    return value;
  });
}

export async function getVendorRegistryView(
  vendorId: string,
): Promise<VendorRegistryView | null> {
  const vendor = await prisma.vendor.findUnique({
    where: {
      id: vendorId,
    },
    select: {
      id: true,
      vendorId: true,
      supplierId: true,
      vendorName: true,
      vendorEmail: true,
      vendorPhone: true,
      status: true,
      classification: true,
      notes: true,
      categoryId: true,
      subcategoryId: true,
      odooSyncStatus: true,
      odooPartnerId: true,
      odooSyncError: true,
      odooSyncedAt: true,
      category: {
        select: {
          name: true,
        },
      },
      subcategory: {
        select: {
          id: true,
          name: true,
          externalKey: true,
        },
      },
      subcategorySelections: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          subcategory: {
            select: {
              id: true,
              name: true,
              externalKey: true,
            },
          },
        },
      },
      projectLinks: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          poNumber: true,
          contractNumber: true,
          isActive: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              projectCode: true,
              projectName: true,
              status: true,
              isArchived: true,
            },
          },
          certificates: {
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
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          certificateCode: true,
          projectVendorId: true,
          poNumber: true,
          contractNumber: true,
          status: true,
          issueDate: true,
          issuedAt: true,
          isArchived: true,
          archivedAt: true,
          project: {
            select: {
              id: true,
              projectName: true,
              projectCode: true,
            },
          },
        },
      },
      evaluationCycles: {
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          year: true,
          status: true,
          finalGrade: true,
          finalScorePercent: true,
          projectManagerEmail: true,
          headOfProjectsEmail: true,
          createdAt: true,
          finalizedAt: true,
          sourceProject: {
            select: {
              id: true,
              projectName: true,
              projectCode: true,
            },
          },
          submissions: {
            orderBy: {
              submittedAt: "asc",
            },
            select: {
              id: true,
              evaluatorRole: true,
              grade: true,
              totalScorePercent: true,
              criteriaSnapshot: true,
              summary: true,
              strengths: true,
              concerns: true,
              recommendation: true,
              correctiveActions: true,
              evaluatorName: true,
              evaluatorEmail: true,
              submittedAt: true,
            },
          },
        },
      },
    },
  });

  if (!vendor) {
    return null;
  }

  const assignmentGroups = vendor.projectLinks.reduce<VendorRegistryView["assignmentGroups"]>(
    (groups, assignment) => {
      const existingGroup = groups.find(
        (group) => group.projectId === assignment.project.id,
      );

      const nextAssignment = {
        id: assignment.id,
        vendorRecordId: vendor.id,
        poNumber: assignment.poNumber,
        contractNumber: assignment.contractNumber,
        isActive: assignment.isActive,
        certificateCount: assignment.certificates.length,
        latestCertificateId: assignment.certificates[0]?.id ?? null,
        latestCertificateStatus: assignment.certificates[0]?.status ?? null,
        createdAt: assignment.createdAt,
      };

      if (existingGroup) {
        existingGroup.assignments.push(nextAssignment);
        return groups;
      }

      groups.push({
        projectId: assignment.project.id,
        projectCode: assignment.project.projectCode,
        projectName: assignment.project.projectName,
        projectStatus: assignment.project.status,
        isArchived: assignment.project.isArchived,
        assignments: [nextAssignment],
      });

      return groups;
    },
    [],
  );

  const availableSourceProjects = [
    ...new Map(
      vendor.projectLinks
        .filter((assignment) => !assignment.project.isArchived)
        .map((assignment) => [
          assignment.project.id,
          {
            id: assignment.project.id,
            projectCode: assignment.project.projectCode,
            projectName: assignment.project.projectName,
          },
        ]),
    ).values(),
  ];
  const subcategorySelections = mapVendorSubcategorySelections(vendor);

  return {
    vendor: {
      id: vendor.id,
      vendorId: vendor.vendorId,
      supplierId: vendor.supplierId,
      vendorName: vendor.vendorName,
      vendorEmail: vendor.vendorEmail,
      vendorPhone: vendor.vendorPhone,
      status: vendor.status,
      classification: vendor.classification,
      notes: vendor.notes,
      categoryId: vendor.categoryId,
      categoryName: vendor.category?.name ?? null,
      subcategoryId: vendor.subcategoryId,
      subcategoryName: vendor.subcategory?.name ?? null,
      subcategorySelections,
      odooSyncStatus: vendor.odooSyncStatus,
      odooPartnerId: vendor.odooPartnerId,
      odooSyncError: vendor.odooSyncError,
      odooSyncedAt: vendor.odooSyncedAt,
    },
    assignmentGroups,
    certificateHistory: vendor.certificates.map((certificate) => ({
      id: certificate.id,
      certificateCode: certificate.certificateCode,
      projectId: certificate.project.id,
      projectName: certificate.project.projectName,
      projectCode: certificate.project.projectCode,
      projectVendorId: certificate.projectVendorId,
      poNumber: certificate.poNumber,
      contractNumber: certificate.contractNumber,
      status: certificate.status,
      issueDate: certificate.issueDate,
      issuedAt: certificate.issuedAt,
      isArchived: certificate.isArchived,
      archivedAt: certificate.archivedAt,
    })),
    evaluationCycles: vendor.evaluationCycles.map((cycle) => ({
      id: cycle.id,
      year: cycle.year,
      status: cycle.status,
      finalGrade: cycle.finalGrade,
      finalScorePercent: cycle.finalScorePercent
        ? Number(cycle.finalScorePercent)
        : null,
      sourceProjectId: cycle.sourceProject.id,
      sourceProjectName: cycle.sourceProject.projectName,
      sourceProjectCode: cycle.sourceProject.projectCode,
      projectManagerEmail: cycle.projectManagerEmail,
      headOfProjectsEmail: cycle.headOfProjectsEmail,
      createdAt: cycle.createdAt,
      finalizedAt: cycle.finalizedAt,
      submissions: cycle.submissions.map((submission) => ({
        id: submission.id,
        evaluatorRole: submission.evaluatorRole,
        grade: submission.grade,
        totalScorePercent: submission.totalScorePercent
          ? Number(submission.totalScorePercent)
          : null,
        criteriaSnapshot: Array.isArray(submission.criteriaSnapshot)
          ? (submission.criteriaSnapshot as Array<{
              criterionId: string;
              criterionLabel: string;
              weightPercent: number;
              scoreValue: number;
              weightedScore: number;
              notes: string;
            }>)
          : null,
        summary: submission.summary,
        strengths: submission.strengths,
        concerns: submission.concerns,
        recommendation: submission.recommendation,
        correctiveActions: submission.correctiveActions,
        evaluatorName: submission.evaluatorName,
        evaluatorEmail: submission.evaluatorEmail,
        submittedAt: submission.submittedAt,
      })),
    })),
    availableSourceProjects,
  };
}

export async function getVendorEvaluationViewByToken(
  rawToken: string,
): Promise<VendorEvaluationPublicView> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.vendorEvaluationRequestToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      cycle: {
        include: {
          vendor: {
            include: {
              category: {
                select: {
                  name: true,
                },
              },
              subcategory: {
                select: {
                  name: true,
                },
              },
            },
          },
          sourceProject: true,
          submissions: true,
        },
      },
    },
  });

  if (!token) {
    return {
      cycleId: "",
      vendorId: "",
      vendorName: "",
      vendorCode: "",
      categoryName: null,
      subcategoryName: null,
      vendorStatus: null,
      sourceProjectName: "",
      sourceProjectCode: "",
      year: new Date().getFullYear(),
      evaluatorRole: null,
      evaluatorEmail: null,
      tokenStatus: "invalid",
      cycleStatus: null,
      finalGrade: null,
      submission: null,
    };
  }

  const submission =
    token.cycle.submissions.find(
      (item) => item.evaluatorRole === token.evaluatorRole,
    ) ?? null;

  const tokenStatus =
    token.usedAt && submission
      ? "used"
      : token.invalidatedAt || token.cycle.status === "COMPLETED" || submission
        ? "processed"
        : token.expiresAt < new Date()
          ? "expired"
          : "valid";

  return {
    cycleId: token.cycle.id,
    vendorId: token.cycle.vendor.id,
    vendorName: token.cycle.vendor.vendorName,
    vendorCode: token.cycle.vendor.vendorId,
    categoryName: token.cycle.vendor.category?.name ?? null,
    subcategoryName: token.cycle.vendor.subcategory?.name ?? null,
    vendorStatus: token.cycle.vendor.status,
    sourceProjectName: token.cycle.sourceProject.projectName,
    sourceProjectCode: token.cycle.sourceProject.projectCode,
    year: token.cycle.year,
    evaluatorRole: token.evaluatorRole,
    evaluatorEmail: token.email,
    tokenStatus,
    cycleStatus: token.cycle.status,
    finalGrade: token.cycle.finalGrade,
    submission: submission
      ? {
          grade: submission.grade,
          totalScorePercent: submission.totalScorePercent
            ? Number(submission.totalScorePercent)
            : null,
          evaluatorName: submission.evaluatorName,
          submittedAt: submission.submittedAt,
        }
      : null,
  };
}

export async function getVendorPickerOptions(): Promise<VendorPickerOption[]> {
  const vendors = await prisma.vendor.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      vendorName: "asc",
    },
    select: {
      id: true,
      vendorId: true,
      supplierId: true,
      vendorName: true,
      vendorEmail: true,
      vendorPhone: true,
      status: true,
      category: {
        select: {
          name: true,
        },
      },
      subcategory: {
        select: {
          name: true,
        },
      },
    },
  });

  return vendors.map((vendor) => ({
    id: vendor.id,
    vendorId: vendor.vendorId,
    supplierId: vendor.supplierId,
    vendorName: vendor.vendorName,
    vendorEmail: vendor.vendorEmail,
    vendorPhone: vendor.vendorPhone,
    status: vendor.status,
    categoryName: vendor.category?.name ?? null,
    subcategoryName: vendor.subcategory?.name ?? null,
  }));
}
