import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/prisma";

loadEnvConfig(process.cwd());

const TARGET = {
  supplierName: "Test vendor Odoo",
  requestNumber: "VR-20260430-0A0FA2",
  supplierId: "SA-EV-AVL-000001",
  certificateCode: "TG-SUP-CERT-2026-000001",
};

type SummaryRow = {
  model: string;
  action: "delete" | "anonymize" | "delete local file";
  count: number;
  note?: string;
};

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
  };
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function jsonIncludesAny(value: unknown, needles: string[]) {
  return needles.some((needle) => JSON.stringify(value ?? "").includes(needle));
}

function printSummary(rows: SummaryRow[]) {
  console.log("\nCleanup summary:");
  for (const row of rows) {
    const note = row.note ? ` | ${row.note}` : "";
    console.log(`- ${row.model}: ${row.count} to ${row.action}${note}`);
  }
}

function assertSafeTarget(request: Awaited<ReturnType<typeof loadTargetRequest>>) {
  if (!request) {
    return;
  }

  if (request.companyName !== TARGET.supplierName) {
    throw new Error(
      `Safety stop: request ${TARGET.requestNumber} belongs to "${request.companyName}", not "${TARGET.supplierName}".`,
    );
  }

  if (request.supplierId && request.supplierId !== TARGET.supplierId) {
    throw new Error(
      `Safety stop: supplier ID mismatch. Found ${request.supplierId}, expected ${TARGET.supplierId}.`,
    );
  }

  if (request.certificateCode && request.certificateCode !== TARGET.certificateCode) {
    throw new Error(
      `Safety stop: certificate code mismatch. Found ${request.certificateCode}, expected ${TARGET.certificateCode}.`,
    );
  }
}

async function loadTargetRequest() {
  return prisma.vendorRegistrationRequest.findUnique({
    where: {
      requestNumber: TARGET.requestNumber,
    },
    include: {
      attachments: {
        select: {
          id: true,
          storagePath: true,
        },
      },
    },
  });
}

