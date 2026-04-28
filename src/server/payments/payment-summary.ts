import type { Prisma } from "@prisma/client";

import type {
  PaymentRecordRecommendedActionView,
  PaymentRecordStatusView,
  ProjectVendorPaymentInstallmentView,
  ProjectVendorPaymentSummaryView,
} from "@/lib/types";

type RawInstallmentStatus =
  | "PLANNED"
  | "INVOICE_REQUIRED"
  | "INVOICE_RECEIVED"
  | "UNDER_REVIEW"
  | "SCHEDULED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

type RawInstallmentInvoiceStatus =
  | "MISSING"
  | "RECEIVED"
  | "REJECTED"
  | "APPROVED_FOR_PAYMENT";

type RawInstallment = {
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
  invoiceStatus: RawInstallmentInvoiceStatus;
  financeReviewNotes: string | null;
  financeReviewedAt: Date | null;
  financeReviewedBy: {
    name: string;
  } | null;
  scheduledPaymentDate: Date | null;
  paymentDate: Date | null;
  status: RawInstallmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysFromToday(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() + days);
  return date;
}

function endOfCurrentMonth() {
  const date = startOfToday();
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isClosedInstallment(
  installment: Pick<ProjectVendorPaymentInstallmentView, "status">,
) {
  return installment.status === "PAID" || installment.status === "CANCELLED";
}

function hasInvoicePayload(
  installment: Pick<
    ProjectVendorPaymentInstallmentView,
    "invoiceStatus" | "invoiceNumber" | "invoiceReceivedDate" | "invoiceStoragePath"
  >,
) {
  return (
    installment.invoiceStatus !== "MISSING" ||
    Boolean(installment.invoiceNumber) ||
    Boolean(installment.invoiceReceivedDate) ||
    Boolean(installment.invoiceStoragePath)
  );
}

export function mapPaymentInstallments(
  installments: RawInstallment[],
): ProjectVendorPaymentInstallmentView[] {
  return installments.map((installment) => ({
    id: installment.id,
    projectVendorId: installment.projectVendorId,
    amount: Number(installment.amount),
    dueDate: installment.dueDate,
    condition: installment.condition,
    invoiceNumber: installment.invoiceNumber,
    invoiceStoragePath: installment.invoiceStoragePath,
    invoiceDate: installment.invoiceDate,
    invoiceAmount: toNumber(installment.invoiceAmount),
    invoiceReceivedDate: installment.invoiceReceivedDate,
    taxInvoiceValidated: installment.taxInvoiceValidated,
    invoiceStatus: installment.invoiceStatus,
    financeReviewNotes: installment.financeReviewNotes,
    financeReviewedAt: installment.financeReviewedAt,
    financeReviewedByName: installment.financeReviewedBy?.name ?? null,
    scheduledPaymentDate: installment.scheduledPaymentDate,
    paymentDate: installment.paymentDate,
    status: installment.status,
    notes: installment.notes,
    createdAt: installment.createdAt,
    updatedAt: installment.updatedAt,
  }));
}

function getOpenInstallments(installments: ProjectVendorPaymentInstallmentView[]) {
  return installments.filter((installment) => !isClosedInstallment(installment));
}

export function buildPaymentSummary(
  projectVendorId: string,
  input: {
    poAmount: Prisma.Decimal | number | null | undefined;
    paymentAmount: Prisma.Decimal | number | null | undefined;
    paymentAmountSource: "PO_CONTRACT" | "APPROVED_CERTIFICATE" | null | undefined;
    paymentSourceCertificateId?: string | null | undefined;
    paymentSourceCertificateCode?: string | null | undefined;
  },
  installments: RawInstallment[],
): ProjectVendorPaymentSummaryView {
  const mappedInstallments = mapPaymentInstallments(installments);
  const openInstallments = getOpenInstallments(mappedInstallments);
  const plannedAmount = openInstallments.reduce(
    (sum, installment) => sum + installment.amount,
    0,
  );
  const normalizedPoAmount = toNumber(input.poAmount);
  const normalizedActiveAmount = normalizedPoAmount;
  const amountMissing = normalizedActiveAmount === null;
  const totalAmount = normalizedActiveAmount ?? 0;
  const paidAmount = mappedInstallments
    .filter((installment) => installment.status === "PAID")
    .reduce((sum, installment) => sum + installment.amount, 0);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const invoiceReceivedCount = openInstallments.filter((installment) =>
    hasInvoicePayload(installment),
  ).length;
  const approvedInvoiceCount = openInstallments.filter(
    (installment) => installment.invoiceStatus === "APPROVED_FOR_PAYMENT",
  ).length;
  const scheduledInstallmentCount = openInstallments.filter(
    (installment) => installment.status === "SCHEDULED",
  ).length;
  const paidInstallmentCount = mappedInstallments.filter(
    (installment) => installment.status === "PAID",
  ).length;
  const pendingInstallmentCount = openInstallments.length;
  const hasOverdueInstallments = getOverdueInstallmentCount(mappedInstallments) > 0;

  return {
    projectVendorId,
    poAmount: normalizedPoAmount,
    activeAmount: normalizedActiveAmount,
    amountMissing,
    amountSource: normalizedActiveAmount === null ? null : "PO_CONTRACT",
    amountSourceCertificateId: null,
    amountSourceCertificateCode: null,
    plannedAmount,
    totalAmount,
    paidAmount,
    remainingAmount,
    progressPercent,
    installmentCount: mappedInstallments.length,
    invoiceReceivedCount,
    approvedInvoiceCount,
    scheduledInstallmentCount,
    paidInstallmentCount,
    pendingInstallmentCount,
    hasOverdueInstallments,
    installments: mappedInstallments,
  };
}

export function getNextPaymentDueDate(
  installments: ProjectVendorPaymentInstallmentView[],
) {
  return (
    installments
      .filter((installment) => !isClosedInstallment(installment))
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0]
      ?.dueDate ?? null
  );
}

