import {
  type PaymentInstallmentStatus,
  type PaymentInvoiceStatus,
  Prisma,
} from "@prisma/client";

import { WorkflowUpdateEmail } from "@/emails";
import { PRIMARY_EVALUATOR_EMAIL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { buildPaymentSummary } from "@/server/payments/payment-summary";
import { createAuditLog } from "@/server/services/audit-service";
import { sendDirectWorkflowEmail } from "@/server/services/email-service";
import { createWorkflowNotification } from "@/server/services/notification-service";
import { resolveUserAccessProfile } from "@/server/services/rbac-service";
import { logSystemError } from "@/server/services/system-error-service";

function toNumber(value: Prisma.Decimal) {
  return Number(value);
}

function toDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Prisma.Decimal(value);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function sanitizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isClosedInstallment(status: PaymentInstallmentStatus) {
  return status === "PAID" || status === "CANCELLED";
}

function isInstallmentDueSoon(input: {
  status: PaymentInstallmentStatus;
  dueDate: Date;
}) {
  if (isClosedInstallment(input.status)) {
    return false;
  }

  const today = startOfToday();
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 7);

  return input.dueDate >= today && input.dueDate <= threshold;
}

function isInstallmentOverdue(input: {
  status: PaymentInstallmentStatus;
  dueDate: Date;
}) {
  if (isClosedInstallment(input.status)) {
    return false;
  }

  return input.status === "OVERDUE" || input.dueDate < startOfToday();
}

function buildPaymentHref(projectVendorId: string) {
  return `/admin/payments/${projectVendorId}`;
}

type ProjectVendorContext = {
  id: string;
  projectId: string;
  poAmount: Prisma.Decimal | null;
  poNumber: string | null;
  contractNumber: string | null;
  paymentFinanceOwnerUserId: string | null;
  paymentWorkflowOverrideStatus: "ON_HOLD" | "DISPUTED" | null;
  vendor: {
    id: string;
    vendorId: string;
    vendorName: string;
  };
  project: {
    id: string;
    projectName: string;
    projectCode: string;
  };
};

