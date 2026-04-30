import type { UserRole } from "@prisma/client";

import {
  canEvaluateTeamPerformance,
  canViewExecutiveDashboard,
  canViewOwnPerformance,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  MonthlyCycleOption,
  MonthlyGovernanceDashboardView,
  MonthlyPerformanceReviewView,
  PerformanceReviewDetailView,
  PerformanceReviewListItem,
  TeamDashboardView,
  TeamPerformanceMemberView,
} from "@/lib/types";
import { roundMetric } from "@/lib/task-metrics";
import { getCurrentMonthCycle, getCurrentQuarter, getDaysInMonth, getPreviousMonthCycle } from "@/lib/time";
import {
  calculateOperationalMetricsForMonthlyCycleBatch,
  calculateOperationalMetricsForQuarterBatch,
  getEvaluatedEmployees,
  createEmptyOperationalMetrics,
} from "@/server/services/performance-service";
import { getOperationalTasksForViewer } from "@/server/queries/task-queries";

type Viewer = {
  id: string;
  role: UserRole;
  email: string;
  permissions?: string[] | null;
};

type TeamDashboardOptions = {
  includeQuarterlyTrend?: boolean;
};

type ReviewFilters = {
  year: number;
  quarter: number;
  employeeUserId?: string;
};

function mapMonthlyCycleOption(cycle: {
  id: string;
  month: number;
  year: number;
  label: string;
  status: MonthlyCycleOption["status"];
  isActive: boolean;
  activatedAt: Date | null;
  closedAt: Date | null;
}): MonthlyCycleOption {
  return {
    id: cycle.id,
    month: cycle.month,
    year: cycle.year,
    label: cycle.label,
    status: cycle.status,
    isActive: cycle.isActive,
    activatedAt: cycle.activatedAt,
    closedAt: cycle.closedAt,
  };
}

function getWorkloadLevel(openTasks: number): MonthlyGovernanceDashboardView["employeeCards"][number]["workloadLevel"] {
  if (openTasks >= 10) {
    return "Heavy";
  }

  if (openTasks >= 6) {
    return "Focused";
  }

  if (openTasks >= 3) {
    return "Balanced";
  }

  return "Light";
}

function calculateWorkloadBalance(openTasks: number[]) {
  const totalOpen = openTasks.reduce((sum, value) => sum + value, 0);

  if (totalOpen === 0 || openTasks.length <= 1) {
    return 100;
  }

  const idealShare = 100 / openTasks.length;
  const averageDeviation =
    openTasks.reduce((sum, value) => {
      const share = (value / totalOpen) * 100;
      return sum + Math.abs(share - idealShare);
    }, 0) / openTasks.length;

  return roundMetric(Math.max(0, 100 - averageDeviation * 1.8));
}

function mapMonthlyReview(review: {
  id: string;
  cycleId: string;
  employeeUserId: string;
  evaluatorUserId: string;
  status: MonthlyPerformanceReviewView["status"];
  systemMetrics: unknown;
  managerNotes: string | null;
  recommendation: string | null;
  systemScorePercent: { toNumber(): number };
  managerScorePercent: { toNumber(): number };
  finalScorePercent: { toNumber(): number };
  grade: MonthlyPerformanceReviewView["grade"];
  finalizedAt: Date | null;
}): MonthlyPerformanceReviewView {
  return {
    id: review.id,
    cycleId: review.cycleId,
    employeeUserId: review.employeeUserId,
    evaluatorUserId: review.evaluatorUserId,
    status: review.status,
    systemMetrics:
      review.systemMetrics && typeof review.systemMetrics === "object"
        ? (review.systemMetrics as MonthlyPerformanceReviewView["systemMetrics"])
        : {
            completionRate: 0,
            onTimeCompletionRate: 0,
            overdueRate: 0,
            averageCompletionHours: 0,
            workflowCompliance: 0,
            reopenRate: 0,
            activeTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            totalTasks: 0,
          },
    managerNotes: review.managerNotes,
    recommendation: review.recommendation,
    systemScorePercent: review.systemScorePercent.toNumber(),
    managerScorePercent: review.managerScorePercent.toNumber(),
    finalScorePercent: review.finalScorePercent.toNumber(),
    grade: review.grade,
    finalizedAt: review.finalizedAt,
  };
}

