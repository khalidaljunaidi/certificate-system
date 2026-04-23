import type { OperationalTaskPriority, UserRole } from "@prisma/client";

import { canManageOperationalTasks } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getChecklistCompletionPercent, getElapsedHoursSinceAssignment, getRemainingHoursToDueDate, getTaskSlaStatus } from "@/lib/task-metrics";
import type {
  OperationalTaskDetailView,
  OperationalTaskListItem,
  TaskLookupOptions,
} from "@/lib/types";
import { buildAdminContextHref } from "@/lib/context-links";
import { syncOperationalTaskAlerts } from "@/server/services/task-service";

type TaskViewer = {
  id: string;
  role: UserRole;
  email: string;
};

type TaskFilters = {
  search?: string;
  status?: string;
  priority?: string;
  assignedToUserId?: string;
  cycleId?: string;
};

function mapTaskItem(task: {
  id: string;
  title: string;
  description: string;
  type: OperationalTaskListItem["type"];
  priority: OperationalTaskPriority;
  status: OperationalTaskListItem["status"];
  startDate: Date | null;
  dueDate: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reopenedCount: number;
  assignedTo: OperationalTaskListItem["assignedTo"];
  assignedBy: OperationalTaskListItem["assignedBy"];
  checklistItems: Array<{
    completed: boolean;
  }>;
  project: {
    id: string;
    projectCode: string;
    projectName: string;
  } | null;
  vendor: {
    id: string;
    vendorId: string;
    vendorName: string;
  } | null;
  projectVendor: {
    id: string;
    poNumber: string | null;
    contractNumber: string | null;
  } | null;
  certificate: {
    id: string;
    certificateCode: string;
    status: NonNullable<OperationalTaskListItem["linkedCertificate"]>["status"];
  } | null;
  monthlyCycle: {
    id: string;
    label: string;
    month: number;
    year: number;
    status: NonNullable<OperationalTaskListItem["monthlyCycle"]>["status"];
    isActive: boolean;
  } | null;
}): OperationalTaskListItem {
  const checklistItemsCount = task.checklistItems.length;
  const completedChecklistItemsCount = task.checklistItems.filter(
    (item) => item.completed,
  ).length;
  const slaStatus = getTaskSlaStatus({
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority,
    completedAt: task.completedAt,
  });

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    priority: task.priority,
    status: task.status,
    slaStatus,
    startDate: task.startDate,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignedTo: task.assignedTo,
    assignedBy: task.assignedBy,
    checklistCompletionPercent: getChecklistCompletionPercent({
      total: checklistItemsCount,
      completed: completedChecklistItemsCount,
    }),
    checklistItemsCount,
    completedChecklistItemsCount,
    elapsedHoursSinceAssignment: getElapsedHoursSinceAssignment(task.createdAt),
    remainingHoursToDueDate: getRemainingHoursToDueDate(task.dueDate, task.status),
    reopenedCount: task.reopenedCount,
    linkedProject: task.project,
    linkedVendor: task.vendor,
    linkedProjectVendor: task.projectVendor,
    linkedCertificate: task.certificate,
    monthlyCycle: task.monthlyCycle,
    href: buildAdminContextHref({
      taskId: task.id,
      projectId: task.project?.id,
      vendorId: task.vendor?.id,
      projectVendorId: task.projectVendor?.id,
      certificateId: task.certificate?.id,
    }),
  };
}