function resolveLocalStoragePath(storagePath: string) {
  const root = path.join(process.cwd(), ".storage");
  const resolvedPath = path.resolve(root, storagePath);

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe storage path: ${storagePath}`);
  }

  return resolvedPath;
}

async function deleteLocalStorageFiles(storagePaths: string[]) {
  for (const storagePath of storagePaths) {
    const targetPath = resolveLocalStoragePath(storagePath);
    await fs.rm(targetPath, {
      force: true,
    });
  }
}

async function collectCleanupScope(request: NonNullable<Awaited<ReturnType<typeof loadTargetRequest>>>) {
  const vendorCandidates = await prisma.vendor.findMany({
    where: {
      OR: [
        ...(request.approvedVendorId
          ? [
              {
                id: request.approvedVendorId,
              },
            ]
          : []),
        {
          vendorName: TARGET.supplierName,
          supplierId: TARGET.supplierId,
        },
      ],
    },
    select: {
      id: true,
      vendorName: true,
      supplierId: true,
      vendorEmail: true,
    },
  });

  for (const vendor of vendorCandidates) {
    if (vendor.vendorName !== TARGET.supplierName || vendor.supplierId !== TARGET.supplierId) {
      throw new Error(
        `Safety stop: matched vendor ${vendor.id} is not the exact test supplier target.`,
      );
    }
  }

  const vendorIds = vendorCandidates.map((vendor) => vendor.id);
  const projectVendors = vendorIds.length
    ? await prisma.projectVendor.findMany({
        where: {
          vendorId: {
            in: vendorIds,
          },
        },
        select: {
          id: true,
        },
      })
    : [];
  const projectVendorIds = projectVendors.map((entry) => entry.id);

  const certificates =
    vendorIds.length || projectVendorIds.length
      ? await prisma.certificate.findMany({
          where: {
            OR: [
              ...(vendorIds.length
                ? [
                    {
                      vendorId: {
                        in: vendorIds,
                      },
                    },
                  ]
                : []),
              ...(projectVendorIds.length
                ? [
                    {
                      projectVendorId: {
                        in: projectVendorIds,
                      },
                    },
                  ]
                : []),
            ],
          },
          select: {
            id: true,
            pdfStoragePath: true,
          },
        })
      : [];
  const certificateIds = certificates.map((certificate) => certificate.id);

  const tasks =
    vendorIds.length || projectVendorIds.length || certificateIds.length
      ? await prisma.operationalTask.findMany({
          where: {
            OR: [
              ...(vendorIds.length
                ? [
                    {
                      linkedVendorId: {
                        in: vendorIds,
                      },
                    },
                  ]
                : []),
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
          select: {
            id: true,
          },
        })
      : [];
  const taskIds = tasks.map((task) => task.id);

  const evaluationCycles = vendorIds.length
    ? await prisma.vendorEvaluationCycle.findMany({
        where: {
          vendorId: {
            in: vendorIds,
          },
        },
        select: {
          id: true,
        },
      })
    : [];
  const evaluationCycleIds = evaluationCycles.map((cycle) => cycle.id);

  const attachmentStoragePaths = request.attachments.map((attachment) => attachment.storagePath);
  const storagePaths = unique([
    ...attachmentStoragePaths,
    request.certificatePdfStoragePath,
    ...certificates.map((certificate) => certificate.pdfStoragePath),
  ]);

  const relatedEntityIds = unique([
    request.id,
    ...request.attachments.map((attachment) => attachment.id),
    ...vendorIds,
    ...projectVendorIds,
    ...certificateIds,
    ...taskIds,
    ...evaluationCycleIds,
  ]);

  const systemErrorCandidates = await prisma.systemErrorLog.findMany({
    where: {
      OR: [
        {
          action: {
            contains: "VendorRegistration",
          },
        },
        {
          action: {
            contains: "Odoo",
          },
        },
        {
          action: {
            contains: "Vendor",
          },
        },
      ],
    },
    select: {
      id: true,
      action: true,
      errorMessage: true,
      context: true,
    },
  });
  const systemErrorLogIds = systemErrorCandidates
    .filter((log) =>
      jsonIncludesAny(log, [
        request.id,
        TARGET.requestNumber,
        TARGET.supplierName,
        TARGET.supplierId,
        TARGET.certificateCode,
        ...vendorIds,
      ]),
    )
    .map((log) => log.id);

  return {
    request,
    vendorIds,
    projectVendorIds,
    certificateIds,
    taskIds,
    evaluationCycleIds,
    relatedEntityIds,
    systemErrorLogIds,
    storagePaths,
  };
}

async function buildSummary(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  const [
    selectedSubcategoriesCount,
    selectedCitiesCount,
    referencesCount,
    attachmentsCount,
    invitationsCount,
    vendorSelectionsCount,
    approvalTokensCount,
    evaluationTokensCount,
    evaluationSubmissionsCount,
    paymentInstallmentsCount,
    checklistItemsCount,
    notificationsCount,
    dispatchLogsCount,
    auditLogsCount,
  ] = await Promise.all([
    prisma.vendorRegistrationRequestSubcategory.count({
      where: { requestId: scope.request.id },
    }),
    prisma.vendorRegistrationRequestCity.count({
      where: { requestId: scope.request.id },
    }),
    prisma.vendorRegistrationReference.count({
      where: { requestId: scope.request.id },
    }),
    prisma.vendorRegistrationAttachment.count({
      where: { requestId: scope.request.id },
    }),
    prisma.supplierInvitation.count({
      where: {
        OR: [
          { supplierCompanyName: TARGET.supplierName },
          { supplierContactEmail: scope.request.companyEmail },
        ],
      },
    }),
    scope.vendorIds.length
      ? prisma.vendorSubcategorySelection.count({
          where: { vendorId: { in: scope.vendorIds } },
        })
      : 0,
    scope.certificateIds.length
      ? prisma.approvalToken.count({
          where: { certificateId: { in: scope.certificateIds } },
        })
      : 0,
    scope.evaluationCycleIds.length
      ? prisma.vendorEvaluationRequestToken.count({
          where: { cycleId: { in: scope.evaluationCycleIds } },
        })
      : 0,
    scope.evaluationCycleIds.length
      ? prisma.vendorEvaluationSubmission.count({
          where: { cycleId: { in: scope.evaluationCycleIds } },
        })
      : 0,
    scope.projectVendorIds.length
      ? prisma.projectVendorPaymentInstallment.count({
          where: { projectVendorId: { in: scope.projectVendorIds } },
        })
      : 0,
    scope.taskIds.length
      ? prisma.taskChecklistItem.count({
          where: { taskId: { in: scope.taskIds } },
        })
      : 0,
    prisma.notification.count({
      where: {
        OR: [
          ...(scope.vendorIds.length
            ? [{ relatedVendorId: { in: scope.vendorIds } }]
            : []),
          ...(scope.projectVendorIds.length
            ? [{ relatedProjectVendorId: { in: scope.projectVendorIds } }]
            : []),
          ...(scope.certificateIds.length
            ? [{ relatedCertificateId: { in: scope.certificateIds } }]
            : []),
          ...(scope.taskIds.length ? [{ relatedTaskId: { in: scope.taskIds } }] : []),
          { title: { contains: TARGET.supplierName } },
          { message: { contains: TARGET.supplierName } },
        ],
      },
    }),
    prisma.notificationDispatchLog.count({
      where: {
        OR: [
          ...(scope.vendorIds.length
            ? [{ relatedVendorId: { in: scope.vendorIds } }]
            : []),
          ...(scope.projectVendorIds.length
            ? [{ relatedProjectVendorId: { in: scope.projectVendorIds } }]
            : []),
          ...(scope.certificateIds.length
            ? [{ relatedCertificateId: { in: scope.certificateIds } }]
            : []),
          ...(scope.taskIds.length ? [{ relatedTaskId: { in: scope.taskIds } }] : []),
          { linkHref: { contains: TARGET.requestNumber } },
        ],
      },
    }),
    prisma.auditLog.count({
      where: {
        OR: [
          { entityId: { in: scope.relatedEntityIds } },
          ...(scope.certificateIds.length
            ? [{ certificateId: { in: scope.certificateIds } }]
            : []),
        ],
      },
    }),
  ]);

  return [
    {
      model: "Notification",
      action: "delete",
      count: notificationsCount,
    },
    {
      model: "NotificationDispatchLog",
      action: "delete",
      count: dispatchLogsCount,
      note: "includes email/outbox dispatch metadata",
    },
    {
      model: "AuditLog",
      action: "anonymize",
      count: auditLogsCount,
      note: "retained for governance",
    },
    {
      model: "SystemErrorLog",
      action: "anonymize",
      count: scope.systemErrorLogIds.length,
      note: "retained with sanitized context",
    },
    { model: "TaskChecklistItem", action: "delete", count: checklistItemsCount },
    { model: "OperationalTask", action: "delete", count: scope.taskIds.length },
    { model: "ProjectVendorPaymentInstallment", action: "delete", count: paymentInstallmentsCount },
    { model: "ApprovalToken", action: "delete", count: approvalTokensCount },
    { model: "Certificate", action: "delete", count: scope.certificateIds.length },
    { model: "ProjectVendor", action: "delete", count: scope.projectVendorIds.length },
    { model: "VendorEvaluationRequestToken", action: "delete", count: evaluationTokensCount },
    { model: "VendorEvaluationSubmission", action: "delete", count: evaluationSubmissionsCount },
    { model: "VendorEvaluationCycle", action: "delete", count: scope.evaluationCycleIds.length },
    { model: "VendorSubcategorySelection", action: "delete", count: vendorSelectionsCount },
    { model: "Vendor", action: "delete", count: scope.vendorIds.length },
    { model: "SupplierInvitation", action: "delete", count: invitationsCount },
    {
      model: "VendorRegistrationRequestSubcategory",
      action: "delete",
      count: selectedSubcategoriesCount,
    },
    { model: "VendorRegistrationRequestCity", action: "delete", count: selectedCitiesCount },
    { model: "VendorRegistrationReference", action: "delete", count: referencesCount },
    { model: "VendorRegistrationAttachment", action: "delete", count: attachmentsCount },
    { model: "VendorRegistrationRequest", action: "delete", count: 1 },
    {
      model: ".storage linked files",
      action: "delete local file",
      count: scope.storagePaths.length,
      note: "database references are removed in the transaction",
    },
    {
      model: "VendorRegistrationCertificateSequence",
      action: "delete",
      count: 0,
      note: "not reset for production safety",
    },
  ] satisfies SummaryRow[];
}

async function executeCleanup(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  await prisma.$transaction(
    async (tx) => {
      await tx.notification.deleteMany({
        where: {
          OR: [
            ...(scope.vendorIds.length
              ? [{ relatedVendorId: { in: scope.vendorIds } }]
              : []),
            ...(scope.projectVendorIds.length
              ? [{ relatedProjectVendorId: { in: scope.projectVendorIds } }]
              : []),
            ...(scope.certificateIds.length
              ? [{ relatedCertificateId: { in: scope.certificateIds } }]
              : []),
            ...(scope.taskIds.length ? [{ relatedTaskId: { in: scope.taskIds } }] : []),
            { title: { contains: TARGET.supplierName } },
            { message: { contains: TARGET.supplierName } },
          ],
        },
      });

      await tx.notificationDispatchLog.deleteMany({
        where: {
          OR: [
            ...(scope.vendorIds.length
              ? [{ relatedVendorId: { in: scope.vendorIds } }]
              : []),
            ...(scope.projectVendorIds.length
              ? [{ relatedProjectVendorId: { in: scope.projectVendorIds } }]
              : []),
            ...(scope.certificateIds.length
              ? [{ relatedCertificateId: { in: scope.certificateIds } }]
              : []),
            ...(scope.taskIds.length ? [{ relatedTaskId: { in: scope.taskIds } }] : []),
            { linkHref: { contains: TARGET.requestNumber } },
          ],
        },
      });

      await tx.auditLog.updateMany({
        where: {
          OR: [
            { entityId: { in: scope.relatedEntityIds } },
            ...(scope.certificateIds.length
              ? [{ certificateId: { in: scope.certificateIds } }]
              : []),
          ],
        },
        data: {
          entityType: "DeletedTestSupplier",
          entityId: "DELETED-TEST-REQUEST",
          projectId: null,
          certificateId: null,
          details: {
            supplierName: "Deleted test supplier",
            requestNumber: "DELETED-TEST-REQUEST",
            cleanupReason: "Pre-go-live test vendor cleanup",
          },
        },
      });

      if (scope.systemErrorLogIds.length > 0) {
        await tx.systemErrorLog.updateMany({
          where: {
            id: {
              in: scope.systemErrorLogIds,
            },
          },
          data: {
            errorMessage: "Deleted test supplier cleanup redacted related system error.",
            stackTrace: null,
            context: {
              supplierName: "Deleted test supplier",
              requestNumber: "DELETED-TEST-REQUEST",
              cleanupReason: "Pre-go-live test vendor cleanup",
            },
          },
        });
      }

      if (scope.taskIds.length > 0) {
        await tx.taskChecklistItem.deleteMany({
          where: {
            taskId: {
              in: scope.taskIds,
            },
          },
        });
        await tx.operationalTask.deleteMany({
          where: {
            id: {
              in: scope.taskIds,
            },
          },
        });
      }

      if (scope.projectVendorIds.length > 0) {
        await tx.projectVendorPaymentInstallment.deleteMany({
          where: {
            projectVendorId: {
              in: scope.projectVendorIds,
            },
          },
        });
      }

      if (scope.certificateIds.length > 0) {
        await tx.approvalToken.deleteMany({
          where: {
            certificateId: {
              in: scope.certificateIds,
            },
          },
        });
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

      if (scope.evaluationCycleIds.length > 0) {
        await tx.vendorEvaluationRequestToken.deleteMany({
          where: {
            cycleId: {
              in: scope.evaluationCycleIds,
            },
          },
        });
        await tx.vendorEvaluationSubmission.deleteMany({
          where: {
            cycleId: {
              in: scope.evaluationCycleIds,
            },
          },
        });
        await tx.vendorEvaluationCycle.deleteMany({
          where: {
            id: {
              in: scope.evaluationCycleIds,
            },
          },
        });
      }

      if (scope.vendorIds.length > 0) {
        await tx.vendorSubcategorySelection.deleteMany({
          where: {
            vendorId: {
              in: scope.vendorIds,
            },
          },
        });
      }

      await tx.supplierInvitation.deleteMany({
        where: {
          OR: [
            { supplierCompanyName: TARGET.supplierName },
            { supplierContactEmail: scope.request.companyEmail },
          ],
        },
      });

      await tx.vendorRegistrationRequestSubcategory.deleteMany({
        where: { requestId: scope.request.id },
      });
      await tx.vendorRegistrationRequestCity.deleteMany({
        where: { requestId: scope.request.id },
      });
      await tx.vendorRegistrationReference.deleteMany({
        where: { requestId: scope.request.id },
      });
      await tx.vendorRegistrationAttachment.deleteMany({
        where: { requestId: scope.request.id },
      });
      await tx.vendorRegistrationRequest.delete({
        where: { id: scope.request.id },
      });

      if (scope.vendorIds.length > 0) {
        await tx.vendor.deleteMany({
          where: {
            id: {
              in: scope.vendorIds,
            },
          },
        });
      }
    },
    {
      timeout: 15000,
    },
  );

  await deleteLocalStorageFiles(scope.storagePaths);
}

async function printPostChecks() {
  const [requestCount, vendorCount, certificateCodeCount] = await Promise.all([
    prisma.vendorRegistrationRequest.count({
      where: {
        requestNumber: TARGET.requestNumber,
      },
    }),
    prisma.vendor.count({
      where: {
        OR: [
          { vendorName: TARGET.supplierName },
          { supplierId: TARGET.supplierId },
        ],
      },
    }),
    prisma.vendorRegistrationRequest.count({
      where: {
        certificateCode: TARGET.certificateCode,
      },
    }),
  ]);

  console.log("\nPost-cleanup checks:");
  console.log(`- Vendor registration request ${TARGET.requestNumber}: ${requestCount === 0 ? "not found" : "still present"}`);
  console.log(`- Vendor master ${TARGET.supplierName}/${TARGET.supplierId}: ${vendorCount === 0 ? "not found" : "still present"}`);
  console.log(`- Certificate code ${TARGET.certificateCode}: ${certificateCodeCount === 0 ? "not visible" : "still visible"}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const request = await loadTargetRequest();

  if (!request) {
    console.log(`No vendor registration request found for ${TARGET.requestNumber}. Nothing to clean.`);
    return;
  }

  assertSafeTarget(request);

  const scope = await collectCleanupScope(request);
  const summary = await buildSummary(scope);

  console.log("Target confirmed:");
  console.log(`- Supplier name: ${request.companyName}`);
  console.log(`- Request number: ${request.requestNumber}`);
  console.log(`- Supplier ID: ${request.supplierId ?? "not assigned"}`);
  console.log(`- Certificate code: ${request.certificateCode ?? "not issued"}`);
  console.log(`- Approved vendor IDs: ${scope.vendorIds.length ? scope.vendorIds.join(", ") : "none"}`);
  printSummary(summary);

  if (!args.confirm) {
    console.log("\nDry run only. Re-run with --confirm to execute deletion.");
    return;
  }

  console.log("\n--confirm received. Executing cleanup transaction...");
  await executeCleanup(scope);
  await printPostChecks();
}

main()
  .catch((error) => {
    console.error("Test vendor Odoo cleanup failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
