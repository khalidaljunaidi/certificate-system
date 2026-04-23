import { Prisma } from "@prisma/client";
import type { z } from "zod";

import {
  PRIMARY_EVALUATOR_EMAIL,
  PROCUREMENT_LEAD_EMAIL,
  PROCUREMENT_SPECIALIST_EMAIL,
} from "@/lib/constants";
import { WORKFLOW_EMAIL_ROUTING_POLICIES } from "@/lib/workflow-routing";
import { absoluteUrl } from "@/lib/utils";
import {
  calculateCapabilityIndexes,
  calculateFinalPerformanceScore,
  calculateManagerScore,
  calculateSystemScore,
  gradePerformanceScore,
  sanitizePerformanceEntries,
} from "@/lib/performance";
import { getAverageCompletionHours, roundMetric } from "@/lib/task-metrics";
import { quarterlyPerformanceReviewSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { buildMonthCycleLabel } from "@/lib/time";
import { createAuditLog } from "@/server/services/audit-service";
import { sendGovernedWorkflowEmail } from "@/server/services/email-service";
import { createWorkflowNotification } from "@/server/services/notification-service";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type OperationalTaskMetricSource = {
  assignedToUserId: string;
  status:
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "WAITING"
    | "BLOCKED"
    | "COMPLETED"
    | "OVERDUE";
  dueDate: Date;
  completedAt: Date | null;
  createdAt: Date;
  reopenedCount: number;
  requiresChecklistCompletion: boolean;
  checklistItems: Array<{
    completed: boolean;
  }>;
};

type OperationalTaskMetrics = {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  completionRate: number;
  onTimeCompletionRate: number;
  overdueRate: number;
  averageCompletionHours: number;
  workflowCompliance: number;
  reopenRate: number;
  systemScore: number;
  capabilityIndexes: {
    executionCapability: number;
    accuracyIndex: number;
    ownershipIndex: number;
    followUpDiscipline: number;
    responseAgility: number;
    procurementEffectiveness: number;
  };
};

export function getQuarterDateRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1));

  return { start, end };
}

function isEvaluatedEmployeeEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  return (
    normalizedEmail === PROCUREMENT_LEAD_EMAIL ||
    normalizedEmail === PROCUREMENT_SPECIALIST_EMAIL
  );
}

function calculateOperationalMetricsFromTasks(
  tasks: OperationalTaskMetricSource[],
): OperationalTaskMetrics {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");
  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED").length;
  const overdueTasks = tasks.filter(
    (task) =>
      task.status === "OVERDUE" ||
      (task.status !== "COMPLETED" && task.dueDate < new Date()),
  ).length;
  const onTimeCompletedTasks = completedTasks.filter(
    (task) => task.completedAt && task.completedAt <= task.dueDate,
  ).length;
  const workflowCompliantTasks = tasks.filter((task) => {
    if (!task.requiresChecklistCompletion) {
      return true;
    }

    if (task.checklistItems.length === 0) {
      return false;
    }

    return task.checklistItems.every((item) => item.completed);
  }).length;
  const reopenRate =
    totalTasks === 0
      ? 0
      : roundMetric(
          (tasks.filter((task) => task.reopenedCount > 0).length / totalTasks) * 100,
        );
  const completionRate =
    totalTasks === 0 ? 0 : roundMetric((completedTasks.length / totalTasks) * 100);
  const onTimeCompletionRate =
    completedTasks.length === 0
      ? 0
      : roundMetric((onTimeCompletedTasks / completedTasks.length) * 100);
  const overdueRate =
    totalTasks === 0 ? 0 : roundMetric((overdueTasks / totalTasks) * 100);
  const averageCompletionHours = getAverageCompletionHours(
    completedTasks.map((task) => ({
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    })),
  );
  const workflowCompliance =
    totalTasks === 0
      ? 0
      : roundMetric((workflowCompliantTasks / totalTasks) * 100);
  const systemScore = calculateSystemScore({
    completionRate,
    onTimeCompletionRate,
    overdueRate,
    averageCompletionHours,
    workflowCompliance,
    reopenRate,
  });
  const capabilityIndexes = calculateCapabilityIndexes({
    completionRate,
    onTimeCompletionRate,
    workflowCompliance,
    reopenRate,
    averageCompletionHours,
  });

  return {
    totalTasks,
    completedTasks: completedTasks.length,
    activeTasks,
    overdueTasks,
    completionRate,
    onTimeCompletionRate,
    overdueRate,
    averageCompletionHours,
    workflowCompliance,
    reopenRate,
    systemScore,
    capabilityIndexes,
  };
}