export async function getTaskLookupOptions(): Promise<TaskLookupOptions> {
  const [users, projects, vendors, assignments, monthlyCycles, certificates] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
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
    }),
    prisma.project.findMany({
      where: {
        isArchived: false,
      },
      orderBy: {
        projectName: "asc",
      },
      select: {
        id: true,
        projectCode: true,
        projectName: true,
      },
    }),
    prisma.vendor.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        vendorName: "asc",
      },
      select: {
        id: true,
        vendorId: true,
        vendorName: true,
      },
    }),
    prisma.projectVendor.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        projectId: true,
        vendorId: true,
        poNumber: true,
        contractNumber: true,
        project: {
          select: {
            projectCode: true,
            projectName: true,
          },
        },
        vendor: {
          select: {
            vendorName: true,
            vendorId: true,
          },
        },
      },
    }),
    prisma.monthlyCycle.findMany({
      orderBy: [{ isActive: "desc" }, { year: "desc" }, { month: "desc" }],
      select: {
        id: true,
        label: true,
        month: true,
        year: true,
        status: true,
        isActive: true,
      },
    }),
    prisma.certificate.findMany({
      where: {
        isArchived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        projectId: true,
        vendorId: true,
        projectVendorId: true,
        certificateCode: true,
        status: true,
      },
    }),
  ]);

  return {
    users,
    projects,
    vendors,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      projectId: assignment.projectId,
      vendorId: assignment.vendorId,
      projectLabel: `${assignment.project.projectCode} | ${assignment.project.projectName}`,
      vendorLabel: `${assignment.vendor.vendorName} | ${assignment.vendor.vendorId}`,
      poNumber: assignment.poNumber,
      contractNumber: assignment.contractNumber,
    })),
    monthlyCycles,
    certificates,
  };
}

export async function getOperationalTasksForViewer(
  viewer: TaskViewer,
  filters: TaskFilters = {},
) {
  await syncOperationalTaskAlerts();

  const where = {
    ...(filters.search
      ? {
          OR: [
            {
              title: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(filters.status
      ? {
          status: filters.status as OperationalTaskListItem["status"],
        }
      : {}),
    ...(filters.priority
      ? {
          priority: filters.priority as OperationalTaskPriority,
        }
      : {}),
    ...(filters.assignedToUserId ? { assignedToUserId: filters.assignedToUserId } : {}),
    ...(filters.cycleId ? { monthlyCycleId: filters.cycleId } : {}),
    ...(canManageOperationalTasks(viewer.role)
      ? {}
      : {
          assignedToUserId: viewer.id,
        }),
  };

  const tasks = await prisma.operationalTask.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
        },
      },
      checklistItems: {
        select: {
          completed: true,
        },
      },
      project: {
        select: {
          id: true,
          projectCode: true,
          projectName: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorId: true,
          vendorName: true,
        },
      },
      projectVendor: {
        select: {
          id: true,
          poNumber: true,
          contractNumber: true,
        },
      },
      certificate: {
        select: {
          id: true,
          certificateCode: true,
          status: true,
        },
      },
      monthlyCycle: {
        select: {
          id: true,
          label: true,
          month: true,
          year: true,
          status: true,
          isActive: true,
        },
      },
    },
  });

  return tasks.map(mapTaskItem);
}

export async function getOperationalTaskDetail(
  viewer: TaskViewer,
  taskId: string,
): Promise<OperationalTaskDetailView | null> {
  const task = await prisma.operationalTask.findFirst({
    where: {
      id: taskId,
      ...(canManageOperationalTasks(viewer.role)
        ? {}
        : {
            assignedToUserId: viewer.id,
          }),
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
        },
      },
      checklistItems: {
        orderBy: {
          orderIndex: "asc",
        },
        select: {
          id: true,
          label: true,
          completed: true,
          completedAt: true,
          orderIndex: true,
        },
      },
      project: {
        select: {
          id: true,
          projectCode: true,
          projectName: true,
        },
      },
      vendor: {
        select: {
          id: true,
          vendorId: true,
          vendorName: true,
        },
      },
      projectVendor: {
        select: {
          id: true,
          poNumber: true,
          contractNumber: true,
        },
      },
      certificate: {
        select: {
          id: true,
          certificateCode: true,
          status: true,
        },
      },
      monthlyCycle: {
        select: {
          id: true,
          label: true,
          month: true,
          year: true,
          status: true,
          isActive: true,
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  return {
    task: {
      ...mapTaskItem({
        ...task,
      }),
      requiresChecklistCompletion: task.requiresChecklistCompletion,
      dueSoonNotifiedAt: task.dueSoonNotifiedAt,
      overdueNotifiedAt: task.overdueNotifiedAt,
      lastStatusChangedAt: task.lastStatusChangedAt,
    },
    checklistItems: task.checklistItems,
  };
}
