import { loadEnvConfig } from "@next/env";

import { prisma } from "../src/lib/prisma";
import {
  deleteFile,
  STORAGE_BUCKETS,
} from "../src/server/services/storage-service";

loadEnvConfig(process.cwd());

const TARGET = {
  projectName: "SAB Annual event 2026",
  projectCode: "100003",
  poNumbers: ["PO0701", "PO0917"],
  contractNumbers: ["PO0701", "PO0917"],
};

type SummaryRow = {
  model: string;
  action: "delete" | "delete storage object" | "manual review" | "skip";
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
  console.log("\nManual review only - skipped by script:");

  if (items.length === 0) {
    console.log("  - none");
    return;
  }

  for (const item of items) {
    console.log(`  - ${item.model} ${item.id}: ${item.reason}`);
  }
}

function assertTargetCode(value: string | null | undefined, allowed: string[], label: string) {
  if (!value || !allowed.includes(value)) {
    throw new Error(
      `Safety stop: matched assignment has ${label} "${value ?? "missing"}", expected one of ${allowed.join(", ")}.`,
    );
  }
}

function assertSafeAssignment(input: {
  id: string;
  poNumber: string | null;
  contractNumber: string | null;
}) {
  assertTargetCode(input.poNumber, TARGET.poNumbers, "PO number");
  assertTargetCode(input.contractNumber, TARGET.contractNumbers, "contract number");

  if (input.poNumber !== input.contractNumber) {
    throw new Error(
      `Safety stop: assignment ${input.id} has PO ${input.poNumber} but contract ${input.contractNumber}. Expected exact matching test/demo pair.`,
    );
  }
}

function stringifyDetails(value: unknown) {
  return JSON.stringify(value ?? "");
}

async function loadTargetProject() {
  const project = await prisma.project.findUnique({
    where: {
      projectCode: TARGET.projectCode,
    },
    select: {
      id: true,
      projectCode: true,
      projectName: true,
    },
  });

  if (!project) {
    throw new Error(
      `Safety stop: project code ${TARGET.projectCode} was not found.`,
    );
  }

  if (project.projectName !== TARGET.projectName) {
    throw new Error(
      `Safety stop: project ${TARGET.projectCode} is "${project.projectName}", not "${TARGET.projectName}".`,
    );
  }

  return project;
}

async function loadTargetAssignments(projectId: string) {
  const assignments = await prisma.projectVendor.findMany({
    where: {
      projectId,
      OR: [
        {
          poNumber: {
            in: TARGET.poNumbers,
          },
        },
        {
          contractNumber: {
            in: TARGET.contractNumbers,
          },
        },
      ],
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
      isActive: true,
      createdAt: true,
      updatedAt: true,
      vendor: {
        select: {
          vendorId: true,
          supplierId: true,
          vendorName: true,
        },
      },
    },
  });

  for (const assignment of assignments) {
    assertSafeAssignment(assignment);
  }

  return assignments;
}