function reviewToListItem(review: {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    title: string;
    role: UserRole;
  };
  evaluator: {
    id: string;
    name: string;
    email: string;
  };
  year: number;
  quarter: number;
  status: PerformanceReviewListItem["status"];
  systemScorePercent: { toNumber(): number };
  managerScorePercent: { toNumber(): number };
  finalScorePercent: { toNumber(): number };
  grade: PerformanceReviewListItem["grade"];
  executionCapability: { toNumber(): number } | null;
  accuracyIndex: { toNumber(): number } | null;
  ownershipIndex: { toNumber(): number } | null;
  followUpDiscipline: { toNumber(): number } | null;
  responseAgility: { toNumber(): number } | null;
  procurementEffectiveness: { toNumber(): number } | null;
  finalizedAt: Date | null;
  managerComments: string | null;
  recommendation: string | null;
}): PerformanceReviewListItem {
  return {
    id: review.id,
    employee: review.employee,
    evaluator: review.evaluator,
    year: review.year,
    quarter: review.quarter,
    status: review.status,
    systemScorePercent: review.systemScorePercent.toNumber(),
    managerScorePercent: review.managerScorePercent.toNumber(),
    finalScorePercent: review.finalScorePercent.toNumber(),
    grade: review.grade,
    executionCapability: review.executionCapability?.toNumber() ?? null,
    accuracyIndex: review.accuracyIndex?.toNumber() ?? null,
    ownershipIndex: review.ownershipIndex?.toNumber() ?? null,
    followUpDiscipline: review.followUpDiscipline?.toNumber() ?? null,
    responseAgility: review.responseAgility?.toNumber() ?? null,
    procurementEffectiveness: review.procurementEffectiveness?.toNumber() ?? null,
    finalizedAt: review.finalizedAt,
    managerComments: review.managerComments,
    recommendation: review.recommendation,
  };
}

