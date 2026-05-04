import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../src/lib/prisma";

loadEnvConfig(process.cwd());

const TARGET_ASSIGNMENT = {
  projectName: "SAB Annual event 2026",
  projectCode: "100003",
  vendorName: "Rosa Bella Flowers Shop",
  vendorEmail: "rosabella.fs@gmail.com",
  vendorCode: "7006624113",
  poNumber: "PO0955",
  contractNumber: "PO0955",
  amount: 14419.99,
};

const STORAGE_BUCKETS = {
  vendorRegistration:
    process.env.SUPABASE_STORAGE_BUCKET_VENDOR_REGISTRATION ??
    process.env.SUPABASE_VENDOR_REGISTRATION_ATTACHMENTS_BUCKET ??
    "vendor-registration-attachments",
  certificates: process.env.SUPABASE_STORAGE_BUCKET_CERTIFICATES ?? "certificate-pdfs",
  paymentInvoices: process.env.SUPABASE_STORAGE_BUCKET_PAYMENT_INVOICES ?? "payment-invoices",
} as const;

type CleanupAction = "delete" | "delete storage object" | "manual review" | "skip";

type SummaryRow = {
  model: string;
  action: CleanupAction;
  count: number;
  note?: string;
};

type StorageObjectRef = {
  bucket: string;
  path: string;
  source: string;
};

type ManualReviewItem = {
  model: string;
  id: string;
  reason: string;
};

type SupabaseListedItem = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type RegistrationCandidate = Awaited<ReturnType<typeof loadRegistrationCandidates>>[number];

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
  };
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function normalizeStoragePath(value: string) {
  return value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function sanitizeStorageSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .replaceAll(".", "-");

  return normalized || "unknown";
}

function jsonIncludesAny(value: unknown, needles: string[]) {
  const serialized = JSON.stringify(value ?? "");
  return needles.some((needle) => serialized.includes(needle));
}

function amountMatches(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric - TARGET_ASSIGNMENT.amount) < 0.01;
}

