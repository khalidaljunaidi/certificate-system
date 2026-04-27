import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { getVendorRegistry } from "@/server/queries/vendor-queries";

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
    return "<table><tr><td>No vendors found</td></tr></table>";
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

  if (!canManageVendorGovernance(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "excel" ? "excel" : "csv";
  const vendors = await getVendorRegistry({
    search: searchParams.get("search") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    subcategoryId: searchParams.get("subcategoryId") ?? undefined,
    finalGrade: searchParams.get("finalGrade") ?? undefined,
    evaluationYear: searchParams.get("evaluationYear") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    activeProject: searchParams.get("activeProject") ?? undefined,
  });

  const rows = vendors.map((vendor) => ({
    "Vendor Name": vendor.vendorName,
    "Vendor Code": vendor.vendorId,
    "Vendor Email": vendor.vendorEmail,
    Phone: vendor.vendorPhone,
    Status: vendor.status,
    Classification: vendor.classification,
    Category: vendor.categoryName,
    Subcategory: vendor.subcategoryName,
    Projects: vendor.projectCount,
    Assignments: vendor.assignmentCount,
    Certificates: vendor.certificateCount,
    "Issued Certificates": vendor.issuedCertificateCount,
    "Latest Evaluation Year": vendor.latestEvaluationYear,
    "Latest Evaluation Grade": vendor.latestFinalGrade,
    "Latest Evaluation Score %": vendor.latestFinalScorePercent,
    Notes: vendor.notes,
  }));

  if (format === "excel") {
    return new NextResponse(buildExcelHtml(rows), {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="vendor-analytics-${new Date()
          .toISOString()
          .slice(0, 10)}.xls"`,
      },
    });
  }

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendor-analytics-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