export async function getQuarterlyPerformanceReviews(
  viewer: Viewer,
  filters: ReviewFilters,
) {
  if (!canEvaluateTeamPerformance(viewer) && !canViewOwnPerformance(viewer.email)) {
    return [];
  }

  const reviews = await prisma.quarterlyPerformanceReview.findMany({
    where: {
      year: filters.year,
      quarter: filters.quarter,
      ...(filters.employeeUserId ? { employeeUserId: filters.employeeUserId } : {}),
      ...(canEvaluateTeamPerformance(viewer)
        ? {}
        : {
            employee: {
              email: viewer.email,
            },
          }),
    },
    orderBy: {
      employee: {
        name: "asc",
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
        },
      },
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return reviews.map(reviewToListItem);
}

export async function getQuarterlyPerformanceReviewDetail(
  viewer: Viewer,
  reviewId: string,
): Promise<PerformanceReviewDetailView | null> {
  const review = await prisma.quarterlyPerformanceReview.findFirst({
    where: {
      id: reviewId,
      ...(canEvaluateTeamPerformance(viewer)
        ? {}
        : {
            employee: {
              email: viewer.email,
            },
          }),
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
        },
      },
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!review) {
    return null;
  }

  const mapped = reviewToListItem(review);
  const managerScorecard = Array.isArray(review.managerScorecard)
    ? (review.managerScorecard as PerformanceReviewDetailView["roleScorecard"])
    : [];
  const systemMetrics =
    review.systemMetrics && typeof review.systemMetrics === "object"
      ? (review.systemMetrics as PerformanceReviewDetailView["systemMetrics"])
      : {
          completionRate: 0,
          onTimeCompletionRate: 0,
          overdueRate: 0,
          averageCompletionHours: 0,
          workflowCompliance: 0,
          reopenRate: 0,
          activeTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          totalTasks: 0,
        };

  return {
    ...mapped,
    roleScorecard: managerScorecard,
    systemMetrics,
  };
}

export async function getTeamPerformanceDashboard(
  viewer: Viewer,
  options: TeamDashboardOptions = {},
): Promise<TeamDashboardView> {
  const { quarter: currentQuarter, year: currentYear } = getCurrentQuarter();
  const allEmployees = await getEvaluatedEmployees();
  const isExecutive = canViewExecutiveDashboard(viewer);
  const employees = isExecutive
    ? allEmployees
    : allEmployees.filter((employee) => employee.email === viewer.email);
  const employeeIds = employees.map((employee) => employee.id);
  const [currentQuarterMetricsByEmployee, latestReviews] = await Promise.all([
    prisma.$transaction((tx) =>
      calculateOperationalMetricsForQuarterBatch(tx, {
        employeeUserIds: employeeIds,
        year: currentYear,
        quarter: currentQuarter,
      }),
    ),
    employeeIds.length === 0
      ? Promise.resolve([])
      : prisma.quarterlyPerformanceReview.findMany({
          where: {
            employeeUserId: {
              in: employeeIds,
            },
          },
          orderBy: [
            {
              employeeUserId: "asc",
            },
            {
              year: "desc",
            },
            {
              quarter: "desc",
            },
            {
              updatedAt: "desc",
            },
          ],
          select: {
            id: true,
            employeeUserId: true,
            finalScorePercent: true,
            managerScorePercent: true,
            grade: true,
          },
        }),
  ]);
  const latestReviewByEmployeeId = new Map<string, {
    id: string;
    employeeUserId: string;
    finalScorePercent: { toNumber(): number };
    managerScorePercent: { toNumber(): number };
    grade: TeamPerformanceMemberView["grade"];
  }>();

  for (const review of latestReviews) {
    if (!latestReviewByEmployeeId.has(review.employeeUserId)) {
      latestReviewByEmployeeId.set(review.employeeUserId, review);
    }
  }

  const memberCards = employees.map((employee) => {
    const metrics =
      currentQuarterMetricsByEmployee.get(employee.id) ??
      createEmptyOperationalMetrics();
    const latestReview = latestReviewByEmployeeId.get(employee.id) ?? null;

    const finalScore = latestReview?.finalScorePercent?.toNumber() ?? null;
    const managerScore = latestReview?.managerScorePercent?.toNumber() ?? null;

    return {
      userId: employee.id,
      name: employee.name,
      email: employee.email,
      title: employee.title,
      role: employee.role,
      activeTasks: metrics.activeTasks,
      completedTasks: metrics.completedTasks,
      completionRate: metrics.completionRate,
      onTimeCompletionRate: metrics.onTimeCompletionRate,
      overdueRate: metrics.overdueRate,
      averageCompletionHours: metrics.averageCompletionHours,
      systemScore: metrics.systemScore,
      managerScore,
      finalScore,
      grade: latestReview?.grade ?? null,
      workloadOpenTasks: metrics.activeTasks,
      productivityScore: roundMetric(
        metrics.systemScore * 0.6 + (finalScore ?? metrics.systemScore) * 0.4,
      ),
    } satisfies TeamPerformanceMemberView;
  });

  const topPerformer = [...memberCards]
    .sort((left, right) => (right.finalScore ?? right.systemScore) - (left.finalScore ?? left.systemScore))[0]
    ?.name ?? null;
  const atRiskMember = [...memberCards]
    .sort((left, right) => right.overdueRate - left.overdueRate)[0]?.name ?? null;
  const teamCompletionRate =
    memberCards.length === 0
      ? 0
      : roundMetric(
          memberCards.reduce((sum, card) => sum + card.completionRate, 0) / memberCards.length,
        );
  const overdueExposure =
    memberCards.length === 0
      ? 0
      : roundMetric(
          memberCards.reduce((sum, card) => sum + card.overdueRate, 0) / memberCards.length,
        );
  const productivityScore =
    memberCards.length === 0
      ? 0
      : roundMetric(
          memberCards.reduce((sum, card) => sum + card.productivityScore, 0) /
            memberCards.length,
        );

  const quarterlyTrend: TeamDashboardView["quarterlyTrend"] = [];

  if (options.includeQuarterlyTrend !== false) {
    for (let index = 3; index >= 0; index -= 1) {
      const quarterOffset = currentQuarter - index;
      const year = quarterOffset <= 0 ? currentYear - 1 : currentYear;
      const quarter = quarterOffset <= 0 ? quarterOffset + 4 : quarterOffset;
      const [reviews, completionMetricsByEmployee] = await Promise.all([
        prisma.quarterlyPerformanceReview.findMany({
          where: {
            year,
            quarter,
            employeeUserId: {
              in: employeeIds,
            },
          },
          select: {
            finalScorePercent: true,
          },
        }),
        prisma.$transaction((tx) =>
          calculateOperationalMetricsForQuarterBatch(tx, {
            employeeUserIds: employeeIds,
            year,
            quarter,
          }),
        ),
      ]);

      const completionMetrics = employeeIds.map(
        (employeeId) =>
          completionMetricsByEmployee.get(employeeId) ?? createEmptyOperationalMetrics(),
      );

      quarterlyTrend.push({
        year,
        quarter,
        completionRate:
          completionMetrics.length === 0
            ? 0
            : roundMetric(
                completionMetrics.reduce((sum, metric) => sum + metric.completionRate, 0) /
                  completionMetrics.length,
              ),
        finalScore:
          reviews.length === 0
            ? null
            : roundMetric(
                reviews.reduce((sum, review) => sum + review.finalScorePercent.toNumber(), 0) /
                  reviews.length,
             ),
      });
    }
  }

  const currentUserSummary =
    memberCards.find((card) => card.email === viewer.email) ?? null;
  const recentTasks = await getOperationalTasksForViewer(viewer, {}, { limit: 8 });

  return {
    isExecutive,
    currentQuarter,
    currentYear,
    kpis: {
      teamCompletionRate,
      overdueExposure,
      productivityScore,
      topPerformer,
      atRiskMember,
    },
    workloadDistribution: memberCards.map((card) => ({
      userId: card.userId,
      name: card.name,
      openTasks: card.workloadOpenTasks,
      overdueTasks: Math.round(card.overdueRate),
    })),
    memberCards,
    quarterlyTrend,
    currentUserSummary,
    recentTasks: recentTasks.slice(0, 8),
    recentNotifications: [],
  };
}

export async function getMonthlyGovernanceDashboard(
  viewer: Viewer,
  cycleId?: string,
): Promise<MonthlyGovernanceDashboardView> {
  const isExecutive = canEvaluateTeamPerformance(viewer);
  const allCycles = await prisma.monthlyCycle.findMany({
    orderBy: [{ isActive: "desc" }, { year: "desc" }, { month: "desc" }],
    select: {
      id: true,
      month: true,
      year: true,
      label: true,
      status: true,
      isActive: true,
      activatedAt: true,
      closedAt: true,
    },
  });
  const cycles = allCycles.map(mapMonthlyCycleOption);
  const currentMonth = getCurrentMonthCycle();
  const selectedCycle =
    cycles.find((cycle) => cycle.id === cycleId) ??
    cycles.find((cycle) => cycle.isActive) ??
    cycles.find(
      (cycle) =>
        cycle.year === currentMonth.year && cycle.month === currentMonth.month,
    ) ??
    cycles[0] ??
    null;

  if (!selectedCycle) {
    return {
      cycles,
      selectedCycle: null,
      previousCycle: null,
      kpis: {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        monthlyCompletionRate: 0,
        workloadBalance: 100,
        monthlyTeamScore: 0,
      },
      taskSummary: {
        totalTasks: 0,
        openTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      },
      employeeCards: [],
      tasks: [],
      timeline: [],
    };
  }

  const previousPeriod = getPreviousMonthCycle(selectedCycle.year, selectedCycle.month);
  const previousCycle =
    cycles.find(
      (cycle) =>
        cycle.year === previousPeriod.year && cycle.month === previousPeriod.month,
    ) ?? null;
  const allEmployees = await getEvaluatedEmployees();
  const employees = isExecutive
    ? allEmployees
    : allEmployees.filter((employee) => employee.email === viewer.email);
  const employeeIds = employees.map((employee) => employee.id);

  const [reviews, previousReviews, tasks, currentCycleMetricsByEmployee] = await Promise.all([
    prisma.monthlyPerformanceReview.findMany({
      where: {
        cycleId: selectedCycle.id,
        employeeUserId: {
          in: employeeIds,
        },
      },
      select: {
        id: true,
        cycleId: true,
        employeeUserId: true,
        evaluatorUserId: true,
        status: true,
        systemMetrics: true,
        managerNotes: true,
        recommendation: true,
        systemScorePercent: true,
        managerScorePercent: true,
        finalScorePercent: true,
        grade: true,
        finalizedAt: true,
      },
    }),
    previousCycle
      ? prisma.monthlyPerformanceReview.findMany({
          where: {
            cycleId: previousCycle.id,
            employeeUserId: {
              in: employeeIds,
            },
          },
          select: {
            employeeUserId: true,
            finalScorePercent: true,
          },
        })
      : Promise.resolve([]),
    getOperationalTasksForViewer(viewer, {
      cycleId: selectedCycle.id,
    }),
    prisma.$transaction((tx) =>
      calculateOperationalMetricsForMonthlyCycleBatch(tx, {
        employeeUserIds: employeeIds,
        cycleId: selectedCycle.id,
      }),
    ),
  ]);
  const reviewByEmployeeId = new Map(
    reviews.map((review) => [review.employeeUserId, mapMonthlyReview(review)]),
  );
  const previousReviewByEmployeeId = new Map(
    previousReviews.map((review) => [review.employeeUserId, review.finalScorePercent.toNumber()]),
  );

  const employeeCards = employees.map((employee) => {
    const metrics =
      currentCycleMetricsByEmployee.get(employee.id) ??
      createEmptyOperationalMetrics();
    const review = reviewByEmployeeId.get(employee.id) ?? null;
    const monthlyScore = review?.finalScorePercent ?? metrics.systemScore;
    const previousScore = previousReviewByEmployeeId.get(employee.id) ?? null;
    const workloadPercent = Math.min(100, metrics.activeTasks * 14);

    return {
      userId: employee.id,
      name: employee.name,
      email: employee.email,
      title: employee.title,
      role: employee.role,
      assignedTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      overdueTasks: metrics.overdueTasks,
      completionRate: metrics.completionRate,
      onTimeCompletionRate: metrics.onTimeCompletionRate,
      overdueRate: metrics.overdueRate,
      averageCompletionHours: metrics.averageCompletionHours,
      workloadOpenTasks: metrics.activeTasks,
      workloadLevel: getWorkloadLevel(metrics.activeTasks),
      workloadPercent,
      systemScore: metrics.systemScore,
      managerScore: review?.managerScorePercent ?? null,
      monthlyScore,
      grade: review?.grade ?? null,
      trendDelta:
        previousScore === null ? null : roundMetric(monthlyScore - previousScore),
      review,
    };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const overdueTasks = tasks.filter((task) => task.slaStatus === "OVERDUE").length;
  const openTasks = tasks.filter((task) => task.status !== "COMPLETED").length;
  const monthlyCompletionRate =
    totalTasks === 0 ? 0 : roundMetric((completedTasks / totalTasks) * 100);
  const workloadBalance = calculateWorkloadBalance(
    employeeCards.map((card) => card.workloadOpenTasks),
  );
  const monthlyTeamScore =
    employeeCards.length === 0
      ? 0
      : roundMetric(
          employeeCards.reduce((sum, card) => sum + card.monthlyScore, 0) /
            employeeCards.length,
        );
  const daysInMonth = getDaysInMonth(selectedCycle.year, selectedCycle.month);
  const todayIso = new Date().toISOString().slice(0, 10);
  const tasksByDate = tasks.reduce(
    (
      map,
      task,
    ) => {
      const isoDate = task.dueDate.toISOString().slice(0, 10);
      const existing = map.get(isoDate);

      if (existing) {
        existing.push(task);
        return map;
      }

      map.set(isoDate, [task]);
      return map;
    },
    new Map<string, typeof tasks>(),
  );
  const timeline = Array.from({ length: daysInMonth }, (_, index) => {
    const dayOfMonth = index + 1;
    const dayDate = new Date(Date.UTC(selectedCycle.year, selectedCycle.month - 1, dayOfMonth));
    const isoDate = dayDate.toISOString().slice(0, 10);
    const dayTasks = tasksByDate.get(isoDate) ?? [];
    const assigneeLoads = Array.from(
      dayTasks.reduce((map, task) => {
        const existing = map.get(task.assignedTo.id);

        map.set(task.assignedTo.id, {
          userId: task.assignedTo.id,
          name: task.assignedTo.name,
          count: (existing?.count ?? 0) + 1,
        });

        return map;
      }, new Map<string, { userId: string; name: string; count: number }>())
        .values(),
    );

    return {
      isoDate,
      dayOfMonth,
      weekdayShort: new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        timeZone: "Asia/Riyadh",
      }).format(dayDate),
      isToday: isoDate === todayIso,
      totalTasks: dayTasks.length,
      completedTasks: dayTasks.filter((task) => task.status === "COMPLETED").length,
      overdueTasks: dayTasks.filter((task) => task.slaStatus === "OVERDUE").length,
      assigneeLoads,
      taskTitles: dayTasks.slice(0, 3).map((task) => task.title),
    };
  });

  return {
    cycles,
    selectedCycle,
    previousCycle,
    kpis: {
      totalTasks,
      completedTasks,
      overdueTasks,
      monthlyCompletionRate,
      workloadBalance,
      monthlyTeamScore,
    },
    taskSummary: {
      totalTasks,
      openTasks,
      completedTasks,
      overdueTasks,
    },
    employeeCards,
    tasks,
    timeline,
  };
}