export function createEmptyOperationalMetrics(): OperationalTaskMetrics {
  return calculateOperationalMetricsFromTasks([]);
}

function groupOperationalMetricsByAssignee(
  tasks: OperationalTaskMetricSource[],
) {
  const groupedTasks = new Map<string, OperationalTaskMetricSource[]>();

  for (const task of tasks) {
    const existing = groupedTasks.get(task.assignedToUserId);

    if (existing) {
      existing.push(task);
      continue;
    }

    groupedTasks.set(task.assignedToUserId, [task]);
  }

  const metrics = new Map<string, OperationalTaskMetrics>();

  for (const [assignedToUserId, groupTasks] of groupedTasks.entries()) {
    metrics.set(assignedToUserId, calculateOperationalMetricsFromTasks(groupTasks));
  }

  return metrics;
}

export async function getEvaluatedEmployees() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      email: {
        in: [
          "abdulmajeed@thegatheringksa.com",
          "samia@thegatheringksa.com",
        ],
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
    },
  });
}

export async function calculateOperationalMetricsForQuarter(
  tx: Prisma.TransactionClient,
  input: {
    employeeUserId: string;
    year: number;
    quarter: number;
  },
) {
  const range = getQuarterDateRange(input.year, input.quarter);
  const tasks = await tx.operationalTask.findMany({
    where: {
      assignedToUserId: input.employeeUserId,
      createdAt: {
        gte: range.start,
        lt: range.end,
      },
    },
    select: {
      assignedToUserId: true,
      status: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      reopenedCount: true,
      requiresChecklistCompletion: true,
      checklistItems: {
        select: {
          completed: true,
        },
      },
    },
  });

  return calculateOperationalMetricsFromTasks(tasks);
}

export async function calculateOperationalMetricsForMonthlyCycle(
  tx: Prisma.TransactionClient,
  input: {
    employeeUserId: string;
    cycleId: string;
  },
) {
  const tasks = await tx.operationalTask.findMany({
    where: {
      assignedToUserId: input.employeeUserId,
      monthlyCycleId: input.cycleId,
    },
    select: {
      assignedToUserId: true,
      status: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      reopenedCount: true,
      requiresChecklistCompletion: true,
      checklistItems: {
        select: {
          completed: true,
        },
      },
    },
  });

  return calculateOperationalMetricsFromTasks(tasks);
}

export async function calculateOperationalMetricsForQuarterBatch(
  tx: Prisma.TransactionClient,
  input: {
    employeeUserIds: string[];
    year: number;
    quarter: number;
  },
) {
  if (input.employeeUserIds.length === 0) {
    return new Map<string, OperationalTaskMetrics>();
  }

  const range = getQuarterDateRange(input.year, input.quarter);
  const tasks = await tx.operationalTask.findMany({
    where: {
      assignedToUserId: {
        in: input.employeeUserIds,
      },
      createdAt: {
        gte: range.start,
        lt: range.end,
      },
    },
    select: {
      assignedToUserId: true,
      status: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      reopenedCount: true,
      requiresChecklistCompletion: true,
      checklistItems: {
        select: {
          completed: true,
        },
      },
    },
  });

  return groupOperationalMetricsByAssignee(tasks);
}

export async function calculateOperationalMetricsForMonthlyCycleBatch(
  tx: Prisma.TransactionClient,
  input: {
    employeeUserIds: string[];
    cycleId: string;
  },
) {
  if (input.employeeUserIds.length === 0) {
    return new Map<string, OperationalTaskMetrics>();
  }

  const tasks = await tx.operationalTask.findMany({
    where: {
      assignedToUserId: {
        in: input.employeeUserIds,
      },
      monthlyCycleId: input.cycleId,
    },
    select: {
      assignedToUserId: true,
      status: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      reopenedCount: true,
      requiresChecklistCompletion: true,
      checklistItems: {
        select: {
          completed: true,
        },
      },
    },
  });

  return groupOperationalMetricsByAssignee(tasks);
}