export function getOverdueInstallmentCount(
  installments: ProjectVendorPaymentInstallmentView[],
) {
  const today = startOfToday();

  return installments.filter(
    (installment) =>
      !isClosedInstallment(installment) &&
      (installment.status === "OVERDUE" || installment.dueDate < today),
  ).length;
}

export function getUpcomingInstallmentCount(
  installments: ProjectVendorPaymentInstallmentView[],
) {
  const today = startOfToday();
  const soonThreshold = daysFromToday(14);

  return installments.filter(
    (installment) =>
      !isClosedInstallment(installment) &&
      installment.dueDate >= today &&
      installment.dueDate <= soonThreshold,
  ).length;
}

export function getDueThisMonthInstallmentCount(
  installments: ProjectVendorPaymentInstallmentView[],
) {
  const today = startOfToday();
  const monthEnd = endOfCurrentMonth();

  return installments.filter(
    (installment) =>
      !isClosedInstallment(installment) &&
      installment.dueDate >= today &&
      installment.dueDate <= monthEnd,
  ).length;
}

export function getNextPaymentActionInstallment(
  installments: ProjectVendorPaymentInstallmentView[],
) {
  const priorityOrder: Array<ProjectVendorPaymentInstallmentView["status"]> = [
    "OVERDUE",
    "INVOICE_RECEIVED",
    "UNDER_REVIEW",
    "SCHEDULED",
    "INVOICE_REQUIRED",
    "PLANNED",
  ];

  const openInstallments = getOpenInstallments(installments);

  for (const status of priorityOrder) {
    const match = openInstallments.find((installment) => installment.status === status);

    if (match) {
      return match;
    }
  }

  return openInstallments[0] ?? null;
}

export function derivePaymentRecordStatus(input: {
  summary: ProjectVendorPaymentSummaryView;
  paymentClosedAt: Date | null;
  workflowOverrideStatus: "ON_HOLD" | "DISPUTED" | null;
}): PaymentRecordStatusView {
  if (input.workflowOverrideStatus === "DISPUTED") {
    return "DISPUTED";
  }

  if (input.workflowOverrideStatus === "ON_HOLD") {
    return "ON_HOLD";
  }

  if (input.paymentClosedAt) {
    return "CLOSED";
  }

  if (input.summary.amountMissing) {
    return "PO_AMOUNT_REQUIRED";
  }

  if (input.summary.totalAmount > 0 && input.summary.remainingAmount <= 0) {
    return "FULLY_PAID";
  }

  const openInstallments = getOpenInstallments(input.summary.installments);

  if (openInstallments.length === 0) {
    return "READY_FOR_INVOICE";
  }

  if (input.summary.paidAmount > 0) {
    return "PARTIALLY_PAID";
  }

  if (openInstallments.some((installment) => installment.status === "SCHEDULED")) {
    return "PAYMENT_SCHEDULED";
  }

  if (
    openInstallments.some(
      (installment) =>
        installment.status === "UNDER_REVIEW" ||
        installment.invoiceStatus === "APPROVED_FOR_PAYMENT",
    )
  ) {
    return "UNDER_FINANCE_REVIEW";
  }

  if (
    openInstallments.some(
      (installment) =>
        installment.status === "INVOICE_RECEIVED" ||
        installment.invoiceStatus === "RECEIVED" ||
        installment.invoiceStatus === "REJECTED",
    )
  ) {
    return "INVOICE_RECEIVED";
  }

  return "AWAITING_INVOICE";
}

export function deriveRecommendedPaymentAction(input: {
  status: PaymentRecordStatusView;
  nextActionInstallment: ProjectVendorPaymentInstallmentView | null;
}): PaymentRecordRecommendedActionView {
  switch (input.status) {
    case "PO_AMOUNT_REQUIRED":
      return "SET_PO_AMOUNT";
    case "READY_FOR_INVOICE":
      return "ADD_INSTALLMENT";
    case "AWAITING_INVOICE":
      return input.nextActionInstallment ? "ADD_INVOICE" : "ADD_INSTALLMENT";
    case "INVOICE_RECEIVED":
      return "REVIEW_INVOICE";
    case "UNDER_FINANCE_REVIEW":
      return "SCHEDULE_PAYMENT";
    case "PAYMENT_SCHEDULED":
      return "MARK_PAID";
    case "PARTIALLY_PAID":
      if (input.nextActionInstallment?.status === "SCHEDULED") {
        return "MARK_PAID";
      }

      if (
        input.nextActionInstallment?.status === "UNDER_REVIEW" ||
        input.nextActionInstallment?.invoiceStatus === "APPROVED_FOR_PAYMENT"
      ) {
        return "SCHEDULE_PAYMENT";
      }

      if (
        input.nextActionInstallment?.status === "INVOICE_RECEIVED" ||
        input.nextActionInstallment?.invoiceStatus === "RECEIVED"
      ) {
        return "REVIEW_INVOICE";
      }

      if (input.nextActionInstallment) {
        return "ADD_INVOICE";
      }

      return "VIEW_RECORD";
    case "FULLY_PAID":
      return "CLOSE_PAYMENT";
    case "CLOSED":
    case "ON_HOLD":
    case "DISPUTED":
    default:
      return "VIEW_RECORD";
  }
}
