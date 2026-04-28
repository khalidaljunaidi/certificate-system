import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canExportPayments, canViewPayments } from "@/lib/permissions";
import type { PaymentRecordStatusView } from "@/lib/types";
import { getPaymentsWorkspace } from "@/server/queries/payment-queries";
import { generatePaymentsListPdfBuffer } from "@/server/services/payment-report-service";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  const escapedValue = stringValue.replaceAll('"', '""');
  return `"${escapedValue}"`;
}

function buildCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function buildExcelHtml(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) {
    return "<table><tr><td>No payment records found</td></tr></table>";
  }

  const headers = Object.keys(rows[0]);

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
    </head>
    <body>
      <table border="1">
        <thead>
          <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${headers
                  .map((header) => `<td>${row[header] ?? ""}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </body>
  </html>`;
}

export async function GET(request: Request) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!canViewPayments(user) || !canExportPayments(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "excel"
    ? "excel"
    : searchParams.get("format") === "pdf"
      ? "pdf"
      : "csv";

  const workspace = await getPaymentsWorkspace(user, {
    search: searchParams.get("search") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    vendorId: searchParams.get("vendorId") ?? undefined,
    reference: searchParams.get("reference") ?? undefined,
    paymentStatus:
      (searchParams.get("paymentStatus") as PaymentRecordStatusView | "") ??
      undefined,
    financeOwnerUserId: searchParams.get("financeOwnerUserId") ?? undefined,
    dueFrom: searchParams.get("dueFrom") ?? undefined,
    dueTo: searchParams.get("dueTo") ?? undefined,
    overdueOnly: searchParams.get("overdueOnly") ?? undefined,
  });

  if (format === "pdf") {
    const pdfBuffer = await generatePaymentsListPdfBuffer(workspace);

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="payments-portfolio-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf"`,
      },
    });
  }

  const rows = workspace.records.map((record) => ({
    Project: `${record.projectName} (${record.projectCode})`,
    Vendor: record.vendorName,
    "Vendor ID": record.vendorId,
    "PO Number": record.poNumber,
    "Contract Number": record.contractNumber,
    "Amount Source":
      record.amountSource === "PO_CONTRACT" ? "PO / Contract" : "PO amount not set",
    "Total Amount": record.amountMissing
      ? "PO amount not set"
      : record.totalAmount.toFixed(2),
    "Paid Amount": record.paidAmount.toFixed(2),
    Remaining: record.remainingAmount.toFixed(2),
    "Progress %": record.progressPercent.toFixed(2),
    "Next Due Date": record.nextDueDate?.toISOString().slice(0, 10) ?? "",
    Status: record.status,
    "Finance Owner": record.financeOwner?.name ?? "",
    "Installments": record.installmentCount,
    "Due This Month": record.dueThisMonthInstallmentCount,
    "Overdue Installments": record.overdueInstallmentCount,
  }));

  if (format === "excel") {
    return new NextResponse(buildExcelHtml(rows), {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="payments-portfolio-${new Date()
          .toISOString()
          .slice(0, 10)}.xls"`,
      },
    });
  }

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-portfolio-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
