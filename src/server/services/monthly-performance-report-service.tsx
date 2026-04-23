import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate } from "@/lib/utils";
import type { MonthlyGovernanceDashboardView } from "@/lib/types";
import {
  MonthlyPerformanceReportDocument,
  type MonthlyPerformancePdfModel,
} from "@/pdf/monthly-performance-report";

export async function buildMonthlyPerformancePdfModel(
  dashboard: MonthlyGovernanceDashboardView,
): Promise<MonthlyPerformancePdfModel> {
  if (!dashboard.selectedCycle) {
    throw new Error("A monthly cycle must be selected before building the report.");
  }

  return {
    cycleLabel: dashboard.selectedCycle.label,
    generatedAt: formatDate(new Date()),
    teamOverview: [
      {
        label: "Total Tasks",
        value: String(dashboard.kpis.totalTasks),
      },
      {
        label: "Completed Tasks",
        value: String(dashboard.kpis.completedTasks),
      },
      {
        label: "Overdue Tasks",
        value: String(dashboard.kpis.overdueTasks),
      },
      {
        label: "Monthly Completion Rate",
        value: `${dashboard.kpis.monthlyCompletionRate.toFixed(2)}%`,
      },
      {
        label: "Workload Balance",
        value: `${dashboard.kpis.workloadBalance.toFixed(2)}%`,
      },
      {
        label: "Monthly Team Score",
        value: `${dashboard.kpis.monthlyTeamScore.toFixed(2)}%`,
      },
    ],
    employeeCards: dashboard.employeeCards.map((employee) => ({
      name: employee.name,
      title: employee.title,
      assignedTasks: String(employee.assignedTasks),
      completedTasks: String(employee.completedTasks),
      overdueTasks: String(employee.overdueTasks),
      onTimeRate: `${employee.onTimeCompletionRate.toFixed(2)}%`,
      averageCompletion: `${employee.averageCompletionHours.toFixed(2)}h`,
      monthlyScore: `${employee.monthlyScore.toFixed(2)}%`,
      grade: employee.grade ? `Grade ${employee.grade}` : "Draft",
      managerNotes: employee.review?.managerNotes ?? "No manager notes recorded yet.",
      recommendation:
        employee.review?.recommendation ?? "No recommendation recorded yet.",
    })),
  };
}

export async function generateMonthlyPerformancePdfBuffer(
  dashboard: MonthlyGovernanceDashboardView,
) {
  const model = await buildMonthlyPerformancePdfModel(dashboard);
  return renderToBuffer(<MonthlyPerformanceReportDocument model={model} />);
}