export async function saveQuarterlyPerformanceReview(input: {
  actor: {
    id: string;
    email: string;
    name: string;
  };
  values: z.infer<typeof quarterlyPerformanceReviewSchema>;
  finalize: boolean;
}) {
  if (normalizeEmail(input.actor.email) !== PRIMARY_EVALUATOR_EMAIL) {
    throw new Error("Only Khaled can create or finalize quarterly performance reviews.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const employee = await tx.user.findUnique({
      where: {
        id: input.values.employeeUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        role: true,
      },
    });

    if (!employee) {
      throw new Error("Employee not found.");
    }

    if (normalizeEmail(employee.email) === normalizeEmail(input.actor.email)) {
      throw new Error("Self-evaluation is not allowed.");
    }

    if (
      !["abdulmajeed@thegatheringksa.com", "samia@thegatheringksa.com"].includes(
        normalizeEmail(employee.email),
      )
    ) {
      throw new Error("Quarterly performance reviews are limited to Abdulmajeed and Samia.");
    }

    const existing = await tx.quarterlyPerformanceReview.findUnique({
      where: {
        employeeUserId_year_quarter: {
          employeeUserId: employee.id,
          year: input.values.year,
          quarter: input.values.quarter,
        },
      },
    });

    if (existing?.status === "FINALIZED") {
      throw new Error("This quarterly review is already finalized and read-only.");
    }

    const managerEntries = sanitizePerformanceEntries(
      JSON.parse(input.values.managerScorecard),
      employee,
    );
    const managerScorePercent = calculateManagerScore(managerEntries);
    const systemMetrics = await calculateOperationalMetricsForQuarter(tx, {
      employeeUserId: employee.id,
      year: input.values.year,
      quarter: input.values.quarter,
    });
    const finalScorePercent = calculateFinalPerformanceScore({
      systemScore: systemMetrics.systemScore,
      managerScore: managerScorePercent,
    });
    const grade = gradePerformanceScore(finalScorePercent);
    const finalizedAt = input.finalize ? new Date() : null;

    const review = existing
      ? await tx.quarterlyPerformanceReview.update({
          where: {
            id: existing.id,
          },
          data: {
            status: input.finalize ? "FINALIZED" : "DRAFT",
            roleSnapshot: employee.role,
            systemMetrics,
            managerScorecard: managerEntries,
            managerComments: input.values.managerComments,
            recommendation: input.values.recommendation,
            systemScorePercent: new Prisma.Decimal(systemMetrics.systemScore),
            managerScorePercent: new Prisma.Decimal(managerScorePercent),
            finalScorePercent: new Prisma.Decimal(finalScorePercent),
            grade,
            executionCapability: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.executionCapability,
            ),
            accuracyIndex: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.accuracyIndex,
            ),
            ownershipIndex: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.ownershipIndex,
            ),
            followUpDiscipline: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.followUpDiscipline,
            ),
            responseAgility: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.responseAgility,
            ),
            procurementEffectiveness: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.procurementEffectiveness,
            ),
            finalizedAt,
          },
        })
      : await tx.quarterlyPerformanceReview.create({
          data: {
            employeeUserId: employee.id,
            evaluatorUserId: input.actor.id,
            year: input.values.year,
            quarter: input.values.quarter,
            status: input.finalize ? "FINALIZED" : "DRAFT",
            roleSnapshot: employee.role,
            systemMetrics,
            managerScorecard: managerEntries,
            managerComments: input.values.managerComments,
            recommendation: input.values.recommendation,
            systemScorePercent: new Prisma.Decimal(systemMetrics.systemScore),
            managerScorePercent: new Prisma.Decimal(managerScorePercent),
            finalScorePercent: new Prisma.Decimal(finalScorePercent),
            grade,
            executionCapability: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.executionCapability,
            ),
            accuracyIndex: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.accuracyIndex,
            ),
            ownershipIndex: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.ownershipIndex,
            ),
            followUpDiscipline: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.followUpDiscipline,
            ),
            responseAgility: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.responseAgility,
            ),
            procurementEffectiveness: new Prisma.Decimal(
              systemMetrics.capabilityIndexes.procurementEffectiveness,
            ),
            finalizedAt,
          },
        });

    await createAuditLog(tx, {
      action: input.finalize
        ? "PERFORMANCE_REVIEW_FINALIZED"
        : "PERFORMANCE_REVIEW_DRAFTED",
      entityType: "QuarterlyPerformanceReview",
      entityId: review.id,
      userId: input.actor.id,
      details: {
        employeeUserId: employee.id,
        employeeEmail: employee.email,
        year: input.values.year,
        quarter: input.values.quarter,
        systemScore: systemMetrics.systemScore,
        managerScore: managerScorePercent,
        finalScore: finalScorePercent,
        grade,
      },
    });

    if (input.finalize) {
      await createWorkflowNotification(tx, {
        type: "SYSTEM_ALERT",
        eventKey: "PERFORMANCE_REVIEW_FINALIZED",
        title: "Quarterly performance review finalized",
        message: `${employee.name} performance review for Q${input.values.quarter} ${input.values.year} was finalized with grade ${grade}.`,
        routingStrategies: ["evaluated_employee", "entity_owner"],
        routingContext: {
          evaluatedEmployee: {
            userId: employee.id,
            email: employee.email,
          },
          entityOwner: {
            userId: input.actor.id,
            email: input.actor.email,
          },
        },
        includeProcurementTeam: false,
        href: `/admin/performance?employeeUserId=${employee.id}&year=${input.values.year}&quarter=${input.values.quarter}`,
      });
    }

    return {
      review,
      employee,
      systemMetrics,
      managerEntries,
      managerScorePercent,
      finalScorePercent,
      grade,
    };
  }).then(async (result) => {
    if (input.finalize) {
      await sendGovernedWorkflowEmail({
        event: "PERFORMANCE_REVIEW_FINALIZED",
        label: "performance-review-finalized",
        subject: `Quarterly Performance Review Finalized - ${result.employee.name}`,
        heading: "Quarterly Performance Review Finalized",
        intro: `${result.employee.name}'s quarterly review has been finalized with grade ${result.grade}.`,
        rows: [
          { label: "Employee", value: result.employee.name },
          { label: "Quarter", value: `Q${input.values.quarter} ${input.values.year}` },
          { label: "System Score", value: `${result.systemMetrics.systemScore.toFixed(2)}%` },
          { label: "Manager Score", value: `${result.managerScorePercent.toFixed(2)}%` },
          { label: "Final Score", value: `${result.finalScorePercent.toFixed(2)}%` },
          { label: "Grade", value: result.grade },
        ],
        actionLabel: "Open Performance Workspace",
        actionUrl: absoluteUrl(
          `/admin/performance?employeeUserId=${result.employee.id}&year=${input.values.year}&quarter=${input.values.quarter}`,
        ),
        logContext: {
          employeeEmail: result.employee.email,
          evaluatorEmail: input.actor.email,
        },
        routingPolicy: WORKFLOW_EMAIL_ROUTING_POLICIES.PERFORMANCE_REVIEW_FINALIZED,
        routingContext: {
          evaluatedEmployee: {
            userId: result.employee.id,
            email: result.employee.email,
          },
          entityOwner: {
            userId: input.actor.id,
            email: input.actor.email,
          },
        },
      });
    }

    return result.review;
  });

  return result;
}

