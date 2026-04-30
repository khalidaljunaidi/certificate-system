import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate, formatSarAmount } from "@/lib/utils";
import type {
  PaymentRecordDetailView,
  PaymentWorkspaceView,
} from "@/lib/types";
import {
  PaymentRecordReportDocument,
  PaymentsListReportDocument,
  type PaymentRecordPdfModel,
  type PaymentsListPdfModel,
} from "@/pdf/payments-report";

type AuditDetailsRecord = Record<string, unknown>;

function asAuditDetailsRecord(value: unknown): AuditDetailsRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as AuditDetailsRecord;
}

function formatAuditValue(value: unknown, amountField = false) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (amountField && (typeof value === "number" || typeof value === "string")) {
    return formatSarAmount(Number(value));
  }

  if (typeof value === "string") {
    const parsedDate = Date.parse(value);

    if (!Number.isNaN(parsedDate) && /T|\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatDate(new Date(parsedDate));
    }

    return value.replaceAll("_", " ");
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return "Structured details captured";
}

function buildPaymentAuditSummary(
  entry: PaymentRecordDetailView["record"]["auditTrail"][number],
) {
  const details = asAuditDetailsRecord(entry.details);

  if (!details) {
    return {
      summaryRows: ["Audit activity recorded."],
      changes: [],
    };
  }

  const summaryRows: string[] = [];
  const summaryFields: Array<[string, string, boolean?]> = [
    ["poNumber", "PO Number"],
    ["contractNumber", "Contract Number"],
    ["vendorId", "Vendor ID"],
    ["vendorName", "Vendor Name"],
    ["projectName", "Project"],
    ["reason", "Reason"],
    ["sourceSyncReason", "Sync Reason"],
  ];

  for (const [key, label, amountField] of summaryFields) {
    const value = details[key];

    if (value !== undefined && value !== null && value !== "") {
      summaryRows.push(`${label}: ${formatAuditValue(value, amountField)}`);
    }
  }

  const changes: Array<{
    field: string;
    previousValue: string;
    newValue: string;
  }> = [];
  const comparisonFields: Array<{
    label: string;
    previousKey: string;
    nextKey: string;
    amountField?: boolean;
  }> = [
    {
      label: "Finance Owner",
      previousKey: "previousFinanceOwnerName",
      nextKey: "nextFinanceOwnerName",
    },
    {
      label: "Payment Notes",
      previousKey: "previousPaymentNotes",
      nextKey: "nextPaymentNotes",
    },
    {
      label: "PO Number",
      previousKey: "previousPoNumber",
      nextKey: "nextPoNumber",
    },
    {
      label: "Contract Number",
      previousKey: "previousContractNumber",
      nextKey: "nextContractNumber",
    },
    {
      label: "PO Amount",
      previousKey: "previousPoAmount",
      nextKey: "nextPoAmount",
      amountField: true,
    },
    {
      label: "Installment Amount",
      previousKey: "previousAmount",
      nextKey: "nextAmount",
      amountField: true,
    },
    {
      label: "Installment Status",
      previousKey: "previousStatus",
      nextKey: "nextStatus",
    },
    {
      label: "Invoice Number",
      previousKey: "previousInvoiceNumber",
      nextKey: "nextInvoiceNumber",
    },
    {
      label: "Invoice Status",
      previousKey: "previousInvoiceStatus",
      nextKey: "nextInvoiceStatus",
    },
    {
      label: "Invoice Received Date",
      previousKey: "previousInvoiceReceivedDate",
      nextKey: "nextInvoiceReceivedDate",
    },
    {
      label: "Odoo Invoice",
      previousKey: "previousInvoiceExistsInOdoo",
      nextKey: "nextInvoiceExistsInOdoo",
    },
    {
      label: "Odoo Reference",
      previousKey: "previousOdooInvoiceReference",
      nextKey: "nextOdooInvoiceReference",
    },
    {
      label: "Odoo Upload Date",
      previousKey: "previousOdooInvoiceUploadedAt",
      nextKey: "nextOdooInvoiceUploadedAt",
    },
    {
      label: "Closed At",
      previousKey: "previousClosedAt",
      nextKey: "nextClosedAt",
    },
  ];

  for (const field of comparisonFields) {
    const previousValue = details[field.previousKey];
    const nextValue = details[field.nextKey];

    if (previousValue === undefined && nextValue === undefined) {
      continue;
    }

    changes.push({
      field: field.label,
      previousValue: formatAuditValue(previousValue, field.amountField),
      newValue: formatAuditValue(nextValue, field.amountField),
    });
  }

  return {
    summaryRows:
      summaryRows.length > 0 ? summaryRows.slice(0, 4) : ["Audit activity recorded."],
    changes: changes.slice(0, 5),
  };
}