async function collectCleanupScope(input: {
  project: Awaited<ReturnType<typeof loadTargetProject>>;
  assignments: Awaited<ReturnType<typeof loadTargetAssignments>>;
}) {
  const projectVendorIds = input.assignments.map((assignment) => assignment.id);

  const certificates = projectVendorIds.length
    ? await prisma.certificate.findMany({
        where: {
          projectVendorId: {
            in: projectVendorIds,
          },
          projectId: input.project.id,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          certificateCode: true,
          projectId: true,
          projectVendorId: true,
          poNumber: true,
          contractNumber: true,
          status: true,
          pdfStoragePath: true,
        },
      })
    : [];

  for (const certificate of certificates) {
    assertTargetCode(certificate.poNumber, TARGET.poNumbers, "certificate PO number");
    assertTargetCode(
      certificate.contractNumber,
      TARGET.contractNumbers,
      "certificate contract number",
    );
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
  const paymentInstallmentIds = paymentInstallments.map((installment) => installment.id);

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
  const approvalTokenIds = approvalTokens.map((token) => token.id);

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
            linkedProjectVendorId: true,
            linkedCertificateId: true,
          },
        })
      : [];
  const operationalTaskIds = operationalTasks.map((task) => task.id);

  const notifications =
    projectVendorIds.length || certificateIds.length || operationalTaskIds.length
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
            ],
          },
          select: {
            id: true,
            title: true,
            relatedProjectVendorId: true,
            relatedCertificateId: true,
            relatedTaskId: true,
            dispatchLogId: true,
          },
        })
      : [];
  const notificationIds = notifications.map((notification) => notification.id);
  const notificationDispatchLogIdsFromNotifications = unique(
    notifications.map((notification) => notification.dispatchLogId),
  );

  const dispatchLogs =
    projectVendorIds.length ||
    certificateIds.length ||
    operationalTaskIds.length ||
    notificationDispatchLogIdsFromNotifications.length
      ? await prisma.notificationDispatchLog.findMany({
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
              ...(notificationDispatchLogIdsFromNotifications.length
                ? [
                    {
                      id: {
                        in: notificationDispatchLogIdsFromNotifications,
                      },
                    },
                  ]
                : []),
            ],
          },
          select: {
            id: true,
            eventKey: true,
            relatedProjectVendorId: true,
            relatedCertificateId: true,
            relatedTaskId: true,
          },
        })
      : [];
  const dispatchLogIds = dispatchLogs.map((dispatchLog) => dispatchLog.id);

  const exactEntityIds = unique([
    ...projectVendorIds,
    ...certificateIds,
    ...paymentInstallmentIds,
    ...approvalTokenIds,
    ...operationalTaskIds,
  ]);

  const auditLogs = exactEntityIds.length || certificateIds.length
    ? await prisma.auditLog.findMany({
        where: {
          OR: [
            ...(exactEntityIds.length
              ? [
                  {
                    entityId: {
                      in: exactEntityIds,
                    },
                  },
                ]
              : []),
            ...(certificateIds.length
              ? [
                  {
                    certificateId: {
                      in: certificateIds,
                    },
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          certificateId: true,
        },
      })
    : [];
  const auditLogIds = auditLogs.map((auditLog) => auditLog.id);

  const [manualProjectNotifications, manualDispatchLogs, manualProjectTasks, manualCertificates, manualAuditLogs] =
    await Promise.all([
      prisma.notification.findMany({
        where: {
          relatedProjectId: input.project.id,
          NOT: notificationIds.length
            ? {
                id: {
                  in: notificationIds,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          title: true,
        },
        take: 50,
      }),
      prisma.notificationDispatchLog.findMany({
        where: {
          relatedProjectId: input.project.id,
          NOT: dispatchLogIds.length
            ? {
                id: {
                  in: dispatchLogIds,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          eventKey: true,
        },
        take: 50,
      }),
      prisma.operationalTask.findMany({
        where: {
          linkedProjectId: input.project.id,
          NOT: operationalTaskIds.length
            ? {
                id: {
                  in: operationalTaskIds,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          title: true,
        },
        take: 50,
      }),
      prisma.certificate.findMany({
        where: {
          projectId: input.project.id,
          poNumber: {
            in: TARGET.poNumbers,
          },
          NOT: certificateIds.length
            ? {
                id: {
                  in: certificateIds,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          certificateCode: true,
          poNumber: true,
          projectVendorId: true,
        },
        take: 50,
      }),
      prisma.auditLog.findMany({
        where: {
          projectId: input.project.id,
          NOT: auditLogIds.length
            ? {
                id: {
                  in: auditLogIds,
                },
              }
            : undefined,
        },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
        },
        take: 50,
      }),
    ]);

  const targetNeedles = [
    ...TARGET.poNumbers,
    ...TARGET.contractNumbers,
    ...projectVendorIds,
    ...certificateIds,
    ...operationalTaskIds,
  ];
  const manualReview: ManualReviewItem[] = [
    ...manualProjectNotifications.map((notification) => ({
      model: "Notification",
      id: notification.id,
      reason: `project-level notification "${notification.title}" is not linked to the exact assignment/certificate/task IDs`,
    })),
    ...manualDispatchLogs.map((dispatchLog) => ({
      model: "NotificationDispatchLog",
      id: dispatchLog.id,
      reason: `project-level dispatch ${dispatchLog.eventKey} is not linked to the exact assignment/certificate/task IDs`,
    })),
    ...manualProjectTasks.map((task) => ({
      model: "OperationalTask",
      id: task.id,
      reason: `project-level task "${task.title}" is not linked to the exact assignment/certificate IDs`,
    })),
    ...manualCertificates.map((certificate) => ({
      model: "Certificate",
      id: certificate.id,
      reason: `same target PO ${certificate.poNumber} but projectVendorId ${certificate.projectVendorId} is not one of the exact target assignments`,
    })),
    ...manualAuditLogs
      .filter((auditLog) => stringifyDetails(auditLog).includes(TARGET.projectCode) || targetNeedles.some((needle) => stringifyDetails(auditLog).includes(needle)))
      .map((auditLog) => ({
        model: "AuditLog",
        id: auditLog.id,
        reason: `${auditLog.action}/${auditLog.entityType} is project-level or details-only, not an exact entity relation`,
      })),
  ];

  const storageObjects: StorageObjectRef[] = [
    ...certificates
      .filter((certificate) => Boolean(certificate.pdfStoragePath))
      .map((certificate) => ({
        bucket: STORAGE_BUCKETS.certificates,
        path: certificate.pdfStoragePath as string,
        source: `Certificate ${certificate.certificateCode}`,
      })),
    ...paymentInstallments
      .filter((installment) => Boolean(installment.invoiceStoragePath))
      .map((installment) => ({
        bucket: STORAGE_BUCKETS.paymentInvoices,
        path: installment.invoiceStoragePath as string,
        source: `Payment installment ${installment.id}`,
      })),
  ];

  return {
    project: input.project,
    assignments: input.assignments,
    projectVendorIds,
    certificates,
    certificateIds,
    paymentInstallments,
    paymentInstallmentIds,
    approvalTokens,
    approvalTokenIds,
    operationalTasks,
    operationalTaskIds,
    notifications,
    notificationIds,
    dispatchLogs,
    dispatchLogIds,
    auditLogs,
    auditLogIds,
    storageObjects,
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
      note: "only exact entity/certificate relations",
    },
    {
      model: "TaskChecklistItem",
      action: "delete",
      count: scope.operationalTaskIds.length,
      note: "cascaded by task IDs, counted by parent task count",
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
    },
    {
      model: "ProjectVendor",
      action: "delete",
      count: scope.projectVendorIds.length,
      note: "removes PO/contract references stored on the assignment rows",
    },
    {
      model: "Storage files",
      action: "delete storage object",
      count: scope.storageObjects.length,
      note: "certificate PDFs and payment invoice files directly referenced by target records",
    },
    {
      model: "Uncertain project-level records",
      action: "manual review",
      count: scope.manualReview.length,
      note: "printed and skipped",
    },
    {
      model: "Vendor",
      action: "skip",
      count: 0,
      note: "vendor masters are never deleted by this script",
    },
    {
      model: "Project",
      action: "skip",
      count: 0,
      note: "project records are never deleted by this script",
    },
  ] satisfies SummaryRow[];
}

function printDetailedScope(scope: Awaited<ReturnType<typeof collectCleanupScope>>) {
  console.log("\nTarget confirmed:");
  console.log(`- Project: ${scope.project.projectName}`);
  console.log(`- Project code: ${scope.project.projectCode}`);
  console.log(`- Project ID: ${scope.project.id}`);
  console.log(`- Target PO numbers: ${TARGET.poNumbers.join(", ")}`);
  console.log(`- Target contract numbers: ${TARGET.contractNumbers.join(", ")}`);

  const foundPoNumbers = unique(scope.assignments.map((assignment) => assignment.poNumber));
  const missingPoNumbers = TARGET.poNumbers.filter((poNumber) => !foundPoNumbers.includes(poNumber));
  if (missingPoNumbers.length > 0) {
    console.log(`- Missing target PO numbers in current DB: ${missingPoNumbers.join(", ")}`);
  }

  printList(
    "ProjectVendor assignment rows",
    scope.assignments.map(
      (assignment) =>
        `${assignment.id} | PO ${assignment.poNumber} | Contract ${assignment.contractNumber} | Vendor ${assignment.vendor.vendorName} (${assignment.vendor.vendorId ?? assignment.vendor.supplierId ?? assignment.vendorId}) | Active ${assignment.isActive}`,
    ),
  );
  printList(
    "Certificates",
    scope.certificates.map(
      (certificate) =>
        `${certificate.id} | ${certificate.certificateCode} | ${certificate.status} | PO ${certificate.poNumber} | Contract ${certificate.contractNumber ?? "none"}`,
    ),
  );
  printList(
    "Payment installments",
    scope.paymentInstallments.map(
      (installment) =>
        `${installment.id} | ProjectVendor ${installment.projectVendorId} | Invoice ${installment.invoiceNumber ?? "none"} | Status ${installment.status} | Storage ${installment.invoiceStoragePath ?? "none"}`,
    ),
  );
  printList(
    "Approval tokens",
    scope.approvalTokens.map(
      (token) => `${token.id} | Certificate ${token.certificateId} | ${token.actionType}`,
    ),
  );
  printList(
    "Operational tasks",
    scope.operationalTasks.map(
      (task) =>
        `${task.id} | ${task.title} | Assignment ${task.linkedProjectVendorId ?? "none"} | Certificate ${task.linkedCertificateId ?? "none"}`,
    ),
  );
  printList(
    "Notifications",
    scope.notifications.map(
      (notification) =>
        `${notification.id} | ${notification.title} | Assignment ${notification.relatedProjectVendorId ?? "none"} | Certificate ${notification.relatedCertificateId ?? "none"} | Task ${notification.relatedTaskId ?? "none"}`,
    ),
  );
  printList(
    "Notification dispatch logs",
    scope.dispatchLogs.map(
      (dispatchLog) =>
        `${dispatchLog.id} | ${dispatchLog.eventKey} | Assignment ${dispatchLog.relatedProjectVendorId ?? "none"} | Certificate ${dispatchLog.relatedCertificateId ?? "none"} | Task ${dispatchLog.relatedTaskId ?? "none"}`,
    ),
  );
  printList(
    "Audit logs",
    scope.auditLogs.map(
      (auditLog) =>
        `${auditLog.id} | ${auditLog.action} | ${auditLog.entityType}:${auditLog.entityId} | Certificate ${auditLog.certificateId ?? "none"}`,
    ),
  );
  printList(
    "Storage objects",
    scope.storageObjects.map(
      (object) => `${object.bucket}/${object.path} | ${object.source}`,
    ),
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
    },
    {
      timeout: 15000,
    },
  );
}

async function executeStorageCleanup(storageObjects: StorageObjectRef[]) {
  for (const object of storageObjects) {
    await deleteFile({
      bucket: object.bucket,
      path: object.path,
    });
  }
}

async function printPostChecks(projectId: string) {
  const [assignments, certificates, tasks, notifications, dispatchLogs] =
    await Promise.all([
      prisma.projectVendor.count({
        where: {
          projectId,
          poNumber: {
            in: TARGET.poNumbers,
          },
        },
      }),
      prisma.certificate.count({
        where: {
          projectId,
          poNumber: {
            in: TARGET.poNumbers,
          },
        },
      }),
      prisma.operationalTask.count({
        where: {
          OR: [
            {
              linkedProjectVendorId: {
                not: null,
              },
            },
            {
              linkedCertificateId: {
                not: null,
              },
            },
          ],
          linkedProjectId: projectId,
        },
      }),
      prisma.notification.count({
        where: {
          relatedProjectId: projectId,
          OR: [
            {
              title: {
                contains: "PO0701",
              },
            },
            {
              title: {
                contains: "PO0917",
              },
            },
            {
              message: {
                contains: "PO0701",
              },
            },
            {
              message: {
                contains: "PO0917",
              },
            },
          ],
        },
      }),
      prisma.notificationDispatchLog.count({
        where: {
          relatedProjectId: projectId,
          OR: [
            {
              linkHref: {
                contains: "PO0701",
              },
            },
            {
              linkHref: {
                contains: "PO0917",
              },
            },
          ],
        },
      }),
    ]);

  console.log("\nPost-cleanup checks:");
  console.log(`- Target project assignments by PO: ${assignments}`);
  console.log(`- Target project certificates by PO: ${certificates}`);
  console.log(`- Remaining project-level linked tasks require manual review: ${tasks}`);
  console.log(`- Remaining text-only project notifications require manual review: ${notifications}`);
  console.log(`- Remaining text-only project dispatch logs require manual review: ${dispatchLogs}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = await loadTargetProject();
  const assignments = await loadTargetAssignments(project.id);

  if (assignments.length === 0) {
    console.log("Target project was found, but no exact assignment rows matched the target PO/contract numbers.");
    console.log("No records will be deleted.");
    return;
  }

  const scope = await collectCleanupScope({
    project,
    assignments,
  });

  printSummary(buildSummary(scope));
  printDetailedScope(scope);

  if (!args.confirm) {
    console.log("\nDry run only. Re-run with --confirm to execute deletion.");
    return;
  }

  console.log("\n--confirm received. Executing exact-match assignment cleanup...");
  await executeDatabaseCleanup(scope);
  await executeStorageCleanup(scope.storageObjects);
  await printPostChecks(project.id);
}

main()
  .catch((error) => {
    console.error("Test project assignment history cleanup failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