export async function createMonthlyCycle(input: {
  actor: {
    id: string;
    email: string;
  };
  values: {
    month: number;
    year: number;
    label?: string;
    status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
    activate: boolean;
  };
}) {
  if (normalizeEmail(input.actor.email) !== PRIMARY_EVALUATOR_EMAIL) {
    throw new Error("Only Khaled can create or activate monthly cycles.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.monthlyCycle.findUnique({
      where: {
        month_year: {
          month: input.values.month,
          year: input.values.year,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new Error("A monthly cycle already exists for this month and year.");
    }

    const shouldActivate = input.values.activate && input.values.status !== "ARCHIVED";
    const status = shouldActivate ? "OPEN" : input.values.status;
    const label =
      input.values.label?.trim() ||
      buildMonthCycleLabel(input.values.year, input.values.month);
    const now = new Date();

    if (shouldActivate) {
      await tx.monthlyCycle.updateMany({
        data: {
          isActive: false,
        },
      });
    }

    const cycle = await tx.monthlyCycle.create({
      data: {
        month: input.values.month,
        year: input.values.year,
        label,
        status,
        isActive: shouldActivate,
        createdByUserId: input.actor.id,
        activatedAt: shouldActivate ? now : null,
        closedAt: status === "CLOSED" ? now : null,
      },
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "MonthlyCycle",
      entityId: cycle.id,
      userId: input.actor.id,
      details: {
        month: cycle.month,
        year: cycle.year,
        label: cycle.label,
        status: cycle.status,
        isActive: cycle.isActive,
      },
    });

    return cycle;
  });

  return result;
}

export async function updateMonthlyCycleStatus(input: {
  actor: {
    id: string;
    email: string;
  };
  cycleId: string;
  action: "activate" | "close" | "archive" | "reopen";
}) {
  if (normalizeEmail(input.actor.email) !== PRIMARY_EVALUATOR_EMAIL) {
    throw new Error("Only Khaled can manage monthly cycle state.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const cycle = await tx.monthlyCycle.findUnique({
      where: {
        id: input.cycleId,
      },
    });

    if (!cycle) {
      throw new Error("Monthly cycle not found.");
    }

    const now = new Date();
    let nextStatus = cycle.status;
    let nextActive = cycle.isActive;
    let activatedAt = cycle.activatedAt;
    let closedAt = cycle.closedAt;

    if (input.action === "activate") {
      await tx.monthlyCycle.updateMany({
        data: {
          isActive: false,
        },
      });
      nextStatus = "OPEN";
      nextActive = true;
      activatedAt = now;
      closedAt = null;
    }

    if (input.action === "close") {
      nextStatus = "CLOSED";
      nextActive = false;
      closedAt = now;
    }

    if (input.action === "archive") {
      nextStatus = "ARCHIVED";
      nextActive = false;
    }

    if (input.action === "reopen") {
      nextStatus = "OPEN";
      nextActive = false;
      closedAt = null;
    }

    const updated = await tx.monthlyCycle.update({
      where: {
        id: cycle.id,
      },
      data: {
        status: nextStatus,
        isActive: nextActive,
        activatedAt,
        closedAt,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "MonthlyCycle",
      entityId: updated.id,
      userId: input.actor.id,
      details: {
        previousStatus: cycle.status,
        nextStatus: updated.status,
        previousIsActive: cycle.isActive,
        nextIsActive: updated.isActive,
        action: input.action,
      },
    });

    return updated;
  });

  return result;
}