function printList(title: string, values: string[]) {
  console.log(`\n${title} (${values.length}):`);

  if (values.length === 0) {
    console.log("  - none");
    return;
  }

  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

function printSummary(rows: SummaryRow[]) {
  console.log("\nCleanup summary:");

  for (const row of rows) {
    const note = row.note ? ` | ${row.note}` : "";
    console.log(`- ${row.model}: ${row.count} to ${row.action}${note}`);
  }
}

function printManualReview(items: ManualReviewItem[]) {
  console.log("\nMANUAL REVIEW - skipped by script:");

  if (items.length === 0) {
    console.log("  - none");
    return;
  }

  for (const item of items) {
    console.log(`  - ${item.model} ${item.id}: ${item.reason}`);
  }
}

function normalizeSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL?.trim().replace(/^["']+|["']+$/g, "");

  if (!rawUrl) {
    return null;
  }

  const parsed = new URL(rawUrl);
  return `${parsed.protocol}//${parsed.host}`;
}

function getSupabaseAdminClient() {
  const url = normalizeSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isSupabaseFileItem(item: SupabaseListedItem) {
  const metadata = item.metadata ?? {};
  const metadataKeys = Object.keys(metadata);
  const hasFileMetadata =
    metadataKeys.length > 0 &&
    (metadataKeys.includes("mimetype") ||
      metadataKeys.includes("size") ||
      metadataKeys.includes("cacheControl") ||
      metadataKeys.includes("lastModified"));

  return Boolean(item.id || hasFileMetadata);
}

async function listSupabaseObjectsRecursively(input: {
  bucket: string;
  prefix: string;
}) {
  const client = getSupabaseAdminClient();

  if (!client) {
    console.warn(
      "Supabase storage scan skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return [];
  }

  const supabase = client;
  const objectPaths: string[] = [];
  const visitedPrefixes = new Set<string>();
  const normalizedStartPrefix = normalizeStoragePath(input.prefix).replace(/\/+$/g, "");

  async function walk(prefix: string) {
    if (visitedPrefixes.has(prefix)) {
      return;
    }

    visitedPrefixes.add(prefix);

    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(input.bucket).list(prefix, {
        limit: pageSize,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

      if (error) {
        throw new Error(
          `Failed to list Supabase objects under ${input.bucket}/${prefix}: ${error.message}`,
        );
      }

      const items = (data ?? []) as SupabaseListedItem[];

      for (const item of items) {
        const objectPath = normalizeStoragePath(`${prefix}/${item.name}`);

        if (isSupabaseFileItem(item)) {
          objectPaths.push(objectPath);
          continue;
        }

        await walk(objectPath);
      }

      if (items.length < pageSize) {
        break;
      }

      offset += pageSize;
    }
  }

  await walk(normalizedStartPrefix);
  return unique(objectPaths);
}

async function scanStoragePrefixes(input: {
  bucket: string;
  prefixes: string[];
}) {
  const objectPaths = unique(
    (
      await Promise.all(
        input.prefixes.map((prefix) =>
          listSupabaseObjectsRecursively({
            bucket: input.bucket,
            prefix,
          }).catch((error) => {
            console.warn(
              `Storage prefix scan skipped for ${input.bucket}/${prefix}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return [];
          }),
        ),
      )
    ).flat(),
  );

  return objectPaths;
}

async function deleteSupabaseObjects(input: {
  bucket: string;
  objectPaths: string[];
}) {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error(
      "Cannot delete Supabase objects because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  if (input.objectPaths.length === 0) {
    return;
  }

  const batchSize = 100;

  for (let index = 0; index < input.objectPaths.length; index += batchSize) {
    const batch = input.objectPaths.slice(index, index + batchSize);
    const { error } = await client.storage.from(input.bucket).remove(batch);

    if (error) {
      throw new Error(
        `Failed to delete Supabase objects from ${input.bucket}: ${error.message}`,
      );
    }
  }
}

function isObviousTestRegistration(candidate: RegistrationCandidate) {
  const text = [
    candidate.companyName,
    candidate.legalName,
    candidate.companyEmail,
    candidate.requestNumber,
    candidate.crNumber,
    candidate.vatNumber,
    candidate.supplierId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const explicitTerms = ["test", "demo", "dummy", "sample", "sandbox", "odoo", "qa"];
  const testEmail =
    candidate.companyEmail.toLowerCase().includes("test") ||
    candidate.companyEmail.toLowerCase().endsWith("@example.com") ||
    candidate.companyEmail.toLowerCase().endsWith("@test.com");
  const repeatedPlaceholder =
    /^[a-z]{1,2}$/.test(candidate.companyName.toLowerCase()) ||
    /^t{4,}$/i.test(candidate.companyName.trim()) ||
    /^x{4,}$/i.test(candidate.companyName.trim());

  return explicitTerms.some((term) => text.includes(term)) || testEmail || repeatedPlaceholder;
}

async function loadRegistrationCandidates(status: "APPROVED" | "REJECTED") {
  return prisma.vendorRegistrationRequest.findMany({
    where: {
      status,
    },
    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 10,
    select: {
      id: true,
      requestNumber: true,
      companyName: true,
      legalName: true,
      companyEmail: true,
      crNumber: true,
      vatNumber: true,
      status: true,
      supplierId: true,
      approvedVendorId: true,
      certificateCode: true,
      certificatePdfStoragePath: true,
      submittedAt: true,
      createdAt: true,
      attachments: {
        select: {
          id: true,
          type: true,
          fileName: true,
          storagePath: true,
        },
      },
      references: {
        select: {
          id: true,
        },
      },
      selectedCities: {
        select: {
          cityId: true,
        },
      },
      selectedSubcategories: {
        select: {
          subcategoryId: true,
        },
      },
      approvedVendor: {
        select: {
          id: true,
          vendorName: true,
          vendorEmail: true,
          vendorId: true,
          supplierId: true,
        },
      },
    },
  });
}

async function selectLatestObviousTestRegistration(status: "APPROVED" | "REJECTED") {
  const candidates = await loadRegistrationCandidates(status);
  const selected = candidates.find((candidate) => isObviousTestRegistration(candidate));

  return {
    candidates,
    selected,
  };
}

async function loadRosaAssignments() {
  const assignments = await prisma.projectVendor.findMany({
    where: {
      poNumber: TARGET_ASSIGNMENT.poNumber,
      contractNumber: TARGET_ASSIGNMENT.contractNumber,
      project: {
        projectCode: TARGET_ASSIGNMENT.projectCode,
        projectName: TARGET_ASSIGNMENT.projectName,
      },
      vendor: {
        vendorName: TARGET_ASSIGNMENT.vendorName,
        vendorEmail: TARGET_ASSIGNMENT.vendorEmail,
        vendorId: TARGET_ASSIGNMENT.vendorCode,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      projectId: true,
      vendorId: true,
      poNumber: true,
      contractNumber: true,
      poAmount: true,
      paymentAmount: true,
      isActive: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          projectCode: true,
          projectName: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorName: true,
          vendorEmail: true,
          vendorId: true,
          supplierId: true,
        },
      },
    },
  });

  for (const assignment of assignments) {
    const safeAmount =
      amountMatches(assignment.poAmount) || amountMatches(assignment.paymentAmount);

    if (!safeAmount) {
      throw new Error(
        `Safety stop: Rosa assignment ${assignment.id} matched project/vendor/PO, but amount is po=${assignment.poAmount ?? "null"} payment=${assignment.paymentAmount ?? "null"} instead of SAR ${TARGET_ASSIGNMENT.amount}.`,
      );
    }
  }

  return assignments;
}

async function loadAssignmentChildren(projectVendorIds: string[]) {
  const certificates = projectVendorIds.length
    ? await prisma.certificate.findMany({
        where: {
          projectVendorId: {
            in: projectVendorIds,
          },
          poNumber: TARGET_ASSIGNMENT.poNumber,
          contractNumber: TARGET_ASSIGNMENT.contractNumber,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          certificateCode: true,
          projectId: true,
          vendorId: true,
          projectVendorId: true,
          poNumber: true,
          contractNumber: true,
          totalAmount: true,
          status: true,
          pdfStoragePath: true,
        },
      })
    : [];

  for (const certificate of certificates) {
    if (
      certificate.poNumber !== TARGET_ASSIGNMENT.poNumber ||
      certificate.contractNumber !== TARGET_ASSIGNMENT.contractNumber ||
      !amountMatches(certificate.totalAmount)
    ) {
      throw new Error(
        `Safety stop: certificate ${certificate.id} did not match exact PO/contract/amount target.`,
      );
    }
  }

  const certificateIds = certificates.map((certificate) => certificate.id);

  const paymentInstallments = projectVendorIds.length
    ? await prisma.projectVendorPaymentInstallment.findMany({
        where: {
          projectVendorId: {
            in: projectVendorIds,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          projectVendorId: true,
          invoiceNumber: true,
          invoiceStoragePath: true,
          amount: true,
          status: true,
        },
      })
    : [];

  const approvalTokens = certificateIds.length
    ? await prisma.approvalToken.findMany({
        where: {
          certificateId: {
            in: certificateIds,
          },
        },
        select: {
          id: true,
          certificateId: true,
          actionType: true,
        },
      })
    : [];

  const operationalTasks =
    projectVendorIds.length || certificateIds.length
      ? await prisma.operationalTask.findMany({
          where: {
            OR: [
              ...(projectVendorIds.length
                ? [
                    {
                      linkedProjectVendorId: {
                        in: projectVendorIds,
                      },
                    },
                  ]
                : []),
              ...(certificateIds.length
                ? [
                    {
                      linkedCertificateId: {
                        in: certificateIds,
                      },
                    },
                  ]
                : []),
            ],
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            title: true,
            linkedProjectId: true,
            linkedVendorId: true,
            linkedProjectVendorId: true,
            linkedCertificateId: true,
          },
        })
      : [];

  return {
    certificates,
    paymentInstallments,
    approvalTokens,
    operationalTasks,
  };
}

async function canDeleteVendor(input: {
  vendorId: string;
  allowedRegistrationRequestIds: string[];
  allowedProjectVendorIds: string[];
  allowedCertificateIds: string[];
  allowedTaskIds: string[];
}) {
  const [
    otherRegistrationRequests,
    otherProjectLinks,
    otherCertificates,
    evaluationCycles,
    otherOperationalTasks,
  ] = await Promise.all([
    prisma.vendorRegistrationRequest.count({
      where: {
        approvedVendorId: input.vendorId,
        NOT: input.allowedRegistrationRequestIds.length
          ? {
              id: {
                in: input.allowedRegistrationRequestIds,
              },
            }
          : undefined,
      },
    }),
    prisma.projectVendor.count({
      where: {
        vendorId: input.vendorId,
        NOT: input.allowedProjectVendorIds.length
          ? {
              id: {
                in: input.allowedProjectVendorIds,
              },
            }
          : undefined,
      },
    }),
    prisma.certificate.count({
      where: {
        vendorId: input.vendorId,
        NOT: input.allowedCertificateIds.length
          ? {
              id: {
                in: input.allowedCertificateIds,
              },
            }
          : undefined,
      },
    }),
    prisma.vendorEvaluationCycle.count({
      where: {
        vendorId: input.vendorId,
      },
    }),
    prisma.operationalTask.count({
      where: {
        linkedVendorId: input.vendorId,
        NOT: input.allowedTaskIds.length
          ? {
              id: {
                in: input.allowedTaskIds,
              },
            }
          : undefined,
      },
    }),
  ]);

  const blockers = {
    otherRegistrationRequests,
    otherProjectLinks,
    otherCertificates,
    evaluationCycles,
    otherOperationalTasks,
  };

  return {
    safe: Object.values(blockers).every((count) => count === 0),
    blockers,
  };
}

async function collectCleanupScope() {
  const [
    rosaAssignments,
    approvedRegistrationResult,
    rejectedRegistrationResult,
  ] = await Promise.all([
    loadRosaAssignments(),
    selectLatestObviousTestRegistration("APPROVED"),
    selectLatestObviousTestRegistration("REJECTED"),
  ]);

  const projectVendorIds = rosaAssignments.map((assignment) => assignment.id);
  const assignmentChildren = await loadAssignmentChildren(projectVendorIds);
  const certificateIds = assignmentChildren.certificates.map((certificate) => certificate.id);
  const paymentInstallmentIds = assignmentChildren.paymentInstallments.map(
    (installment) => installment.id,
  );
  const approvalTokenIds = assignmentChildren.approvalTokens.map((token) => token.id);
  const operationalTaskIds = assignmentChildren.operationalTasks.map((task) => task.id);

  const selectedRegistrations = unique([
    approvedRegistrationResult.selected?.id,
    rejectedRegistrationResult.selected?.id,
  ]);
  const registrationRequests = [
    approvedRegistrationResult.selected,
    rejectedRegistrationResult.selected,
  ].filter((request): request is RegistrationCandidate => Boolean(request));
  const registrationRequestNumbers = registrationRequests.map((request) => request.requestNumber);
  const registrationAttachmentIds = registrationRequests.flatMap((request) =>
    request.attachments.map((attachment) => attachment.id),
  );
  const registrationReferenceIds = registrationRequests.flatMap((request) =>
    request.references.map((reference) => reference.id),
  );
  const registrationCityIds = registrationRequests.flatMap((request) =>
    request.selectedCities.map((selection) => `${request.id}:${selection.cityId}`),
  );
  const registrationSubcategoryIds = registrationRequests.flatMap((request) =>
    request.selectedSubcategories.map(
      (selection) => `${request.id}:${selection.subcategoryId}`,
    ),
  );

  const allowedVendorIds = unique([
    ...rosaAssignments.map((assignment) => assignment.vendorId),
    ...registrationRequests.map((request) => request.approvedVendorId),
  ]);
  const manualReview: ManualReviewItem[] = [];
  const vendorsToDelete: string[] = [];

  for (const vendorId of allowedVendorIds) {
    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      select: {
        id: true,
        vendorName: true,
        vendorEmail: true,
        vendorId: true,
        supplierId: true,
      },
    });

    if (!vendor) {
      continue;
    }

    const isRosaVendor =
      vendor.vendorName === TARGET_ASSIGNMENT.vendorName &&
      vendor.vendorEmail === TARGET_ASSIGNMENT.vendorEmail &&
      vendor.vendorId === TARGET_ASSIGNMENT.vendorCode;
    const isRegistrationApprovedVendor = registrationRequests.some(
      (request) => request.approvedVendorId === vendor.id,
    );

    if (!isRosaVendor && !isRegistrationApprovedVendor) {
      manualReview.push({
        model: "Vendor",
        id: vendor.id,
        reason: "vendor is not exact Rosa target and is not approvedVendorId for selected test registrations",
      });
      continue;
    }

    const vendorSafety = await canDeleteVendor({
      vendorId: vendor.id,
      allowedRegistrationRequestIds: selectedRegistrations,
      allowedProjectVendorIds: projectVendorIds,
      allowedCertificateIds: certificateIds,
      allowedTaskIds: operationalTaskIds,
    });

    if (vendorSafety.safe) {
      vendorsToDelete.push(vendor.id);
    } else {
      manualReview.push({
        model: "Vendor",
        id: vendor.id,
        reason: `not deleted because unrelated links exist: ${JSON.stringify(vendorSafety.blockers)}`,
      });
    }
  }

  const exactNeedles = unique([
    TARGET_ASSIGNMENT.poNumber,
    TARGET_ASSIGNMENT.contractNumber,
    ...projectVendorIds,
    ...certificateIds,
    ...paymentInstallmentIds,
    ...approvalTokenIds,
    ...operationalTaskIds,
    ...selectedRegistrations,
    ...registrationRequestNumbers,
    ...registrationAttachmentIds,
    ...registrationRequests.map((request) => request.certificateCode),
    ...registrationRequests.map((request) => request.certificatePdfStoragePath),
  ]);

  const notifications =
    exactNeedles.length || vendorsToDelete.length
      ? await prisma.notification.findMany({
          where: {
            OR: [
              ...(projectVendorIds.length
                ? [
                    {
                      relatedProjectVendorId: {
                        in: projectVendorIds,
                      },
                    },
                  ]
                : []),
              ...(certificateIds.length
                ? [
                    {
                      relatedCertificateId: {
                        in: certificateIds,
                      },
                    },
                  ]
                : []),
              ...(operationalTaskIds.length
                ? [
                    {
                      relatedTaskId: {
                        in: operationalTaskIds,
                      },
                    },
                  ]
                : []),
              ...(vendorsToDelete.length
                ? [
                    {
                      relatedVendorId: {
                        in: vendorsToDelete,
                      },
                    },
                  ]
                : []),
              ...exactNeedles.flatMap((needle) => [
                {
                  href: {
                    contains: needle,
                  },
                },
                {
                  title: {
                    contains: needle,
                  },
                },
                {
                  message: {
                    contains: needle,
                  },
                },
              ]),
            ],
          },
          select: {
            id: true,
            title: true,
            relatedVendorId: true,
            relatedProjectVendorId: true,
            relatedCertificateId: true,
            relatedTaskId: true,
            dispatchLogId: true,
          },
        })
      : [];
  const notificationIds = notifications.map((notification) => notification.id);
  const dispatchLogIdsFromNotifications = unique(
    notifications.map((notification) => notification.dispatchLogId),
  );

  const dispatchLogs =
    exactNeedles.length ||
    vendorsToDelete.length ||
    dispatchLogIdsFromNotifications.length
      ? await prisma.notificationDispatchLog.findMany({
          where: {
            OR: [
              ...(dispatchLogIdsFromNotifications.length
                ? [
                    {
                      id: {
                        in: dispatchLogIdsFromNotifications,
                      },
                    },
                  ]
                : []),
              ...(projectVendorIds.length
                ? [
                    {
                      relatedProjectVendorId: {
                        in: projectVendorIds,
                      },
                    },
                  ]
                : []),
              ...(certificateIds.length
                ? [
                    {
                      relatedCertificateId: {
                        in: certificateIds,
                      },
                    },
                  ]
                : []),
              ...(operationalTaskIds.length
                ? [
                    {
                      relatedTaskId: {
                        in: operationalTaskIds,
                      },
                    },
                  ]
                : []),
              ...(vendorsToDelete.length
                ? [
                    {
                      relatedVendorId: {
                        in: vendorsToDelete,
                      },
                    },
                  ]
                : []),
              ...exactNeedles.map((needle) => ({
                linkHref: {
                  contains: needle,
                },
              })),
            ],
          },
          select: {
            id: true,
            eventKey: true,
            relatedVendorId: true,
            relatedProjectVendorId: true,
            relatedCertificateId: true,
            relatedTaskId: true,
            linkHref: true,
          },
        })
      : [];
  const dispatchLogIds = dispatchLogs.map((dispatchLog) => dispatchLog.id);

  const auditCandidates = exactNeedles.length
    ? await prisma.auditLog.findMany({
        where: {
          OR: [
            {
              entityId: {
                in: exactNeedles,
              },
            },
            ...(certificateIds.length
              ? [
                  {
                    certificateId: {
                      in: certificateIds,
                    },
                  },
                ]
              : []),
            {
              entityType: {
                contains: "VendorRegistration",
              },
            },
          ],
        },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          certificateId: true,
          details: true,
        },
      })
    : [];
  const auditLogs = auditCandidates.filter(
    (auditLog) =>
      exactNeedles.includes(auditLog.entityId) ||
      (auditLog.certificateId ? certificateIds.includes(auditLog.certificateId) : false) ||
      jsonIncludesAny(auditLog, exactNeedles),
  );
  const auditLogIds = auditLogs.map((auditLog) => auditLog.id);

  const systemErrorCandidates = exactNeedles.length
    ? await prisma.systemErrorLog.findMany({
        where: {
          OR: [
            {
              action: {
                contains: "Vendor",
              },
            },
            {
              action: {
                contains: "Certificate",
              },
            },
            ...exactNeedles.map((needle) => ({
              errorMessage: {
                contains: needle,
              },
            })),
          ],
        },
        select: {
          id: true,
          action: true,
          errorMessage: true,
          context: true,
        },
      })
    : [];
  const systemErrorLogs = systemErrorCandidates.filter((systemErrorLog) =>
    jsonIncludesAny(systemErrorLog, exactNeedles),
  );
  const systemErrorLogIds = systemErrorLogs.map((systemErrorLog) => systemErrorLog.id);

  const vendorRegistrationPrefixes = registrationRequestNumbers.flatMap((requestNumber) => [
    `vendor-registration/${requestNumber}`,
    `vendor-registration/${sanitizeStorageSegment(requestNumber)}`,
    `vendor-registrations/${requestNumber}`,
    `vendor-registrations/${sanitizeStorageSegment(requestNumber)}`,
    `vendor-registration/vendor-registration/${requestNumber}`,
    `vendor-registration/vendor-registration/${sanitizeStorageSegment(requestNumber)}`,
  ]);
  const certificatePrefixes = [
    ...certificateIds.map((certificateId) => `certificates/${sanitizeStorageSegment(certificateId)}`),
  ];
  const paymentInvoicePrefixes = projectVendorIds.map(
    (projectVendorId) => `payments/${sanitizeStorageSegment(projectVendorId)}/invoices`,
  );

  const [
    scannedVendorRegistrationStorage,
    scannedCertificateStorage,
    scannedPaymentInvoiceStorage,
  ] = await Promise.all([
    scanStoragePrefixes({
      bucket: STORAGE_BUCKETS.vendorRegistration,
      prefixes: unique(vendorRegistrationPrefixes),
    }),
    scanStoragePrefixes({
      bucket: STORAGE_BUCKETS.certificates,
      prefixes: unique(certificatePrefixes),
    }),
    scanStoragePrefixes({
      bucket: STORAGE_BUCKETS.paymentInvoices,
      prefixes: unique(paymentInvoicePrefixes),
    }),
  ]);

  const storageObjects: StorageObjectRef[] = [
    ...registrationRequests.flatMap((request) =>
      request.attachments.map((attachment) => ({
        bucket: STORAGE_BUCKETS.vendorRegistration,
        path: attachment.storagePath,
        source: `Vendor registration ${request.requestNumber} ${attachment.type}`,
      })),
    ),
    ...registrationRequests
      .filter((request) => Boolean(request.certificatePdfStoragePath))
      .map((request) => ({
        bucket: STORAGE_BUCKETS.certificates,
        path: request.certificatePdfStoragePath as string,
        source: `Vendor registration certificate ${request.requestNumber}`,
      })),
    ...registrationRequestNumbers.map((requestNumber) => ({
      bucket: STORAGE_BUCKETS.certificates,
      path: `vendor-registration-certificates/${sanitizeStorageSegment(requestNumber)}.pdf`,
      source: `Vendor registration certificate fallback ${requestNumber}`,
    })),
    ...assignmentChildren.certificates
      .filter((certificate) => Boolean(certificate.pdfStoragePath))
      .map((certificate) => ({
        bucket: STORAGE_BUCKETS.certificates,
        path: certificate.pdfStoragePath as string,
        source: `Project certificate ${certificate.certificateCode}`,
      })),
    ...assignmentChildren.paymentInstallments
      .filter((installment) => Boolean(installment.invoiceStoragePath))
      .map((installment) => ({
        bucket: STORAGE_BUCKETS.paymentInvoices,
        path: installment.invoiceStoragePath as string,
        source: `Payment installment ${installment.id}`,
      })),
    ...scannedVendorRegistrationStorage.map((path) => ({
      bucket: STORAGE_BUCKETS.vendorRegistration,
      path,
      source: "Vendor registration prefix scan",
    })),
    ...scannedCertificateStorage.map((path) => ({
      bucket: STORAGE_BUCKETS.certificates,
      path,
      source: "Certificate prefix scan",
    })),
    ...scannedPaymentInvoiceStorage.map((path) => ({
      bucket: STORAGE_BUCKETS.paymentInvoices,
      path,
      source: "Payment invoice prefix scan",
    })),
  ].map((object) => ({
    ...object,
    path: normalizeStoragePath(object.path),
  }));

  const storageObjectsByKey = new Map<string, StorageObjectRef>();
  for (const object of storageObjects) {
    storageObjectsByKey.set(`${object.bucket}/${object.path}`, object);
  }

  if (!approvedRegistrationResult.selected) {
    manualReview.push({
      model: "VendorRegistrationRequest",
      id: "latest APPROVED",
      reason: "no recent APPROVED registration candidate looked like obvious test/demo data",
    });
  }

  if (!rejectedRegistrationResult.selected) {
    manualReview.push({
      model: "VendorRegistrationRequest",
      id: "latest REJECTED",
      reason: "no recent REJECTED registration candidate looked like obvious test/demo data",
    });
  }

  return {
    rosaAssignments,
    approvedRegistrationResult,
    rejectedRegistrationResult,
    registrationRequests,
    selectedRegistrations,
    registrationRequestNumbers,
    registrationAttachmentIds,
    registrationReferenceIds,
    registrationCityIds,
    registrationSubcategoryIds,
    projectVendorIds,
    certificates: assignmentChildren.certificates,
    certificateIds,
    paymentInstallments: assignmentChildren.paymentInstallments,
    paymentInstallmentIds,
    approvalTokens: assignmentChildren.approvalTokens,
    approvalTokenIds,
    operationalTasks: assignmentChildren.operationalTasks,
    operationalTaskIds,
    notifications,
    notificationIds,
    dispatchLogs,
    dispatchLogIds,
    auditLogs,
    auditLogIds,
    systemErrorLogs,
    systemErrorLogIds,
    vendorsToDelete,
    storagePrefixes: {
      vendorRegistration: unique(vendorRegistrationPrefixes),
      certificates: unique(certificatePrefixes),
      paymentInvoices: unique(paymentInvoicePrefixes),
    },
    storageObjects: Array.from(storageObjectsByKey.values()),
    manualReview,
  };
}

function buildSummary(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  return [
    {
      model: "Notification",
      action: "delete",
      count: scope.notificationIds.length,
    },
    {
      model: "NotificationDispatchLog",
      action: "delete",
      count: scope.dispatchLogIds.length,
    },
    {
      model: "AuditLog",
      action: "delete",
      count: scope.auditLogIds.length,
      note: "only exact entity/certificate/request relations",
    },
    {
      model: "SystemErrorLog",
      action: "delete",
      count: scope.systemErrorLogIds.length,
      note: "only exact IDs/request numbers in context/message",
    },
    {
      model: "TaskChecklistItem",
      action: "delete",
      count: scope.operationalTaskIds.length,
      note: "count shown by parent task count",
    },
    {
      model: "OperationalTask",
      action: "delete",
      count: scope.operationalTaskIds.length,
    },
    {
      model: "ApprovalToken",
      action: "delete",
      count: scope.approvalTokenIds.length,
    },
    {
      model: "ProjectVendorPaymentInstallment",
      action: "delete",
      count: scope.paymentInstallmentIds.length,
    },
    {
      model: "Certificate",
      action: "delete",
      count: scope.certificateIds.length,
      note: "PO0955 only",
    },
    {
      model: "ProjectVendor",
      action: "delete",
      count: scope.projectVendorIds.length,
      note: "exact Rosa Bella / PO0955 assignment only",
    },
    {
      model: "VendorRegistrationRequestSubcategory",
      action: "delete",
      count: scope.registrationSubcategoryIds.length,
    },
    {
      model: "VendorRegistrationRequestCity",
      action: "delete",
      count: scope.registrationCityIds.length,
    },
    {
      model: "VendorRegistrationReference",
      action: "delete",
      count: scope.registrationReferenceIds.length,
    },
    {
      model: "VendorRegistrationAttachment",
      action: "delete",
      count: scope.registrationAttachmentIds.length,
    },
    {
      model: "VendorRegistrationRequest",
      action: "delete",
      count: scope.selectedRegistrations.length,
      note: "latest obvious test APPROVED/REJECTED only",
    },
    {
      model: "Vendor",
      action: scope.vendorsToDelete.length > 0 ? "delete" : "skip",
      count: scope.vendorsToDelete.length,
      note: "only if exact Rosa or selected request approved vendor and no unrelated history",
    },
    {
      model: "Storage files",
      action: "delete storage object",
      count: scope.storageObjects.length,
      note: "exact DB paths plus safe target prefixes",
    },
    {
      model: "Manual review records",
      action: "manual review",
      count: scope.manualReview.length,
      note: "printed and skipped",
    },
    {
      model: "Project",
      action: "skip",
      count: 0,
      note: "project records are never deleted",
    },
  ] satisfies SummaryRow[];
}

function printRegistrationCandidates(
  label: string,
  candidates: RegistrationCandidate[],
  selected?: RegistrationCandidate,
) {
  printList(
    `${label} candidates`,
    candidates.map(
      (candidate) =>
        `${candidate.id} | ${candidate.requestNumber} | ${candidate.status} | ${candidate.companyName} | ${candidate.companyEmail} | submitted ${candidate.submittedAt.toISOString()} | obviousTest=${isObviousTestRegistration(candidate) ? "yes" : "no"}`,
    ),
  );

  console.log(
    `Selected ${label}: ${
      selected
        ? `${selected.id} | ${selected.requestNumber} | ${selected.companyName}`
        : "none - skipped"
    }`,
  );
}

function printDetailedScope(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  console.log("\nExact target assignment:");
  console.log(`- Project: ${TARGET_ASSIGNMENT.projectName} (${TARGET_ASSIGNMENT.projectCode})`);
  console.log(`- Vendor: ${TARGET_ASSIGNMENT.vendorName}`);
  console.log(`- Email: ${TARGET_ASSIGNMENT.vendorEmail}`);
  console.log(`- Vendor code: ${TARGET_ASSIGNMENT.vendorCode}`);
  console.log(`- PO / Contract: ${TARGET_ASSIGNMENT.poNumber} / ${TARGET_ASSIGNMENT.contractNumber}`);
  console.log(`- Amount: SAR ${TARGET_ASSIGNMENT.amount.toFixed(2)}`);

  printRegistrationCandidates(
    "latest APPROVED test registration",
    scope.approvedRegistrationResult.candidates,
    scope.approvedRegistrationResult.selected,
  );
  printRegistrationCandidates(
    "latest REJECTED test registration",
    scope.rejectedRegistrationResult.candidates,
    scope.rejectedRegistrationResult.selected,
  );

  printList(
    "ProjectVendor assignment IDs",
    scope.rosaAssignments.map(
      (assignment) =>
        `${assignment.id} | ${assignment.project.projectName} (${assignment.project.projectCode}) | ${assignment.vendor.vendorName} ${assignment.vendor.vendorEmail} ${assignment.vendor.vendorId} | PO ${assignment.poNumber} | Contract ${assignment.contractNumber} | poAmount ${assignment.poAmount ?? "null"} | paymentAmount ${assignment.paymentAmount ?? "null"}`,
    ),
  );
  printList(
    "Selected VendorRegistrationRequest IDs",
    scope.registrationRequests.map(
      (request) =>
        `${request.id} | ${request.requestNumber} | ${request.status} | ${request.companyName} | approvedVendorId ${request.approvedVendorId ?? "none"}`,
    ),
  );
  printList("VendorRegistrationAttachment IDs", scope.registrationAttachmentIds);
  printList("VendorRegistrationReference IDs", scope.registrationReferenceIds);
  printList("VendorRegistrationRequestCity pairs", scope.registrationCityIds);
  printList("VendorRegistrationRequestSubcategory pairs", scope.registrationSubcategoryIds);
  printList(
    "Certificates linked to PO0955",
    scope.certificates.map(
      (certificate) =>
        `${certificate.id} | ${certificate.certificateCode} | ${certificate.status} | amount ${certificate.totalAmount} | storage ${certificate.pdfStoragePath ?? "none"}`,
    ),
  );
  printList(
    "Payment installments linked to PO0955 assignment",
    scope.paymentInstallments.map(
      (installment) =>
        `${installment.id} | assignment ${installment.projectVendorId} | invoice ${installment.invoiceNumber ?? "none"} | amount ${installment.amount} | status ${installment.status} | storage ${installment.invoiceStoragePath ?? "none"}`,
    ),
  );
  printList(
    "Approval tokens",
    scope.approvalTokens.map(
      (token) => `${token.id} | certificate ${token.certificateId} | ${token.actionType}`,
    ),
  );
  printList(
    "Operational tasks",
    scope.operationalTasks.map(
      (task) =>
        `${task.id} | ${task.title} | assignment ${task.linkedProjectVendorId ?? "none"} | certificate ${task.linkedCertificateId ?? "none"}`,
    ),
  );
  printList(
    "Notifications",
    scope.notifications.map(
      (notification) =>
        `${notification.id} | ${notification.title} | vendor ${notification.relatedVendorId ?? "none"} | assignment ${notification.relatedProjectVendorId ?? "none"} | certificate ${notification.relatedCertificateId ?? "none"} | task ${notification.relatedTaskId ?? "none"}`,
    ),
  );
  printList(
    "NotificationDispatchLog IDs",
    scope.dispatchLogs.map(
      (dispatchLog) =>
        `${dispatchLog.id} | ${dispatchLog.eventKey} | vendor ${dispatchLog.relatedVendorId ?? "none"} | assignment ${dispatchLog.relatedProjectVendorId ?? "none"} | certificate ${dispatchLog.relatedCertificateId ?? "none"} | task ${dispatchLog.relatedTaskId ?? "none"} | href ${dispatchLog.linkHref ?? "none"}`,
    ),
  );
  printList(
    "AuditLog IDs",
    scope.auditLogs.map(
      (auditLog) =>
        `${auditLog.id} | ${auditLog.action} | ${auditLog.entityType}:${auditLog.entityId} | certificate ${auditLog.certificateId ?? "none"}`,
    ),
  );
  printList(
    "SystemErrorLog IDs",
    scope.systemErrorLogs.map(
      (systemErrorLog) =>
        `${systemErrorLog.id} | ${systemErrorLog.action} | ${systemErrorLog.errorMessage.slice(0, 120)}`,
    ),
  );
  printList("Vendor IDs safe to delete", scope.vendorsToDelete);
  printList("Vendor registration storage prefixes scanned", scope.storagePrefixes.vendorRegistration);
  printList("Certificate storage prefixes scanned", scope.storagePrefixes.certificates);
  printList("Payment invoice storage prefixes scanned", scope.storagePrefixes.paymentInvoices);
  printList(
    "Storage objects to delete",
    scope.storageObjects.map((object) => `${object.bucket}/${object.path} | ${object.source}`),
  );
  printManualReview(scope.manualReview);
}

async function executeDatabaseCleanup(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  await prisma.$transaction(
    async (tx) => {
      if (scope.notificationIds.length > 0) {
        await tx.notification.deleteMany({
          where: {
            id: {
              in: scope.notificationIds,
            },
          },
        });
      }

      if (scope.dispatchLogIds.length > 0) {
        await tx.notificationDispatchLog.deleteMany({
          where: {
            id: {
              in: scope.dispatchLogIds,
            },
          },
        });
      }

      if (scope.auditLogIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: {
            id: {
              in: scope.auditLogIds,
            },
          },
        });
      }

      if (scope.systemErrorLogIds.length > 0) {
        await tx.systemErrorLog.deleteMany({
          where: {
            id: {
              in: scope.systemErrorLogIds,
            },
          },
        });
      }

      if (scope.operationalTaskIds.length > 0) {
        await tx.taskChecklistItem.deleteMany({
          where: {
            taskId: {
              in: scope.operationalTaskIds,
            },
          },
        });

        await tx.operationalTask.deleteMany({
          where: {
            id: {
              in: scope.operationalTaskIds,
            },
          },
        });
      }

      if (scope.approvalTokenIds.length > 0) {
        await tx.approvalToken.deleteMany({
          where: {
            id: {
              in: scope.approvalTokenIds,
            },
          },
        });
      }

      if (scope.paymentInstallmentIds.length > 0) {
        await tx.projectVendorPaymentInstallment.deleteMany({
          where: {
            id: {
              in: scope.paymentInstallmentIds,
            },
          },
        });
      }

      if (scope.certificateIds.length > 0) {
        await tx.certificate.deleteMany({
          where: {
            id: {
              in: scope.certificateIds,
            },
          },
        });
      }

      if (scope.projectVendorIds.length > 0) {
        await tx.projectVendor.deleteMany({
          where: {
            id: {
              in: scope.projectVendorIds,
            },
          },
        });
      }

      if (scope.selectedRegistrations.length > 0) {
        await tx.vendorRegistrationRequestSubcategory.deleteMany({
          where: {
            requestId: {
              in: scope.selectedRegistrations,
            },
          },
        });

        await tx.vendorRegistrationRequestCity.deleteMany({
          where: {
            requestId: {
              in: scope.selectedRegistrations,
            },
          },
        });

        await tx.vendorRegistrationReference.deleteMany({
          where: {
            requestId: {
              in: scope.selectedRegistrations,
            },
          },
        });

        await tx.vendorRegistrationAttachment.deleteMany({
          where: {
            requestId: {
              in: scope.selectedRegistrations,
            },
          },
        });

        await tx.vendorRegistrationRequest.deleteMany({
          where: {
            id: {
              in: scope.selectedRegistrations,
            },
          },
        });
      }

      if (scope.vendorsToDelete.length > 0) {
        await tx.vendorSubcategorySelection.deleteMany({
          where: {
            vendorId: {
              in: scope.vendorsToDelete,
            },
          },
        });

        await tx.vendor.deleteMany({
          where: {
            id: {
              in: scope.vendorsToDelete,
            },
          },
        });
      }
    },
    {
      timeout: 20000,
    },
  );
}

async function executeStorageCleanup(storageObjects: StorageObjectRef[]) {
  const grouped = new Map<string, string[]>();

  for (const object of storageObjects) {
    grouped.set(object.bucket, [...(grouped.get(object.bucket) ?? []), object.path]);
  }

  for (const [bucket, paths] of grouped.entries()) {
    await deleteSupabaseObjects({
      bucket,
      objectPaths: unique(paths),
    });
  }
}

async function printPostChecks(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  const [
    rosaAssignments,
    selectedRequests,
    selectedAttachments,
    targetCertificates,
    targetPaymentInstallments,
    targetNotifications,
  ] = await Promise.all([
    prisma.projectVendor.count({
      where: {
        id: {
          in: scope.projectVendorIds,
        },
      },
    }),
    prisma.vendorRegistrationRequest.count({
      where: {
        id: {
          in: scope.selectedRegistrations,
        },
      },
    }),
    prisma.vendorRegistrationAttachment.count({
      where: {
        requestId: {
          in: scope.selectedRegistrations,
        },
      },
    }),
    prisma.certificate.count({
      where: {
        id: {
          in: scope.certificateIds,
        },
      },
    }),
    prisma.projectVendorPaymentInstallment.count({
      where: {
        id: {
          in: scope.paymentInstallmentIds,
        },
      },
    }),
    prisma.notification.count({
      where: {
        id: {
          in: scope.notificationIds,
        },
      },
    }),
  ]);

  console.log("\nPost-cleanup checks:");
  console.log(`- Rosa PO0955 assignments: ${rosaAssignments}`);
  console.log(`- Selected vendor registration requests: ${selectedRequests}`);
  console.log(`- Selected vendor registration attachments: ${selectedAttachments}`);
  console.log(`- Target certificates: ${targetCertificates}`);
  console.log(`- Target payment installments: ${targetPaymentInstallments}`);
  console.log(`- Target notifications by ID: ${targetNotifications}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scope = await collectCleanupScope();

  printSummary(buildSummary(scope));
  printDetailedScope(scope);

  if (!args.confirm) {
    console.log("\nDry run only. Re-run with --confirm to execute deletion.");
    return;
  }

  console.log("\n--confirm received. Executing exact-match database cleanup...");
  await executeDatabaseCleanup(scope);

  console.log("Executing storage cleanup...");
  await executeStorageCleanup(scope.storageObjects);
  await printPostChecks(scope);
}

main()
  .catch((error) => {
    console.error("Latest test vendor data cleanup failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