export async function buildPaymentsListPdfModel(
  workspace: PaymentWorkspaceView,
): Promise<PaymentsListPdfModel> {
  return {
    generatedAt: formatDate(new Date()),
    documentReference: `PAY-LIST-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
    summary: [
      {
        label: "Total PO Amount",
        value: formatSarAmount(workspace.kpis.totalPoAmount),
      },
      {
        label: "Total Paid",
        value: formatSarAmount(workspace.kpis.totalPaid),
      },
      {
        label: "Total Remaining",
        value: formatSarAmount(workspace.kpis.totalRemaining),
      },
      {
        label: "Overdue Payments",
        value: String(workspace.kpis.overduePayments),
      },
      {
        label: "Due This Month",
        value: String(workspace.kpis.dueThisMonth),
      },
      {
        label: "Closed",
        value: String(workspace.kpis.closedPayments),
      },
    ],
    rows: workspace.records.map((record) => ({
      project: `${record.projectName} (${record.projectCode})`,
      vendor: record.vendorName,
      reference: [record.poNumber, record.contractNumber].filter(Boolean).join(" | ") || "-",
      totalAmount: record.amountMissing
        ? "PO amount not set"
        : formatSarAmount(record.totalAmount),
      paidAmount: formatSarAmount(record.paidAmount),
      remainingAmount: formatSarAmount(record.remainingAmount),
      nextDueDate: formatDate(record.nextDueDate),
      status: record.status.replaceAll("_", " "),
      financeOwner: record.financeOwner?.name ?? "Unassigned",
    })),
  };
}

export async function generatePaymentsListPdfBuffer(
  workspace: PaymentWorkspaceView,
) {
  const model = await buildPaymentsListPdfModel(workspace);
  return renderToBuffer(<PaymentsListReportDocument model={model} />);
}

export async function buildPaymentRecordPdfModel(
  detail: PaymentRecordDetailView,
): Promise<PaymentRecordPdfModel> {
  const invoices = detail.record.installments
    .map((installment, index) => ({
      installmentLabel: `Installment ${index + 1}`,
      invoiceNumber: installment.invoiceNumber ?? "-",
      invoiceDate: formatDate(installment.invoiceDate),
      invoiceAmount:
        installment.invoiceAmount !== null && installment.invoiceAmount !== undefined
          ? formatSarAmount(installment.invoiceAmount)
          : "Invoice amount not set",
      receivedDate: formatDate(installment.invoiceReceivedDate),
      taxValidated: installment.taxInvoiceValidated ? "Validated" : "Pending",
      status: installment.invoiceStatus.replaceAll("_", " "),
    }))
    .filter(
      (invoice) =>
        invoice.invoiceNumber !== "-" ||
        invoice.invoiceDate !== "-" ||
        invoice.receivedDate !== "-" ||
        invoice.status !== "MISSING",
    );

  return {
    generatedAt: formatDate(new Date()),
    documentReference: `PAY-${detail.record.projectVendorId.slice(-8).toUpperCase()}`,
    projectName: detail.record.projectName,
    projectCode: detail.record.projectCode,
    vendorName: detail.record.vendorName,
    vendorCode: detail.record.vendorId,
    poNumber: detail.record.poNumber ?? "PO number not set",
    contractNumber: detail.record.contractNumber ?? "No contract number",
    totalAmount: detail.record.amountMissing
      ? "PO amount not set"
      : formatSarAmount(detail.record.totalAmount),
    amountSource: detail.record.amountMissing
      ? "PO amount not set"
      : "From PO / contract assignment",
    paidAmount: formatSarAmount(detail.record.paidAmount),
    remainingAmount: formatSarAmount(detail.record.remainingAmount),
    progressPercent: detail.record.amountMissing
      ? "Pending"
      : `${Math.round(detail.record.progressPercent)}%`,
    status: detail.record.status.replaceAll("_", " "),
    closureStatus: detail.record.closedAt
      ? `Closed ${formatDate(detail.record.closedAt)}${detail.record.closedByName ? ` by ${detail.record.closedByName}` : ""}`
      : detail.record.status === "FULLY_PAID"
        ? "Ready for closure"
        : "Closure pending",
    nextDueDate: formatDate(detail.record.nextDueDate),
    financeOwner:
      detail.record.financeOwner?.name ?? "Finance owner not assigned",
    financeNotes:
      detail.record.paymentNotes?.trim() || "No finance notes recorded.",
    invoices,
    installments: detail.record.installments.map((installment, index) => ({
      label: `Installment ${index + 1}`,
      amount: formatSarAmount(installment.amount),
      dueDate: formatDate(installment.dueDate),
      condition: installment.condition,
      invoiceNumber: installment.invoiceNumber ?? "-",
      paymentDate: formatDate(installment.paymentDate),
      status: installment.status.replaceAll("_", " "),
      notes: installment.notes ?? "-",
    })),
    certificates: detail.record.certificates.map((certificate) => ({
      code: certificate.certificateCode,
      status: certificate.status.replaceAll("_", " "),
      totalAmount: formatSarAmount(certificate.totalAmount),
      updatedAt: formatDate(certificate.updatedAt),
    })),
    auditItems: detail.record.auditTrail.slice(0, 8).map((entry) => {
      const auditSummary = buildPaymentAuditSummary(entry);

      return {
        title: `${entry.action.replaceAll("_", " ")} - ${entry.entityType
          .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
          .replaceAll("_", " ")}`,
        actorName: entry.actorName ?? "System",
        createdAt: formatDate(entry.createdAt),
        summaryRows: auditSummary.summaryRows,
        changes: auditSummary.changes,
      };
    }),
  };
}

export async function generatePaymentRecordPdfBuffer(
  detail: PaymentRecordDetailView,
) {
  const model = await buildPaymentRecordPdfModel(detail);
  return renderToBuffer(<PaymentRecordReportDocument model={model} />);
}
