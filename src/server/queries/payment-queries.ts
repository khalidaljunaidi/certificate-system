import { Prisma } from "@prisma/client";

import type {
  PaymentFinanceOwnerView,
  PaymentRecordDetailView,
  PaymentRecordListItemView,
  PaymentRecordStatusView,
  PaymentWorkspaceView,
} from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { withServerTiming } from "@/lib/server-performance";
import { shouldScopePaymentsToAssignedRecords, type PermissionSubject } from "@/lib/permissions";
import {
  buildPaymentSummary,
  deriveRecommendedPaymentAction,
  derivePaymentRecordStatus,
  getDueThisMonthInstallmentCount,
  getNextPaymentActionInstallment,
  getNextPaymentDueDate,
  getOverdueInstallmentCount,
  getUpcomingInstallmentCount,
} from "@/server/payments/payment-summary";

export type PaymentWorkspaceFilters = {
  search?: string;
  projectId?: string;
  vendorId?: string;
  reference?: string;
  paymentStatus?: PaymentRecordStatusView | "";
  financeOwnerUserId?: string;
  dueFrom?: string;
  dueTo?: string;
  overdueOnly?: string;
};

type PaymentViewer = PermissionSubject & {
  id: string;
};

const INSENSITIVE_QUERY_MODE = Prisma.QueryMode.insensitive;
const PAYMENT_WORKSPACE_RECORD_LIMIT = 50;
const FINANCE_OWNER_CACHE_MS = 30_000;

type PaymentDetailActiveTab =
  | "overview"
  | "installments"
  | "invoices"
  | "finance-review"
  | "certificates"
  | "audit"
  | "notes";

let financeOwnerCache:
  | {
      expiresAt: number;
      owners: PaymentFinanceOwnerView[];
    }
  | null = null;

