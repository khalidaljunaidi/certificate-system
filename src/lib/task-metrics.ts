import type {
  OperationalTaskPriority,
  OperationalTaskStatus,
  TaskSlaStatus,
} from "@prisma/client";

const AT_RISK_HOURS_BY_PRIORITY: Record<OperationalTaskPriority, number> = {
  LOW: 48,
  MEDIUM: 36,
  HIGH: 24,
  URGENT: 12,
};

export function getTaskSlaStatus(input: {
  dueDate: Date;
  status: OperationalTaskStatus;
  priority: OperationalTaskPriority;
  completedAt?: Date | null;
  now?: Date;
}): TaskSlaStatus {
  const now = input.now ?? new Date();

  if (input.status === "COMPLETED" && input.completedAt) {
    return input.completedAt > input.dueDate ? "OVERDUE" : "ON_TRACK";
  }

  if (input.dueDate <= now || input.status === "OVERDUE") {
    return "OVERDUE";
  }

  const remainingHours =
    (input.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  return remainingHours <= AT_RISK_HOURS_BY_PRIORITY[input.priority]
    ? "AT_RISK"
    : "ON_TRACK";
}

export function getElapsedHoursSinceAssignment(createdAt: Date, now = new Date()) {
  return roundMetric((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
}

export function getRemainingHoursToDueDate(
  dueDate: Date,
  status: OperationalTaskStatus,
  now = new Date(),
) {
  if (status === "COMPLETED") {
    return null;
  }

  return roundMetric((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
}

export function getChecklistCompletionPercent(input: {
  total: number;
  completed: number;
}) {
  if (input.total === 0) {
    return 100;
  }

  return roundMetric((input.completed / input.total) * 100);
}

export function getAverageCompletionHours(
  items: Array<{
    createdAt: Date;
    completedAt: Date | null;
  }>,
) {
  const completedItems = items.filter((item) => item.completedAt);

  if (completedItems.length === 0) {
    return 0;
  }

  const totalHours = completedItems.reduce((sum, item) => {
    return sum + (item.completedAt!.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60);
  }, 0);

  return roundMetric(totalHours / completedItems.length);
}

export function roundMetric(value: number) {
  return Number(value.toFixed(2));
}
