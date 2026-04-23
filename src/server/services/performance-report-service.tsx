import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate } from "@/lib/utils";
import type { PerformanceReviewDetailView } from "@/lib/types";
import {
  PerformanceReviewReportDocument,
  type PerformanceReviewPdfModel,
} from "@/pdf/performance-review-report";

export async function buildPerformanceReviewPdfModel(
  review: PerformanceReviewDetailView,
): Promise<PerformanceReviewPdfModel> {
  return {
    employeeName: review.employee.name,
    employeeTitle: review.employee.title,
    employeeRole: review.employee.role.replaceAll("_", " "),
    evaluatorName: review.evaluator.name,
    reviewPeriod: `Q${review.quarter} ${review.year}`,
    generatedAt: formatDate(new Date()),
    systemScore: `${review.systemScorePercent.toFixed(2)}%`,
    managerScore: `${review.managerScorePercent.toFixed(2)}%`,
    finalScore: `${review.finalScorePercent.toFixed(2)}%`,
    grade: review.grade,
    managerComments: review.managerComments ?? "No manager comments were recorded.",
    recommendation: review.recommendation ?? "No recommendation was recorded.",
    metrics: [
      {
        label: "Completion Rate",
        value: `${review.systemMetrics.completionRate.toFixed(2)}%`,
      },
      {
        label: "On-Time Completion",
        value: `${review.systemMetrics.onTimeCompletionRate.toFixed(2)}%`,
      },
      {
        label: "Overdue Rate",
        value: `${review.systemMetrics.overdueRate.toFixed(2)}%`,
      },
      {
        label: "Average Completion Time",
        value: `${review.systemMetrics.averageCompletionHours.toFixed(2)}h`,
      },
      {
        label: "Workflow Compliance",
        value: `${review.systemMetrics.workflowCompliance.toFixed(2)}%`,
      },
      {
        label: "Rework / Reopen Rate",
        value: `${review.systemMetrics.reopenRate.toFixed(2)}%`,
      },
    ],
    capabilityIndexes: [
      {
        label: "Execution Capability",
        value: `${review.executionCapability?.toFixed(2) ?? "0.00"}%`,
      },
      {
        label: "Accuracy Index",
        value: `${review.accuracyIndex?.toFixed(2) ?? "0.00"}%`,
      },
      {
        label: "Ownership Index",
        value: `${review.ownershipIndex?.toFixed(2) ?? "0.00"}%`,
      },
      {
        label: "Follow-up Discipline",
        value: `${review.followUpDiscipline?.toFixed(2) ?? "0.00"}%`,
      },
      {
        label: "Response Agility",
        value: `${review.responseAgility?.toFixed(2) ?? "0.00"}%`,
      },
      {
        label: "Procurement Effectiveness",
        value: `${review.procurementEffectiveness?.toFixed(2) ?? "0.00"}%`,
      },
    ],
    scorecard: review.roleScorecard.map((entry) => ({
      label: entry.label,
      weight: `${entry.weightPercent}%`,
      score: `${entry.scorePercent}%`,
      weightedScore: entry.weightedScore.toFixed(2),
      notes: entry.notes,
    })),
  };
}

export async function generatePerformanceReviewPdfBuffer(
  review: PerformanceReviewDetailView,
) {
  const model = await buildPerformanceReviewPdfModel(review);
  return renderToBuffer(<PerformanceReviewReportDocument model={model} />);
}
