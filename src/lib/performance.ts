import type { PerformanceGrade, UserRole } from "@prisma/client";

import {
  PROCUREMENT_LEAD_EMAIL,
} from "@/lib/constants";
import { roundMetric } from "@/lib/task-metrics";

export type PerformanceManagerCriterion = {
  id: string;
  label: string;
  weightPercent: number;
};

export type PerformanceManagerEntry = PerformanceManagerCriterion & {
  scorePercent: number;
  weightedScore: number;
  notes: string;
};

const PROCUREMENT_LEAD_SCORECARD: PerformanceManagerCriterion[] = [
  { id: "coordination", label: "Coordination", weightPercent: 20 },
  { id: "workflow-follow-up", label: "Workflow Follow-up", weightPercent: 20 },
  { id: "issue-resolution", label: "Issue Resolution", weightPercent: 15 },
  { id: "operational-control", label: "Operational Control", weightPercent: 15 },
  { id: "communication", label: "Communication", weightPercent: 15 },
  { id: "problem-solving", label: "Problem Solving", weightPercent: 15 },
];

const PROCUREMENT_SPECIALIST_SCORECARD: PerformanceManagerCriterion[] = [
  { id: "timeliness", label: "Timeliness", weightPercent: 20 },
  { id: "accuracy", label: "Accuracy", weightPercent: 20 },
  { id: "compliance", label: "Compliance", weightPercent: 20 },
  { id: "documentation-quality", label: "Documentation Quality", weightPercent: 15 },
  { id: "vendor-follow-up", label: "Vendor Follow-up", weightPercent: 15 },
  { id: "ownership", label: "Ownership", weightPercent: 10 },
];

export function getPerformanceReviewTemplate(input: {
  email: string;
  role: UserRole;
}): PerformanceManagerCriterion[] {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (normalizedEmail === PROCUREMENT_LEAD_EMAIL || input.role === "PROCUREMENT_LEAD") {
    return PROCUREMENT_LEAD_SCORECARD;
  }

  return PROCUREMENT_SPECIALIST_SCORECARD;
}

export function createDefaultPerformanceEntries(input: {
  email: string;
  role: UserRole;
}): PerformanceManagerEntry[] {
  return getPerformanceReviewTemplate(input).map((criterion) => ({
    ...criterion,
    scorePercent: 0,
    weightedScore: 0,
    notes: "",
  }));
}

export function sanitizePerformanceEntries(
  input: unknown,
  employee: { email: string; role: UserRole },
): PerformanceManagerEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("The performance scorecard payload is invalid.");
  }

  const template = getPerformanceReviewTemplate(employee);
  const templateMap = new Map(template.map((criterion) => [criterion.id, criterion]));

  return input.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("id" in entry) ||
      typeof entry.id !== "string"
    ) {
      throw new Error("The performance scorecard payload is invalid.");
    }

    const criterion = templateMap.get(entry.id);

    if (!criterion) {
      throw new Error("The performance scorecard contains an unknown criterion.");
    }

    const scorePercent = clampPercentage(
      Number("scorePercent" in entry ? entry.scorePercent : 0),
    );
    const notes =
      "notes" in entry && typeof entry.notes === "string" ? entry.notes.trim() : "";

    return {
      ...criterion,
      scorePercent,
      weightedScore: roundMetric((scorePercent / 100) * criterion.weightPercent),
      notes,
    };
  });
}

export function calculateManagerScore(entries: PerformanceManagerEntry[]) {
  return roundMetric(entries.reduce((sum, entry) => sum + entry.weightedScore, 0));
}

export function calculateFinalPerformanceScore(input: {
  systemScore: number;
  managerScore: number;
}) {
  return roundMetric(input.systemScore * 0.7 + input.managerScore * 0.3);
}

export function gradePerformanceScore(score: number): PerformanceGrade {
  if (score >= 90) {
    return "A";
  }

  if (score >= 80) {
    return "B";
  }

  if (score >= 70) {
    return "C";
  }

  return "D";
}

export function calculateSystemScore(input: {
  completionRate: number;
  onTimeCompletionRate: number;
  overdueRate: number;
  averageCompletionHours: number;
  workflowCompliance: number;
  reopenRate: number;
}) {
  const speedScore = clampPercentage(100 - input.averageCompletionHours);
  const overdueScore = clampPercentage(100 - input.overdueRate);
  const reopenScore = clampPercentage(100 - input.reopenRate);

  return roundMetric(
    input.completionRate * 0.25 +
      input.onTimeCompletionRate * 0.2 +
      overdueScore * 0.15 +
      speedScore * 0.1 +
      input.workflowCompliance * 0.15 +
      reopenScore * 0.15,
  );
}

export function calculateCapabilityIndexes(input: {
  completionRate: number;
  onTimeCompletionRate: number;
  workflowCompliance: number;
  reopenRate: number;
  averageCompletionHours: number;
}) {
  const responseAgility = clampPercentage(100 - input.averageCompletionHours);
  const reopenScore = clampPercentage(100 - input.reopenRate);

  return {
    executionCapability: roundMetric(
      input.completionRate * 0.6 + input.onTimeCompletionRate * 0.4,
    ),
    accuracyIndex: roundMetric(input.workflowCompliance * 0.6 + reopenScore * 0.4),
    ownershipIndex: roundMetric(
      input.completionRate * 0.4 +
        input.workflowCompliance * 0.3 +
        input.onTimeCompletionRate * 0.3,
    ),
    followUpDiscipline: roundMetric(
      input.onTimeCompletionRate * 0.65 + input.workflowCompliance * 0.35,
    ),
    responseAgility: roundMetric(responseAgility),
    procurementEffectiveness: roundMetric(
      input.completionRate * 0.35 +
        input.workflowCompliance * 0.3 +
        input.onTimeCompletionRate * 0.2 +
        reopenScore * 0.15,
    ),
  };
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, roundMetric(value)));
}
