import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canEvaluateTeamPerformance } from "@/lib/permissions";
import { getMonthlyGovernanceDashboard } from "@/server/queries/performance-queries";

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
    return "<table><tr><td>No monthly employee records found</td></tr></table>";
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

  if (!canEvaluateTeamPerformance(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get("cycleId") ?? undefined;
  const format = searchParams.get("format") === "excel" ? "excel" : "csv";
  const dashboard = await getMonthlyGovernanceDashboard(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      permissions: user.permissions,
    },
    cycleId,
  );

  if (!dashboard.selectedCycle) {
    return new NextResponse("Monthly cycle not found", { status: 404 });
  }

  const rows = dashboard.employeeCards.map((employee) => ({
    Employee: employee.name,
    Title: employee.title,
    Cycle: dashboard.selectedCycle!.label,
    "Assigned Tasks": employee.assignedTasks,
    "Completed Tasks": employee.completedTasks,
    "Overdue Tasks": employee.overdueTasks,
    "Completion %": employee.completionRate,
    "On-Time %": employee.onTimeCompletionRate,
    "Average Completion Hours": employee.averageCompletionHours,
    "System Score %": employee.systemScore,
    "Manager Score %": employee.managerScore,
    "Monthly Score %": employee.monthlyScore,
    Grade: employee.grade,
    "Manager Notes": employee.review?.managerNotes ?? null,
    Recommendation: employee.review?.recommendation ?? null,
  }));

  if (format === "excel") {
    return new NextResponse(buildExcelHtml(rows), {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="monthly-performance-${dashboard.selectedCycle.year}-${String(dashboard.selectedCycle.month).padStart(2, "0")}.xls"`,
      },
    });
  }

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monthly-performance-${dashboard.selectedCycle.year}-${String(dashboard.selectedCycle.month).padStart(2, "0")}.csv"`,
    },
  });
}
