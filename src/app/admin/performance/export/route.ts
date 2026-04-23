import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canEvaluateTeamPerformance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function buildCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ].join("\n");
}

function buildExcelHtml(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) {
    return "<table><tr><td>No performance reviews found</td></tr></table>";
  }

  const headers = Object.keys(rows[0]);
  return `<!DOCTYPE html><html><body><table border="1"><thead><tr>${headers
    .map((header) => `<th>${header}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${row[header] ?? ""}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table></body></html>`;
}

export async function GET(request: Request) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!canEvaluateTeamPerformance(user.role, user.email)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "excel" ? "excel" : "csv";
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const quarter = Number(searchParams.get("quarter") || 1);
  const employeeUserId = searchParams.get("employeeUserId") || undefined;

  const reviews = await prisma.quarterlyPerformanceReview.findMany({
    where: {
      year,
      quarter,
      ...(employeeUserId ? { employeeUserId } : {}),
    },
    orderBy: {
      employee: {
        name: "asc",
      },
    },
    include: {
      employee: {
        select: {
          name: true,
          email: true,
          title: true,
          role: true,
        },
      },
      evaluator: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const rows = reviews.map((review) => ({
    Employee: review.employee.name,
    Email: review.employee.email,
    Title: review.employee.title,
    Role: review.employee.role,
    Year: review.year,
    Quarter: review.quarter,
    Status: review.status,
    "System Score %": review.systemScorePercent.toNumber(),
    "Manager Score %": review.managerScorePercent.toNumber(),
    "Final Score %": review.finalScorePercent.toNumber(),
    Grade: review.grade,
    "Execution Capability %": review.executionCapability?.toNumber() ?? null,
    "Accuracy Index %": review.accuracyIndex?.toNumber() ?? null,
    "Ownership Index %": review.ownershipIndex?.toNumber() ?? null,
    "Follow-up Discipline %": review.followUpDiscipline?.toNumber() ?? null,
    "Response Agility %": review.responseAgility?.toNumber() ?? null,
    "Procurement Effectiveness %":
      review.procurementEffectiveness?.toNumber() ?? null,
    Evaluator: review.evaluator.name,
    "Manager Comments": review.managerComments,
    Recommendation: review.recommendation,
  }));

  if (format === "excel") {
    return new NextResponse(buildExcelHtml(rows), {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="performance-reviews-${year}-Q${quarter}.xls"`,
      },
    });
  }

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="performance-reviews-${year}-Q${quarter}.csv"`,
    },
  });
}