function buildBaseWhere(input: {
  viewer: PaymentViewer;
  filters: PaymentWorkspaceFilters;
}): Prisma.ProjectVendorWhereInput {
  const scopedToOwner = shouldScopePaymentsToAssignedRecords(input.viewer);

  return {
    ...(scopedToOwner ? { paymentFinanceOwnerUserId: input.viewer.id } : {}),
    ...(input.filters.projectId ? { projectId: input.filters.projectId } : {}),
    ...(input.filters.vendorId ? { vendorId: input.filters.vendorId } : {}),
    ...(input.filters.financeOwnerUserId
      ? { paymentFinanceOwnerUserId: input.filters.financeOwnerUserId }
      : {}),
    AND: [
      ...(input.filters.search
        ? [
            {
              OR: [
                {
                  poNumber: {
                    contains: input.filters.search,
                    mode: INSENSITIVE_QUERY_MODE,
                  },
                },
                {
                  contractNumber: {
                    contains: input.filters.search,
                    mode: INSENSITIVE_QUERY_MODE,
                  },
                },
                {
                  project: {
                    OR: [
                      {
                        projectName: {
                          contains: input.filters.search,
                          mode: INSENSITIVE_QUERY_MODE,
                        },
                      },
                      {
                        projectCode: {
                          contains: input.filters.search,
                          mode: INSENSITIVE_QUERY_MODE,
                        },
                      },
                    ],
                  },
                },
                {
                  vendor: {
                    OR: [
                      {
                        vendorName: {
                          contains: input.filters.search,
                          mode: INSENSITIVE_QUERY_MODE,
                        },
                      },
                      {
                        vendorId: {
                          contains: input.filters.search,
                          mode: INSENSITIVE_QUERY_MODE,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ]
        : []),
      ...(input.filters.reference
        ? [
            {
              OR: [
                {
                  poNumber: {
                    contains: input.filters.reference,
                    mode: INSENSITIVE_QUERY_MODE,
                  },
                },
                {
                  contractNumber: {
                    contains: input.filters.reference,
                    mode: INSENSITIVE_QUERY_MODE,
                  },
                },
              ],
            },
          ]
        : []),
      {
        OR: [
          {
            isActive: true,
          },
          {
            paymentInstallments: {
              some: {},
            },
          },
          {
            paymentClosedAt: {
              not: null,
            },
          },
        ],
      },
    ],
  };
}

function toFinanceOwnerView(user: {
  id: string;
  name: string;
  email: string;
  title: string;
} | null): PaymentFinanceOwnerView | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
  };
}

function statusSortWeight(status: PaymentRecordStatusView) {
  switch (status) {
    case "PO_AMOUNT_REQUIRED":
      return 0;
    case "AWAITING_INVOICE":
      return 1;
    case "INVOICE_RECEIVED":
      return 2;
    case "UNDER_FINANCE_REVIEW":
      return 3;
    case "PAYMENT_SCHEDULED":
      return 4;
    case "PARTIALLY_PAID":
      return 5;
    case "FULLY_PAID":
      return 6;
    case "CLOSED":
      return 7;
    case "ON_HOLD":
      return 8;
    case "DISPUTED":
      return 9;
    case "READY_FOR_INVOICE":
    default:
      return 10;
  }
}

function filterByDueRange(input: {
  record: PaymentRecordListItemView;
  dueFrom?: string;
  dueTo?: string;
}) {
  if (!input.dueFrom && !input.dueTo) {
    return true;
  }

  if (!input.record.nextDueDate) {
    return false;
  }

  const dueTime = input.record.nextDueDate.getTime();
  const fromTime = input.dueFrom ? new Date(input.dueFrom).getTime() : null;
  const toTime = input.dueTo ? new Date(input.dueTo).getTime() : null;

  if (fromTime !== null && dueTime < fromTime) {
    return false;
  }

  if (toTime !== null && dueTime > toTime) {
    return false;
  }

  return true;
}

function toPaymentRecordListItem(record: {
  id: string;
  poNumber: string | null;
  contractNumber: string | null;
  poAmount: Prisma.Decimal | null;
  paymentAmount: Prisma.Decimal | null;
  paymentAmountSource: "PO_CONTRACT" | "APPROVED_CERTIFICATE" | null;
  paymentSourceCertificateId: string | null;
  paymentSourceCertificate: {
    certificateCode: string;
  } | null;
  isActive: boolean;
  paymentNotes: string | null;
  paymentWorkflowOverrideStatus: "ON_HOLD" | "DISPUTED" | null;
  paymentWorkflowOverrideReason: string | null;
  paymentWorkflowOverrideAt: Date | null;
  paymentWorkflowOverrideBy: {
    name: string;
  } | null;
  paymentClosedAt: Date | null;
  paymentClosedBy: {
    name: string;
  } | null;
  paymentFinanceOwner: {
    id: string;
    name: string;
    email: string;
    title: string;
  } | null;
  project: {
    id: string;
    projectCode: string;
    projectName: string;
  };
  vendor: {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
  };
  paymentInstallments: Array<{
    id: string;
    projectVendorId: string;
    amount: Prisma.Decimal;
    dueDate: Date;
    condition: string;
    invoiceNumber: string | null;
    invoiceStoragePath: string | null;
    invoiceDate: Date | null;
    invoiceAmount: Prisma.Decimal | null;
    invoiceReceivedDate: Date | null;
    taxInvoiceValidated: boolean;
    invoiceStatus:
      | "MISSING"
      | "RECEIVED"
      | "VALIDATED"
      | "REJECTED"
      | "APPROVED_FOR_PAYMENT";
    invoiceExistsInOdoo: boolean;
    odooInvoiceStatus: "UPLOADED_TO_ODOO" | null;
    odooInvoiceReference: string | null;
    odooInvoiceUploadedAt: Date | null;
    odooInvoiceNotes: string | null;
    financeReviewNotes: string | null;
    financeReviewedAt: Date | null;
    financeReviewedBy: {
      name: string;
    } | null;
    scheduledPaymentDate: Date | null;
    paymentDate: Date | null;
    status:
      | "PLANNED"
      | "INVOICE_REQUIRED"
      | "INVOICE_RECEIVED"
      | "UNDER_REVIEW"
      | "SCHEDULED"
      | "PAID"
      | "OVERDUE"
      | "CANCELLED";
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): PaymentRecordListItemView {
  const summary = buildPaymentSummary(
    record.id,
    {
      poAmount: record.poAmount,
      paymentAmount: record.paymentAmount,
      paymentAmountSource: record.paymentAmountSource,
      paymentSourceCertificateId: record.paymentSourceCertificateId,
      paymentSourceCertificateCode:
        record.paymentSourceCertificate?.certificateCode ?? null,
    },
    record.paymentInstallments,
  );
  const nextDueDate = getNextPaymentDueDate(summary.installments);
  const overdueInstallmentCount = getOverdueInstallmentCount(summary.installments);
  const upcomingInstallmentCount = getUpcomingInstallmentCount(summary.installments);
  const dueThisMonthInstallmentCount = getDueThisMonthInstallmentCount(
    summary.installments,
  );
  const nextActionInstallment = getNextPaymentActionInstallment(summary.installments);
  const status = derivePaymentRecordStatus({
    summary,
    paymentClosedAt: record.paymentClosedAt,
    workflowOverrideStatus: record.paymentWorkflowOverrideStatus,
  });

  return {
    projectVendorId: record.id,
    projectId: record.project.id,
    projectCode: record.project.projectCode,
    projectName: record.project.projectName,
    vendorId: record.vendor.vendorId,
    vendorRecordId: record.vendor.id,
    vendorName: record.vendor.vendorName,
    vendorEmail: record.vendor.vendorEmail,
    poNumber: record.poNumber,
    contractNumber: record.contractNumber,
    poAmount: summary.poAmount,
    activeAmount: summary.activeAmount,
    amountMissing: summary.amountMissing,
    amountSource: summary.amountSource,
    amountSourceCertificateId: summary.amountSourceCertificateId,
    amountSourceCertificateCode: summary.amountSourceCertificateCode,
    plannedAmount: summary.plannedAmount,
    totalAmount: summary.totalAmount,
    paidAmount: summary.paidAmount,
    remainingAmount: summary.remainingAmount,
    progressPercent: summary.progressPercent,
    canClosePayment: summary.canClosePayment,
    nextDueDate,
    status,
    workflowOverrideStatus: record.paymentWorkflowOverrideStatus,
    workflowOverrideReason: record.paymentWorkflowOverrideReason,
    workflowOverrideAt: record.paymentWorkflowOverrideAt,
    workflowOverrideByName: record.paymentWorkflowOverrideBy?.name ?? null,
    financeOwner: toFinanceOwnerView(record.paymentFinanceOwner),
    closedAt: record.paymentClosedAt,
    closedByName: record.paymentClosedBy?.name ?? null,
    paymentNotes: record.paymentNotes,
    installmentCount: summary.installmentCount,
    invoiceReceivedCount: summary.invoiceReceivedCount,
    approvedInvoiceCount: summary.approvedInvoiceCount,
    scheduledInstallmentCount: summary.scheduledInstallmentCount,
    paidInstallmentCount: summary.paidInstallmentCount,
    upcomingInstallmentCount,
    dueThisMonthInstallmentCount,
    overdueInstallmentCount,
    recommendedAction: deriveRecommendedPaymentAction({
      status,
      nextActionInstallment,
      canClosePayment: summary.canClosePayment,
    }),
    nextActionInstallment,
  };
}

function applyWorkspaceFilters(
  records: PaymentRecordListItemView[],
  filters: PaymentWorkspaceFilters,
) {
  return records
    .filter((record) =>
      filters.paymentStatus ? record.status === filters.paymentStatus : true,
    )
    .filter((record) =>
      filters.overdueOnly === "true" ? record.overdueInstallmentCount > 0 : true,
    )
    .filter((record) =>
      filterByDueRange({
        record,
        dueFrom: filters.dueFrom,
        dueTo: filters.dueTo,
      }),
    )
    .sort((left, right) => {
      const statusDelta =
        statusSortWeight(left.status) - statusSortWeight(right.status);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      const leftDue = left.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDue = right.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return left.projectName.localeCompare(right.projectName);
    });
}

async function getActiveFinanceOwners() {
  if (financeOwnerCache && financeOwnerCache.expiresAt > Date.now()) {
    return financeOwnerCache.owners;
  }

  const owners = await withServerTiming("payments.financeOwners", async () => {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          {
            role: {
              in: ["ADMIN", "PROCUREMENT_DIRECTOR", "PROCUREMENT_LEAD"],
            },
          },
          {
            roleAssignment: {
              role: {
                permissions: {
                  some: {
                    permission: {
                      key: {
                        startsWith: "payment.",
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
    }));
  });

  financeOwnerCache = {
    expiresAt: Date.now() + FINANCE_OWNER_CACHE_MS,
    owners,
  };

  return owners;
}

export async function getPaymentsWorkspace(
  viewer: PaymentViewer,
  filters: PaymentWorkspaceFilters = {},
): Promise<PaymentWorkspaceView> {
  return withServerTiming("payments.workspace", async () => {
  const baseWhere = buildBaseWhere({ viewer, filters });

  const [projectVendors, financeOwners] = await Promise.all([
    prisma.projectVendor.findMany({
      where: baseWhere,
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: PAYMENT_WORKSPACE_RECORD_LIMIT,
      select: {
        id: true,
        poNumber: true,
        contractNumber: true,
        poAmount: true,
        paymentAmount: true,
        paymentAmountSource: true,
        paymentSourceCertificateId: true,
        paymentSourceCertificate: {
          select: {
            certificateCode: true,
          },
        },
        isActive: true,
        paymentNotes: true,
        paymentWorkflowOverrideStatus: true,
        paymentWorkflowOverrideReason: true,
        paymentWorkflowOverrideAt: true,
        paymentWorkflowOverrideBy: {
          select: {
            name: true,
          },
        },
        paymentClosedAt: true,
        paymentClosedBy: {
          select: {
            name: true,
          },
        },
        paymentFinanceOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            title: true,
          },
        },
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
            vendorId: true,
            vendorName: true,
            vendorEmail: true,
          },
        },
        paymentInstallments: {
          orderBy: [
            {
              dueDate: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          select: {
            id: true,
            projectVendorId: true,
            amount: true,
            dueDate: true,
            condition: true,
            invoiceNumber: true,
            invoiceStoragePath: true,
            invoiceDate: true,
            invoiceAmount: true,
            invoiceReceivedDate: true,
            taxInvoiceValidated: true,
            invoiceStatus: true,
            invoiceExistsInOdoo: true,
            odooInvoiceStatus: true,
            odooInvoiceReference: true,
            odooInvoiceUploadedAt: true,
            odooInvoiceNotes: true,
            financeReviewNotes: true,
            financeReviewedAt: true,
            financeReviewedBy: {
              select: {
                name: true,
              },
            },
            scheduledPaymentDate: true,
            paymentDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    getActiveFinanceOwners(),
  ]);

  const records = applyWorkspaceFilters(
    projectVendors.map(toPaymentRecordListItem),
    filters,
  );
  const projects = Array.from(
    new Map(
      projectVendors.map((projectVendor) => [
        projectVendor.project.id,
        projectVendor.project,
      ]),
    ).values(),
  ).sort((left, right) => left.projectName.localeCompare(right.projectName));
  const vendors = Array.from(
    new Map(
      projectVendors.map((projectVendor) => [
        projectVendor.vendor.id,
        {
          id: projectVendor.vendor.id,
          vendorId: projectVendor.vendor.vendorId,
          vendorName: projectVendor.vendor.vendorName,
        },
      ]),
    ).values(),
  ).sort((left, right) => left.vendorName.localeCompare(right.vendorName));

  return {
    filters: {
      projects,
      vendors,
      financeOwners,
      statuses: [
        "PO_AMOUNT_REQUIRED",
        "READY_FOR_INVOICE",
        "AWAITING_INVOICE",
        "INVOICE_RECEIVED",
        "UNDER_FINANCE_REVIEW",
        "PAYMENT_SCHEDULED",
        "PARTIALLY_PAID",
        "FULLY_PAID",
        "CLOSED",
        "ON_HOLD",
        "DISPUTED",
      ],
    },
    kpis: {
      totalPoAmount: records.reduce((sum, record) => sum + record.totalAmount, 0),
      totalPaid: records.reduce((sum, record) => sum + record.paidAmount, 0),
      totalRemaining: records.reduce(
        (sum, record) => sum + record.remainingAmount,
        0,
      ),
      overduePayments: records.reduce(
        (sum, record) => sum + record.overdueInstallmentCount,
        0,
      ),
      dueThisMonth: records.reduce(
        (sum, record) => sum + record.dueThisMonthInstallmentCount,
        0,
      ),
      closedPayments: records.filter((record) => record.status === "CLOSED").length,
    },
    records,
  };
  });
}

export async function getPaymentRecordDetail(input: {
  viewer: PaymentViewer;
  projectVendorId: string;
  activeTab?: PaymentDetailActiveTab;
}): Promise<PaymentRecordDetailView | null> {
  return withServerTiming("payments.detail", async () => {
  const record = await prisma.projectVendor.findUnique({
    where: {
      id: input.projectVendorId,
    },
    select: {
      id: true,
      poNumber: true,
      contractNumber: true,
      poAmount: true,
      paymentAmount: true,
      paymentAmountSource: true,
      paymentSourceCertificateId: true,
      paymentSourceCertificate: {
        select: {
          certificateCode: true,
        },
      },
      isActive: true,
      paymentNotes: true,
      paymentWorkflowOverrideStatus: true,
      paymentWorkflowOverrideReason: true,
      paymentWorkflowOverrideAt: true,
      paymentWorkflowOverrideBy: {
        select: {
          name: true,
        },
      },
      paymentClosedAt: true,
      paymentClosedBy: {
        select: {
          name: true,
        },
      },
      paymentFinanceOwnerUserId: true,
      paymentFinanceOwner: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
        },
      },
      project: {
        select: {
          id: true,
          projectCode: true,
          projectName: true,
          projectLocation: true,
          clientName: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorId: true,
          vendorName: true,
          vendorEmail: true,
          vendorPhone: true,
        },
      },
      paymentInstallments: {
        orderBy: [
          {
            dueDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          projectVendorId: true,
          amount: true,
          dueDate: true,
          condition: true,
          invoiceNumber: true,
          invoiceStoragePath: true,
          invoiceDate: true,
          invoiceAmount: true,
          invoiceReceivedDate: true,
          taxInvoiceValidated: true,
          invoiceStatus: true,
          invoiceExistsInOdoo: true,
          odooInvoiceStatus: true,
          odooInvoiceReference: true,
          odooInvoiceUploadedAt: true,
          odooInvoiceNotes: true,
          financeReviewNotes: true,
          financeReviewedAt: true,
          financeReviewedBy: {
            select: {
              name: true,
            },
          },
          scheduledPaymentDate: true,
          paymentDate: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  if (
    shouldScopePaymentsToAssignedRecords(input.viewer) &&
    record.paymentFinanceOwnerUserId !== input.viewer.id
  ) {
    return null;
  }

  const listItem = toPaymentRecordListItem(record);
  const activeTab = input.activeTab ?? "overview";
  const installmentIds = record.paymentInstallments.map((installment) => installment.id);
  const [financeOwners, auditLogs, certificates] = await Promise.all([
    activeTab === "notes" ? getActiveFinanceOwners() : Promise.resolve([]),
    activeTab === "audit"
      ? prisma.auditLog.findMany({
          where: {
            OR: [
              {
                entityType: "ProjectVendor",
                entityId: record.id,
              },
              ...(installmentIds.length > 0
                ? [
                    {
                      entityType: "ProjectVendorPaymentInstallment",
                      entityId: {
                        in: installmentIds,
                      },
                    },
                  ]
                : []),
            ],
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 30,
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
        })
      : Promise.resolve([]),
    activeTab === "certificates"
      ? prisma.certificate.findMany({
          where: {
            projectVendorId: record.id,
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            certificateCode: true,
            status: true,
            totalAmount: true,
            updatedAt: true,
            pmApprovedAt: true,
            issuedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    record: {
      ...listItem,
      projectLocation: record.project.projectLocation,
      clientName: record.project.clientName,
      vendorPhone: record.vendor.vendorPhone,
      isActive: record.isActive,
      certificates: certificates.map((certificate) => ({
        id: certificate.id,
        certificateCode: certificate.certificateCode,
        status: certificate.status,
        totalAmount: Number(certificate.totalAmount),
        updatedAt: certificate.updatedAt,
        pmApprovedAt: certificate.pmApprovedAt,
        issuedAt: certificate.issuedAt,
      })),
      installments: buildPaymentSummary(
        record.id,
        {
          poAmount: record.poAmount,
          paymentAmount: record.paymentAmount,
          paymentAmountSource: record.paymentAmountSource,
          paymentSourceCertificateId: record.paymentSourceCertificateId,
          paymentSourceCertificateCode:
            record.paymentSourceCertificate?.certificateCode ?? null,
        },
        record.paymentInstallments,
      ).installments,
      auditTrail: auditLogs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorName: entry.user?.name ?? null,
        createdAt: entry.createdAt,
        details: entry.details,
      })),
    },
    financeOwners,
  };
  });
}