type PreviousInstallmentSnapshot = {
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
  invoiceStatus: PaymentInvoiceStatus;
  financeReviewNotes: string | null;
  financeReviewedAt: Date | null;
  financeReviewedByUserId: string | null;
  scheduledPaymentDate: Date | null;
  paymentDate: Date | null;
  status: PaymentInstallmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type InstallmentMutationInput = {
  userId: string;
  workflowIntent:
    | "CREATE_PLAN"
    | "EDIT_PLAN"
    | "ADD_INVOICE"
    | "REVIEW_INVOICE"
    | "SCHEDULE_PAYMENT"
    | "MARK_PAID";
  amount: number;
  dueDate: Date;
  condition: string;
  invoiceNumber?: string | null;
  invoiceStoragePath?: string | null;
  invoiceDate?: Date | null;
  invoiceAmount?: number | null;
  invoiceReceivedDate?: Date | null;
  taxInvoiceValidated: boolean;
  invoiceStatus?: PaymentInvoiceStatus | null;
  financeReviewNotes?: string | null;
  scheduledPaymentDate?: Date | null;
  paymentDate?: Date | null;
  notes?: string | null;
};

type InstallmentMutationPayload = {
  amount: number;
  dueDate: Date;
  condition: string;
  invoiceNumber: string | null;
  invoiceStoragePath: string | null;
  invoiceDate: Date | null;
  invoiceAmount: Prisma.Decimal | null;
  invoiceReceivedDate: Date | null;
  taxInvoiceValidated: boolean;
  invoiceStatus: PaymentInvoiceStatus;
  financeReviewNotes: string | null;
  financeReviewedAt: Date | null;
  financeReviewedByUserId: string | null;
  scheduledPaymentDate: Date | null;
  paymentDate: Date | null;
  status: PaymentInstallmentStatus;
  notes: string | null;
};

async function createPaymentNotification(
  tx: Prisma.TransactionClient,
  input: {
    projectVendor: ProjectVendorContext;
    title: string;
    message: string;
    severity?: "INFO" | "ACTION_REQUIRED" | "WARNING" | "CRITICAL";
    dedupeKey?: string;
    cooldownMinutes?: number;
    recipientUserIds?: string[];
  },
) {
  await createWorkflowNotification(tx, {
    type: "SYSTEM_ALERT",
    title: input.title,
    message: input.message,
    projectId: input.projectVendor.projectId,
    vendorId: input.projectVendor.vendor.id,
    projectVendorId: input.projectVendor.id,
    href: buildPaymentHref(input.projectVendor.id),
    recipientUserIds:
      input.recipientUserIds ??
      (input.projectVendor.paymentFinanceOwnerUserId
        ? [input.projectVendor.paymentFinanceOwnerUserId]
        : undefined),
    includeProcurementTeam: true,
    eventKey: "SYSTEM_ALERT",
    severity: input.severity ?? "INFO",
    dedupeKey: input.dedupeKey,
    cooldownMinutes: input.cooldownMinutes,
  });
}

async function summarizeAssignmentTotals(
  tx: Prisma.TransactionClient,
  projectVendorId: string,
) {
  const projectVendor = await tx.projectVendor.findUnique({
    where: {
      id: projectVendorId,
    },
    select: {
      poAmount: true,
      paymentAmount: true,
      paymentAmountSource: true,
      paymentSourceCertificateId: true,
      paymentSourceCertificate: {
        select: {
          certificateCode: true,
        },
      },
      paymentFinanceOwnerUserId: true,
      paymentWorkflowOverrideStatus: true,
      paymentInstallments: {
        orderBy: {
          dueDate: "asc",
        },
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

  if (!projectVendor) {
    throw new Error("Payment assignment not found.");
  }

  const summary = buildPaymentSummary(
    projectVendorId,
    {
      poAmount: projectVendor.poAmount,
      paymentAmount: projectVendor.paymentAmount,
      paymentAmountSource: projectVendor.paymentAmountSource,
      paymentSourceCertificateId: projectVendor.paymentSourceCertificateId,
      paymentSourceCertificateCode:
        projectVendor.paymentSourceCertificate?.certificateCode ?? null,
    },
    projectVendor.paymentInstallments,
  );

  const openInstallments = summary.installments.filter(
    (installment) => !isClosedInstallment(installment.status),
  );

  return {
    summary,
    openInstallments,
    closureFailures: [
      ...(summary.amountMissing ? ["PO amount is not set."] : []),
      ...(projectVendor.paymentFinanceOwnerUserId ? [] : ["Finance owner is not assigned."]),
      ...(summary.totalAmount <= 0 ? ["PO amount must be greater than zero."] : []),
      ...(summary.paidAmount < summary.totalAmount
        ? ["Paid installments do not yet match the PO amount."]
        : []),
      ...(openInstallments.length > 0
        ? ["Pending installments or invoices still exist."]
        : []),
      ...(projectVendor.paymentWorkflowOverrideStatus
        ? [
            `Payment record is currently ${projectVendor.paymentWorkflowOverrideStatus.replaceAll("_", " ").toLowerCase()}.`,
          ]
        : []),
    ],
  };
}

async function resolveFinanceOwnerCandidate(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error("The selected finance owner was not found.");
  }

  const accessProfile = await resolveUserAccessProfile({
    userId: user.id,
    legacyRole: user.role,
  });

  if (!accessProfile.permissions.some((permission) => permission.startsWith("payment."))) {
    throw new Error("The selected finance owner does not have payment workspace permissions.");
  }

  return user;
}

function buildInstallmentMutationPayload(
  input: InstallmentMutationInput,
  previousInstallment: PreviousInstallmentSnapshot | null,
): InstallmentMutationPayload {
  const invoiceNumber = sanitizeText(input.invoiceNumber) ?? previousInstallment?.invoiceNumber ?? null;
  const notes = sanitizeText(input.notes);
  const financeReviewNotes =
    sanitizeText(input.financeReviewNotes) ??
    previousInstallment?.financeReviewNotes ??
    null;
  const basePayload: InstallmentMutationPayload = {
    amount: input.amount,
    dueDate: input.dueDate,
    condition: input.condition,
    invoiceNumber,
    invoiceStoragePath:
      input.invoiceStoragePath !== undefined
        ? input.invoiceStoragePath
        : previousInstallment?.invoiceStoragePath ?? null,
    invoiceDate: input.invoiceDate ?? previousInstallment?.invoiceDate ?? null,
    invoiceAmount:
      input.invoiceAmount !== undefined
        ? toDecimal(input.invoiceAmount)
        : previousInstallment?.invoiceAmount ?? null,
    invoiceReceivedDate:
      input.invoiceReceivedDate ?? previousInstallment?.invoiceReceivedDate ?? null,
    taxInvoiceValidated:
      input.taxInvoiceValidated ?? previousInstallment?.taxInvoiceValidated ?? false,
    invoiceStatus: previousInstallment?.invoiceStatus ?? "MISSING",
    financeReviewNotes,
    financeReviewedAt: previousInstallment?.financeReviewedAt ?? null,
    financeReviewedByUserId: previousInstallment?.financeReviewedByUserId ?? null,
    scheduledPaymentDate:
      input.scheduledPaymentDate ?? previousInstallment?.scheduledPaymentDate ?? null,
    paymentDate: input.paymentDate ?? previousInstallment?.paymentDate ?? null,
    status: previousInstallment?.status ?? "PLANNED",
    notes,
  };

  switch (input.workflowIntent) {
    case "CREATE_PLAN":
      return {
        ...basePayload,
        invoiceStatus: "MISSING",
        status: "PLANNED",
      };
    case "EDIT_PLAN":
      return {
        ...basePayload,
        status:
          previousInstallment?.status ??
          (invoiceNumber || basePayload.invoiceReceivedDate ? "INVOICE_RECEIVED" : "PLANNED"),
      };
    case "ADD_INVOICE":
      return {
        ...basePayload,
        invoiceDate: input.invoiceDate ?? basePayload.invoiceDate,
        invoiceAmount: toDecimal(input.invoiceAmount ?? null),
        invoiceReceivedDate: input.invoiceReceivedDate ?? new Date(),
        invoiceStatus: "RECEIVED",
        status: "INVOICE_RECEIVED",
        financeReviewedAt: null,
        financeReviewedByUserId: null,
        financeReviewNotes: null,
        scheduledPaymentDate: null,
      };
    case "REVIEW_INVOICE": {
      const nextInvoiceStatus = input.invoiceStatus ?? previousInstallment?.invoiceStatus ?? "RECEIVED";

      return {
        ...basePayload,
        invoiceStatus: nextInvoiceStatus,
        financeReviewNotes,
        financeReviewedAt: new Date(),
        financeReviewedByUserId: input.userId,
        status:
          nextInvoiceStatus === "APPROVED_FOR_PAYMENT"
            ? "UNDER_REVIEW"
            : "INVOICE_RECEIVED",
        scheduledPaymentDate:
          nextInvoiceStatus === "APPROVED_FOR_PAYMENT"
            ? basePayload.scheduledPaymentDate
            : null,
      };
    }
    case "SCHEDULE_PAYMENT":
      return {
        ...basePayload,
        invoiceStatus: "APPROVED_FOR_PAYMENT",
        financeReviewedAt: previousInstallment?.financeReviewedAt ?? new Date(),
        financeReviewedByUserId:
          previousInstallment?.financeReviewedByUserId ?? input.userId,
        scheduledPaymentDate: input.scheduledPaymentDate ?? basePayload.scheduledPaymentDate,
        status: "SCHEDULED",
      };
    case "MARK_PAID":
      return {
        ...basePayload,
        paymentDate: input.paymentDate ?? new Date(),
        status: "PAID",
        scheduledPaymentDate:
          input.scheduledPaymentDate ??
          previousInstallment?.scheduledPaymentDate ??
          input.paymentDate ??
          new Date(),
      };
    default:
      return basePayload;
  }
}

export async function saveProjectVendorPaymentInstallment(input: {
  userId: string;
  projectId: string;
  projectVendorId: string;
  installmentId?: string | null;
  workflowIntent:
    | "CREATE_PLAN"
    | "EDIT_PLAN"
    | "ADD_INVOICE"
    | "REVIEW_INVOICE"
    | "SCHEDULE_PAYMENT"
    | "MARK_PAID";
  amount: number;
  dueDate: Date;
  condition: string;
  invoiceNumber?: string | null;
  invoiceStoragePath?: string | null;
  invoiceDate?: Date | null;
  invoiceAmount?: number | null;
  invoiceReceivedDate?: Date | null;
  taxInvoiceValidated: boolean;
  invoiceStatus?: PaymentInvoiceStatus | null;
  financeReviewNotes?: string | null;
  scheduledPaymentDate?: Date | null;
  paymentDate?: Date | null;
  notes?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const projectVendor = await tx.projectVendor.findUnique({
      where: {
        id: input.projectVendorId,
      },
      select: {
        id: true,
        projectId: true,
        poAmount: true,
        poNumber: true,
        contractNumber: true,
        paymentFinanceOwnerUserId: true,
        paymentWorkflowOverrideStatus: true,
        vendor: {
          select: {
            id: true,
            vendorId: true,
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

    if (!projectVendor || projectVendor.projectId !== input.projectId) {
      throw new Error("Project vendor assignment not found.");
    }

    const previousInstallment = input.installmentId
      ? await tx.projectVendorPaymentInstallment.findUnique({
          where: {
            id: input.installmentId,
          },
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
            financeReviewNotes: true,
            financeReviewedAt: true,
            financeReviewedByUserId: true,
            scheduledPaymentDate: true,
            paymentDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : null;

    if (previousInstallment && previousInstallment.projectVendorId !== projectVendor.id) {
      throw new Error("The selected installment does not belong to this assignment.");
    }

    if (input.workflowIntent !== "CREATE_PLAN" && !previousInstallment) {
      throw new Error("Select an existing installment before progressing the payment workflow.");
    }

    const nextPayload = buildInstallmentMutationPayload(input, previousInstallment);

    const installment = previousInstallment
      ? await tx.projectVendorPaymentInstallment.update({
          where: {
            id: previousInstallment.id,
          },
          data: nextPayload,
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
            financeReviewNotes: true,
            financeReviewedAt: true,
            financeReviewedByUserId: true,
            scheduledPaymentDate: true,
            paymentDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await tx.projectVendorPaymentInstallment.create({
          data: {
            projectVendorId: projectVendor.id,
            createdByUserId: input.userId,
            ...nextPayload,
          },
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
            financeReviewNotes: true,
            financeReviewedAt: true,
            financeReviewedByUserId: true,
            scheduledPaymentDate: true,
            paymentDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    await createAuditLog(tx, {
      action: previousInstallment ? "UPDATED" : "CREATED",
      entityType: "ProjectVendorPaymentInstallment",
      entityId: installment.id,
      projectId: projectVendor.projectId,
      userId: input.userId,
      details: {
        projectVendorId: projectVendor.id,
        poNumber: projectVendor.poNumber,
        contractNumber: projectVendor.contractNumber,
        vendorId: projectVendor.vendor.vendorId,
        vendorName: projectVendor.vendor.vendorName,
        projectName: projectVendor.project.projectName,
        workflowIntent: input.workflowIntent,
        previousAmount: previousInstallment ? toNumber(previousInstallment.amount) : null,
        nextAmount: input.amount,
        previousStatus: previousInstallment?.status ?? null,
        nextStatus: installment.status,
        previousInvoiceStatus: previousInstallment?.invoiceStatus ?? null,
        nextInvoiceStatus: installment.invoiceStatus,
        previousInvoiceNumber: previousInstallment?.invoiceNumber ?? null,
        nextInvoiceNumber: installment.invoiceNumber,
        previousInvoiceDate: previousInstallment?.invoiceDate ?? null,
        nextInvoiceDate: installment.invoiceDate,
        previousInvoiceAmount: previousInstallment?.invoiceAmount
          ? toNumber(previousInstallment.invoiceAmount)
          : null,
        nextInvoiceAmount: installment.invoiceAmount ? toNumber(installment.invoiceAmount) : null,
        previousInvoiceReceivedDate: previousInstallment?.invoiceReceivedDate ?? null,
        nextInvoiceReceivedDate: installment.invoiceReceivedDate,
        previousTaxInvoiceValidated: previousInstallment?.taxInvoiceValidated ?? null,
        nextTaxInvoiceValidated: installment.taxInvoiceValidated,
        previousFinanceReviewNotes: previousInstallment?.financeReviewNotes ?? null,
        nextFinanceReviewNotes: installment.financeReviewNotes,
        previousScheduledPaymentDate: previousInstallment?.scheduledPaymentDate ?? null,
        nextScheduledPaymentDate: installment.scheduledPaymentDate,
        previousPaymentDate: previousInstallment?.paymentDate ?? null,
        nextPaymentDate: installment.paymentDate,
      },
    });

    if (!previousInstallment) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Payment plan created",
        message: `${projectVendor.vendor.vendorName} now has an installment plan started for ${projectVendor.project.projectName}.`,
      });
    }

    if (
      (previousInstallment?.invoiceStatus ?? "MISSING") === "MISSING" &&
      installment.invoiceStatus === "RECEIVED"
    ) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Invoice received",
        message: `An invoice was received for ${projectVendor.vendor.vendorName} on ${projectVendor.project.projectName}.`,
        dedupeKey: `payment:${installment.id}:invoice-received`,
        cooldownMinutes: 12 * 60,
        severity: "ACTION_REQUIRED",
      });
    }

    if (
      previousInstallment?.invoiceStatus !== "APPROVED_FOR_PAYMENT" &&
      installment.invoiceStatus === "APPROVED_FOR_PAYMENT"
    ) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Invoice approved for payment",
        message: `${projectVendor.vendor.vendorName} invoice is approved for payment scheduling on ${projectVendor.project.projectName}.`,
        dedupeKey: `payment:${installment.id}:invoice-approved`,
        cooldownMinutes: 12 * 60,
        severity: "ACTION_REQUIRED",
      });
    }

    if (
      previousInstallment?.invoiceStatus !== "REJECTED" &&
      installment.invoiceStatus === "REJECTED"
    ) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Invoice rejected",
        message: `${projectVendor.vendor.vendorName} invoice was rejected and requires procurement follow-up.`,
        dedupeKey: `payment:${installment.id}:invoice-rejected`,
        cooldownMinutes: 12 * 60,
        severity: "WARNING",
      });
    }

    if (previousInstallment?.status !== "SCHEDULED" && installment.status === "SCHEDULED") {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Payment scheduled",
        message: `${projectVendor.vendor.vendorName} now has a payment scheduled for ${projectVendor.project.projectName}.`,
        dedupeKey: `payment:${installment.id}:scheduled`,
        cooldownMinutes: 12 * 60,
      });
    }

    if (previousInstallment?.status !== "PAID" && installment.status === "PAID") {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Payment installment paid",
        message: `${projectVendor.vendor.vendorName} has a paid installment recorded for ${projectVendor.project.projectName}.`,
        dedupeKey: `payment:${installment.id}:paid`,
        cooldownMinutes: 12 * 60,
      });
    }

    if (isInstallmentDueSoon({ status: installment.status, dueDate: installment.dueDate })) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Payment due soon",
        message: `A payment installment for ${projectVendor.vendor.vendorName} is due within the next seven days.`,
        severity: "ACTION_REQUIRED",
        dedupeKey: `payment:${installment.id}:due-soon`,
        cooldownMinutes: 24 * 60,
      });
    }

    if (isInstallmentOverdue({ status: installment.status, dueDate: installment.dueDate })) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Payment overdue",
        message: `A payment installment for ${projectVendor.vendor.vendorName} is overdue and requires follow-up.`,
        severity: "WARNING",
        dedupeKey: `payment:${installment.id}:overdue`,
        cooldownMinutes: 24 * 60,
      });
    }

    const totals = await summarizeAssignmentTotals(tx, projectVendor.id);

    if (totals.summary.totalAmount > 0 && totals.summary.paidAmount >= totals.summary.totalAmount) {
      await createPaymentNotification(tx, {
        projectVendor,
        title: "Full payment completed",
        message: `${projectVendor.vendor.vendorName} has been fully paid for ${projectVendor.project.projectName}.`,
        dedupeKey: `payment:${projectVendor.id}:fully-paid`,
        cooldownMinutes: 24 * 60,
      });
    }

    return {
      projectId: projectVendor.projectId,
      projectVendorId: projectVendor.id,
      installmentId: installment.id,
      fullyPaid:
        totals.summary.totalAmount > 0 &&
        totals.summary.paidAmount >= totals.summary.totalAmount,
    };
  });
}