export async function saveMonthlyPerformanceReview(input: {
  actor: {
    id: string;
    email: string;
    name: string;
  };
  values: {
    reviewId?: string;
    cycleId: string;
    employeeUserId: string;
    managerScorePercent?: number;
    managerNotes?: string;
    recommendation?: string;
  };
  finalize: boolean;
}) {
  if (normalizeEmail(input.actor.email) !== PRIMARY_EVALUATOR_EMAIL) {
    throw new Error("Only Khaled can save monthly performance reviews.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const [cycle, employee, existing] = await Promise.all([
      tx.monthlyCycle.findUnique({
        where: {
          id: input.values.cycleId,
        },
      }),
      tx.user.findUnique({
        where: {
          id: input.values.employeeUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
        },
      }),
      tx.monthlyPerformanceReview.findUnique({
        where: {
          cycleId_employeeUserId: {
            cycleId: input.values.cycleId,
            employeeUserId: input.values.employeeUserId,
          },
        },
      }),
    ]);

    if (!cycle) {
      throw new Error("Monthly cycle not found.");
    }

    if (cycle.status === "ARCHIVED") {
      throw new Error("Archived monthly cycles are read-only.");
    }

    if (!employee) {
      throw new Error("Employee not found.");
    }

    if (normalizeEmail(employee.email) === normalizeEmail(input.actor.email)) {
      throw new Error("Self-evaluation is not allowed.");
    }

    if (!isEvaluatedEmployeeEmail(employee.email)) {
      throw new Error("Monthly reviews are limited to Abdulmajeed and Samia.");
    }

    if (existing?.status === "FINALIZED") {
      throw new Error("This monthly review is already finalized and read-only.");
    }

    const systemMetrics = await calculateOperationalMetricsForMonthlyCycle(tx, {
      employeeUserId: employee.id,
      cycleId: cycle.id,
    });
    const managerScorePercent =
      input.values.managerScorePercent ??
      existing?.managerScorePercent.toNumber() ??
      systemMetrics.systemScore;

    if (input.finalize) {
      if (!input.values.managerNotes?.trim()) {
        throw new Error("Manager notes are required before finalizing the monthly review.");
      }

      if (!input.values.recommendation?.trim()) {
        throw new Error("A recommendation is required before finalizing the monthly review.");
      }
    }

    const finalScorePercent = calculateFinalPerformanceScore({
      systemScore: systemMetrics.systemScore,
      managerScore: managerScorePercent,
    });
    const grade = gradePerformanceScore(finalScorePercent);
    const finalizedAt = input.finalize ? new Date() : null;

    const review = existing
      ? await tx.monthlyPerformanceReview.update({
          where: {
            id: existing.id,
          },
          data: {
            status: input.finalize ? "FINALIZED" : "DRAFT",
            systemMetrics,
            managerNotes: input.values.managerNotes?.trim() || null,
            recommendation: input.values.recommendation?.trim() || null,
            systemScorePercent: new Prisma.Decimal(systemMetrics.systemScore),
            managerScorePercent: new Prisma.Decimal(managerScorePercent),
            finalScorePercent: new Prisma.Decimal(finalScorePercent),
            grade,
            finalizedAt,
          },
        })
      : await tx.monthlyPerformanceReview.create({
          data: {
            cycleId: cycle.id,
            employeeUserId: employee.id,
            evaluatorUserId: input.actor.id,
            status: input.finalize ? "FINALIZED" : "DRAFT",
            systemMetrics,
            managerNotes: input.values.managerNotes?.trim() || null,
            recommendation: input.values.recommendation?.trim() || null,
            systemScorePercent: new Prisma.Decimal(systemMetrics.systemScore),
            managerScorePercent: new Prisma.Decimal(managerScorePercent),
            finalScorePercent: new Prisma.Decimal(finalScorePercent),
            grade,
            finalizedAt,
        },
      });

    await createAuditLog(tx, {
      action: input.finalize
        ? "PERFORMANCE_REVIEW_FINALIZED"
        : "PERFORMANCE_REVIEW_DRAFTED",
      entityType: "MonthlyPerformanceReview",
      entityId: review.id,
      userId: input.actor.id,
      details: {
        cycleId: cycle.id,
        cycleLabel: cycle.label,
        employeeUserId: employee.id,
        employeeEmail: employee.email,
        systemScore: systemMetrics.systemScore,
        managerScore: managerScorePercent,
        finalScore: finalScorePercent,
        grade,
      },
    });

    if (input.finalize) {
      await createWorkflowNotification(tx, {
        type: "SYSTEM_ALERT",
        eventKey: "PERFORMANCE_REVIEW_FINALIZED",
        title: "Monthly review finalized",
        message: `${employee.name} monthly review for ${cycle.label} was finalized with grade ${grade}.`,
        routingStrategies: ["evaluated_employee", "entity_owner"],
        routingContext: {
          evaluatedEmployee: {
            userId: employee.id,
            email: employee.email,
          },
          entityOwner: {
            userId: input.actor.id,
            email: input.actor.email,
          },
        },
        includeProcurementTeam: false,
        href: `/admin/performance?cycleId=${cycle.id}&employeeUserId=${employee.id}`,
      });
    }

    return {
      review,
      cycle,
      employee,
      systemMetrics,
      managerScorePercent,
      finalScorePercent,
      grade,
    };
  });

  if (input.finalize) {
    await sendGovernedWorkflowEmail({
      event: "PERFORMANCE_REVIEW_FINALIZED",
      label: "monthly-review-finalized",
      subject: `Monthly Review Finalized - ${result.employee.name}`,
      heading: "Monthly Review Finalized",
      intro: `${result.employee.name}'s monthly review for ${result.cycle.label} has been finalized with grade ${result.grade}.`,
      rows: [
        { label: "Employee", value: result.employee.name },
        { label: "Cycle", value: result.cycle.label },
        { label: "System Score", value: `${result.systemMetrics.systemScore.toFixed(2)}%` },
        { label: "Manager Score", value: `${result.managerScorePercent.toFixed(2)}%` },
        { label: "Final Score", value: `${result.finalScorePercent.toFixed(2)}%` },
        { label: "Grade", value: result.grade },
      ],
      actionLabel: "Open Monthly Review",
      actionUrl: absoluteUrl(
        `/admin/performance?cycleId=${result.cycle.id}&employeeUserId=${result.employee.id}`,
      ),
      logContext: {
        employeeEmail: result.employee.email,
        evaluatorEmail: input.actor.email,
      },
      routingPolicy: WORKFLOW_EMAIL_ROUTING_POLICIES.PERFORMANCE_REVIEW_FINALIZED,
      routingContext: {
        evaluatedEmployee: {
          userId: result.employee.id,
          email: result.employee.email,
        },
        entityOwner: {
          userId: input.actor.id,
          email: input.actor.email,
        },
      },
    });
  }

  return result.review;
}