export async function updatePaymentRecordGovernance(input: {
  userId: string;
  projectVendorId: string;
  financeOwnerUserId?: string | null;
  paymentNotes?: string | null;
  paymentWorkflowOverrideStatus?: "ON_HOLD" | "DISPUTED" | "" | null;
  paymentWorkflowOverrideReason?: string | null;
}) {
  const financeOwnerCandidate = input.financeOwnerUserId?.trim()
    ? await resolveFinanceOwnerCandidate(input.financeOwnerUserId.trim())
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const projectVendor = await tx.projectVendor.findUnique({
      where: {
        id: input.projectVendorId,
      },
      select: {
        id: true,
        projectId: true,
        poAmount: true,
        poNumber: true,
        contractNumber: true,
        paymentFinanceOwnerUserId: true,
        paymentNotes: true,
        paymentWorkflowOverrideStatus: true,
        paymentWorkflowOverrideReason: true,
        vendor: {
          select: {
            id: true,
            vendorId: true,
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

    if (!projectVendor) {
      throw new Error("Payment record not found.");
    }

    const previousFinanceOwner = projectVendor.paymentFinanceOwnerUserId
      ? await tx.user.findUnique({
          where: {
            id: projectVendor.paymentFinanceOwnerUserId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : null;

    const nextFinanceOwnerUserId =
      input.financeOwnerUserId === undefined
        ? projectVendor.paymentFinanceOwnerUserId
        : input.financeOwnerUserId?.trim() || null;
    const nextPaymentNotes =
      input.paymentNotes === undefined
        ? projectVendor.paymentNotes
        : sanitizeText(input.paymentNotes);
    const nextWorkflowOverrideStatus =
      input.paymentWorkflowOverrideStatus === undefined
        ? projectVendor.paymentWorkflowOverrideStatus
        : input.paymentWorkflowOverrideStatus || null;
    const nextWorkflowOverrideReason =
      input.paymentWorkflowOverrideStatus === undefined &&
      input.paymentWorkflowOverrideReason === undefined
        ? projectVendor.paymentWorkflowOverrideReason
        : sanitizeText(input.paymentWorkflowOverrideReason);

    const updated = await tx.projectVendor.update({
      where: {
        id: projectVendor.id,
      },
      data: {
        paymentFinanceOwnerUserId: nextFinanceOwnerUserId,
        paymentNotes: nextPaymentNotes,
        paymentWorkflowOverrideStatus: nextWorkflowOverrideStatus,
        paymentWorkflowOverrideReason: nextWorkflowOverrideReason,
        paymentWorkflowOverrideAt: nextWorkflowOverrideStatus ? new Date() : null,
        paymentWorkflowOverrideByUserId: nextWorkflowOverrideStatus ? input.userId : null,
      },
      select: {
        id: true,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "ProjectVendor",
      entityId: updated.id,
      projectId: projectVendor.projectId,
      userId: input.userId,
      details: {
        projectVendorId: projectVendor.id,
        previousFinanceOwnerUserId: projectVendor.paymentFinanceOwnerUserId,
        previousFinanceOwnerName: previousFinanceOwner?.name ?? null,
        nextFinanceOwnerUserId,
        nextFinanceOwnerName: financeOwnerCandidate?.name ?? previousFinanceOwner?.name ?? null,
        previousPaymentNotes: projectVendor.paymentNotes,
        nextPaymentNotes,
        previousWorkflowOverrideStatus: projectVendor.paymentWorkflowOverrideStatus,
        nextWorkflowOverrideStatus,
        previousWorkflowOverrideReason: projectVendor.paymentWorkflowOverrideReason,
        nextWorkflowOverrideReason,
        poNumber: projectVendor.poNumber,
        contractNumber: projectVendor.contractNumber,
        vendorId: projectVendor.vendor.vendorId,
      },
    });

    const financeOwnerChanged =
      projectVendor.paymentFinanceOwnerUserId !== nextFinanceOwnerUserId &&
      Boolean(nextFinanceOwnerUserId);

    if (financeOwnerChanged && nextFinanceOwnerUserId) {
      await createPaymentNotification(tx, {
        projectVendor: {
          ...projectVendor,
          paymentFinanceOwnerUserId: nextFinanceOwnerUserId,
        },
        title: "Finance owner assigned",
        message: `${projectVendor.vendor.vendorName} payment record for ${projectVendor.project.projectName} was assigned to finance follow-up.`,
        recipientUserIds: [nextFinanceOwnerUserId],
        severity: "ACTION_REQUIRED",
      });
    }

    if (
      projectVendor.paymentWorkflowOverrideStatus !== nextWorkflowOverrideStatus &&
      nextWorkflowOverrideStatus
    ) {
      await createPaymentNotification(tx, {
        projectVendor,
        title:
          nextWorkflowOverrideStatus === "DISPUTED"
            ? "Payment record disputed"
            : "Payment record on hold",
        message: `${projectVendor.vendor.vendorName} payment record for ${projectVendor.project.projectName} was moved to ${nextWorkflowOverrideStatus.replaceAll("_", " ").toLowerCase()}.`,
        severity: "WARNING",
        dedupeKey: `payment:${projectVendor.id}:override:${nextWorkflowOverrideStatus}`,
        cooldownMinutes: 12 * 60,
      });
    }

    return {
      projectId: projectVendor.projectId,
      projectVendorId: projectVendor.id,
      financeOwnerAssigned: financeOwnerChanged,
      financeOwnerEmail: financeOwnerChanged ? financeOwnerCandidate?.email ?? null : null,
      financeOwnerName: financeOwnerChanged ? financeOwnerCandidate?.name ?? null : null,
      vendorName: projectVendor.vendor.vendorName,
      vendorCode: projectVendor.vendor.vendorId,
      projectName: projectVendor.project.projectName,
      projectCode: projectVendor.project.projectCode,
      poNumber: projectVendor.poNumber,
      contractNumber: projectVendor.contractNumber,
    };
  });

  if (result.financeOwnerAssigned && result.financeOwnerEmail && result.financeOwnerName) {
    try {
      await sendDirectWorkflowEmail({
        label: "payment-finance-owner-assigned",
        to: [result.financeOwnerEmail],
        subject: `Payment record assigned - ${result.projectName}`,
        react: WorkflowUpdateEmail({
          preview: `Payment record assigned for ${result.projectName}`,
          heading: "Payment Record Assigned",
          intro:
            "You have been assigned as the finance owner for a payment record in the Procurement Operations Platform.",
          rows: [
            { label: "Project", value: result.projectName },
            { label: "Project Code", value: result.projectCode },
            { label: "Vendor", value: result.vendorName },
            { label: "Vendor ID", value: result.vendorCode },
            { label: "PO Number", value: result.poNumber },
            { label: "Contract Number", value: result.contractNumber },
          ],
          actionLabel: "Open Payment Record",
          actionUrl: absoluteUrl(buildPaymentHref(result.projectVendorId)),
        }),
        fallback: {
          heading: "Payment Record Assigned",
          intro:
            "You have been assigned as the finance owner for a payment record in the Procurement Operations Platform.",
          rows: [
            { label: "Project", value: result.projectName },
            { label: "Project Code", value: result.projectCode },
            { label: "Vendor", value: result.vendorName },
            { label: "Vendor ID", value: result.vendorCode },
            { label: "PO Number", value: result.poNumber },
            { label: "Contract Number", value: result.contractNumber },
          ],
          actionLabel: "Open Payment Record",
          actionUrl: absoluteUrl(buildPaymentHref(result.projectVendorId)),
        },
        logContext: {
          projectVendorId: result.projectVendorId,
          financeOwnerName: result.financeOwnerName,
          financeOwnerEmail: result.financeOwnerEmail,
        },
      });
    } catch (error) {
      await logSystemError({
        action: "PaymentFinanceOwnerAssignmentEmail",
        error,
        userId: input.userId,
        context: {
          projectVendorId: result.projectVendorId,
          financeOwnerEmail: result.financeOwnerEmail,
        },
      });
    }
  }

  return {
    projectId: result.projectId,
    projectVendorId: result.projectVendorId,
  };
}

export async function setPaymentRecordClosedState(input: {
  userId: string;
  userEmail?: string | null;
  projectVendorId: string;
  closeAction: "CLOSE" | "REOPEN";
  closeReason?: string | null;
  overrideClosure: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const projectVendor = await tx.projectVendor.findUnique({
      where: {
        id: input.projectVendorId,
      },
      select: {
        id: true,
        projectId: true,
        poAmount: true,
        poNumber: true,
        contractNumber: true,
        paymentClosedAt: true,
        paymentFinanceOwnerUserId: true,
        paymentWorkflowOverrideStatus: true,
        vendor: {
          select: {
            id: true,
            vendorId: true,
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

    if (!projectVendor) {
      throw new Error("Payment record not found.");
    }

    const closing = input.closeAction === "CLOSE";

    if (closing) {
      const closureSnapshot = await summarizeAssignmentTotals(tx, projectVendor.id);
      const canForceClose =
        input.overrideClosure &&
        input.userEmail?.trim().toLowerCase() === PRIMARY_EVALUATOR_EMAIL;

      if (closureSnapshot.closureFailures.length > 0 && !canForceClose) {
        throw new Error(closureSnapshot.closureFailures.join(" "));
      }
    }

    const updated = await tx.projectVendor.update({
      where: {
        id: projectVendor.id,
      },
      data: {
        paymentClosedAt: closing ? new Date() : null,
        paymentClosedByUserId: closing ? input.userId : null,
      },
      select: {
        id: true,
        paymentClosedAt: true,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "ProjectVendor",
      entityId: projectVendor.id,
      projectId: projectVendor.projectId,
      userId: input.userId,
      details: {
        projectVendorId: projectVendor.id,
        poNumber: projectVendor.poNumber,
        contractNumber: projectVendor.contractNumber,
        vendorId: projectVendor.vendor.vendorId,
        previousClosedAt: projectVendor.paymentClosedAt,
        nextClosedAt: updated.paymentClosedAt,
        overrideClosure: input.overrideClosure,
        reason: sanitizeText(input.closeReason),
      },
    });

    await createPaymentNotification(tx, {
      projectVendor,
      title: closing ? "Payment record closed" : "Payment record reopened",
      message: closing
        ? `${projectVendor.vendor.vendorName} payment record was closed for ${projectVendor.project.projectName}.`
        : `${projectVendor.vendor.vendorName} payment record was reopened for ${projectVendor.project.projectName}.`,
      severity: closing ? "WARNING" : "INFO",
      recipientUserIds: projectVendor.paymentFinanceOwnerUserId
        ? [projectVendor.paymentFinanceOwnerUserId]
        : undefined,
    });

    return {
      projectId: projectVendor.projectId,
      projectVendorId: projectVendor.id,
      closed: closing,
    };
  });
}
