import type {
  OperationalTask,
  Prisma,
  UserRole,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import type { z } from "zod";

import {
  HEAD_OF_PROJECTS_EMAIL,
  PRIMARY_EVALUATOR_EMAIL,
  PROCUREMENT_LEAD_EMAIL,
  PROCUREMENT_SPECIALIST_EMAIL,
} from "@/lib/constants";
import { buildAdminContextHref } from "@/lib/context-links";
import { canManageOperationalTasks } from "@/lib/permissions";
import { WORKFLOW_EMAIL_ROUTING_POLICIES } from "@/lib/workflow-routing";
import {
  getTaskSlaStatus,
} from "@/lib/task-metrics";
import {
  operationalTaskSchema,
  taskExecutionSchema,
  taskChecklistItemPayloadSchema,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/server/services/audit-service";
import { sendGovernedWorkflowEmail } from "@/server/services/email-service";
import { createWorkflowNotification } from "@/server/services/notification-service";

type SaveOperationalTaskInput = {
  actorUser: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    permissions?: string[] | null;
  };
  values: z.infer<typeof operationalTaskSchema>;
};

type TaskAlertPayload = {
  taskId: string;
  title: string;
  dueDate: Date;
  assignedTo: {
    id: string;
    name: string;
    email: string;
    title: string;
    role: UserRole;
  };
  assignedBy: {
    id: string;
    name: string;
    email: string;
  };
  projectId: string | null;
  vendorId: string | null;
  projectVendorId: string | null;
  certificateId: string | null;
  href: string;
  priority: OperationalTask["priority"];
  executionResult?: string | null;
};

type ChecklistPayload = Array<{
  label: string;
  completed: boolean;
  orderIndex: number;
}>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getTaskEscalationEmails(
  event: "TASK_ASSIGNED" | "TASK_DUE_SOON" | "TASK_OVERDUE" | "TASK_COMPLETED",
  task: TaskAlertPayload,
) {
  const escalationEmails = new Set<string>();

  if (
    (event === "TASK_DUE_SOON" || event === "TASK_OVERDUE") &&
    normalizeEmail(task.assignedTo.email) === PROCUREMENT_SPECIALIST_EMAIL
  ) {
    escalationEmails.add(PROCUREMENT_LEAD_EMAIL);
  }

  if (event === "TASK_OVERDUE") {
    escalationEmails.add(PRIMARY_EVALUATOR_EMAIL);
  }

  if (event === "TASK_COMPLETED") {
    escalationEmails.add(PRIMARY_EVALUATOR_EMAIL);
  }

  return [...escalationEmails];
}

function parseChecklistPayload(payload: string): ChecklistPayload {
  const parsed = JSON.parse(payload);

  if (!Array.isArray(parsed)) {
    throw new Error("The task checklist payload is invalid.");
  }

  return parsed.map((item, index) =>
    taskChecklistItemPayloadSchema.parse({
      ...item,
      orderIndex:
        typeof item?.orderIndex === "number" ? item.orderIndex : index,
    }),
  );
}

async function validateTaskRelations(
  tx: Prisma.TransactionClient,
  values: z.infer<typeof operationalTaskSchema>,
) {
  const [project, vendor, projectVendor, certificate, monthlyCycle] = await Promise.all([
    values.linkedProjectId
      ? tx.project.findUnique({
          where: { id: values.linkedProjectId },
          select: { id: true },
        })
      : Promise.resolve(null),
    values.linkedVendorId
      ? tx.vendor.findUnique({
          where: { id: values.linkedVendorId },
          select: { id: true },
        })
      : Promise.resolve(null),
    values.linkedProjectVendorId
      ? tx.projectVendor.findUnique({
          where: { id: values.linkedProjectVendorId },
          select: {
            id: true,
            projectId: true,
            vendorId: true,
          },
        })
      : Promise.resolve(null),
    values.linkedCertificateId
      ? tx.certificate.findUnique({
          where: { id: values.linkedCertificateId },
          select: {
            id: true,
            projectId: true,
            vendorId: true,
            projectVendorId: true,
          },
        })
      : Promise.resolve(null),
    values.monthlyCycleId
      ? tx.monthlyCycle.findUnique({
          where: { id: values.monthlyCycleId },
          select: {
            id: true,
            status: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (values.linkedProjectId && !project) {
    throw new Error("The selected project link is not valid.");
  }

  if (values.linkedVendorId && !vendor) {
    throw new Error("The selected vendor link is not valid.");
  }

  if (values.linkedProjectVendorId && !projectVendor) {
    throw new Error("The selected assignment link is not valid.");
  }

  if (values.linkedCertificateId && !certificate) {
    throw new Error("The selected certificate link is not valid.");
  }

  if (values.monthlyCycleId && !monthlyCycle) {
    throw new Error("The selected monthly cycle is not valid.");
  }

  if (
    projectVendor &&
    values.linkedProjectId &&
    projectVendor.projectId !== values.linkedProjectId
  ) {
    throw new Error("The selected assignment does not belong to the selected project.");
  }

  if (
    projectVendor &&
    values.linkedVendorId &&
    projectVendor.vendorId !== values.linkedVendorId
  ) {
    throw new Error("The selected assignment does not belong to the selected vendor.");
  }

  if (
    certificate &&
    values.linkedProjectId &&
    certificate.projectId !== values.linkedProjectId
  ) {
    throw new Error("The selected certificate does not belong to the selected project.");
  }

  if (
    certificate &&
    values.linkedVendorId &&
    certificate.vendorId !== values.linkedVendorId
  ) {
    throw new Error("The selected certificate does not belong to the selected vendor.");
  }

  if (
    certificate &&
    values.linkedProjectVendorId &&
    certificate.projectVendorId !== values.linkedProjectVendorId
  ) {
    throw new Error("The selected certificate does not belong to the selected assignment.");
  }

  if (monthlyCycle?.status === "ARCHIVED") {
    throw new Error("Archived monthly cycles are read-only and cannot receive new task updates.");
  }
}

async function notifyTaskEvent(
  client: PrismaClient,
  event: "TASK_ASSIGNED" | "TASK_DUE_SOON" | "TASK_OVERDUE" | "TASK_COMPLETED",
  task: TaskAlertPayload,
) {
  const title =
    event === "TASK_ASSIGNED"
      ? "Operational task assigned"
      : event === "TASK_DUE_SOON"
        ? "Operational task due soon"
        : event === "TASK_OVERDUE"
          ? "Operational task overdue"
          : "Operational task completed";

  const message =
    event === "TASK_ASSIGNED"
      ? `${task.title} has been assigned to ${task.assignedTo.name} with a due date of ${task.dueDate.toLocaleDateString("en-GB")}.`
      : event === "TASK_DUE_SOON"
        ? `${task.title} is approaching its due date and requires attention from ${task.assignedTo.name}.`
        : event === "TASK_OVERDUE"
          ? `${task.title} is overdue and has been escalated for operational follow-up.`
          : `${task.title} was completed by ${task.assignedTo.name}.`;

  const routingContext = {
    assignedUser: {
      userId: task.assignedTo.id,
      email: task.assignedTo.email,
    },
    entityOwner: {
      userId: task.assignedBy.id,
      email: task.assignedBy.email,
    },
    procurementChainEmails: getTaskEscalationEmails(event, task),
    manualCcEmails:
      event === "TASK_COMPLETED" ? [PRIMARY_EVALUATOR_EMAIL] : [],
  };

  await client.$transaction(async (tx) => {
    await createWorkflowNotification(tx, {
      type: event,
      eventKey: event,
      title,
      message,
      projectId: task.projectId,
      vendorId: task.vendorId,
      projectVendorId: task.projectVendorId,
      certificateId: task.certificateId,
      taskId: task.taskId,
      href: task.href,
      routingStrategies:
        event === "TASK_OVERDUE" || event === "TASK_COMPLETED"
          ? ["assigned_user", "entity_owner", "procurement_chain"]
          : ["assigned_user", "entity_owner"],
      routingContext,
      includeProcurementTeam: false,
      dedupeKey: `${event}:${task.taskId}:${task.dueDate.toISOString().slice(0, 16)}`,
      cooldownMinutes: event === "TASK_OVERDUE" ? 240 : 120,
    });
  });

  await sendGovernedWorkflowEmail({
    event,
    label: `task-${event.toLowerCase()}`,
    subject:
      event === "TASK_ASSIGNED"
        ? `Task Assigned - ${task.title}`
        : event === "TASK_DUE_SOON"
          ? `Task Due Soon - ${task.title}`
          : event === "TASK_OVERDUE"
            ? `Task Overdue - ${task.title}`
            : `Task Completed - ${task.title}`,
    heading: title,
    intro: message,
    rows: [
      { label: "Assigned To", value: task.assignedTo.name },
      { label: "Assigned By", value: task.assignedBy.name },
      { label: "Due Date", value: task.dueDate.toLocaleDateString("en-GB") },
      { label: "Priority", value: task.priority.replaceAll("_", " ") },
      ...(event === "TASK_COMPLETED" && task.executionResult
        ? [{ label: "Execution Result", value: task.executionResult }]
        : []),
      { label: "Head of Projects", value: HEAD_OF_PROJECTS_EMAIL },
    ],
    actionLabel: "Open Task",
    actionUrl: buildAdminContextHref({
      taskId: task.taskId,
      projectId: task.projectId,
      vendorId: task.vendorId,
      projectVendorId: task.projectVendorId,
      certificateId: task.certificateId,
      href: task.href,
    }),
    logContext: {
      taskId: task.taskId,
      event,
      assignedTo: task.assignedTo.email,
      assignedBy: task.assignedBy.email,
    },
    routingPolicy: WORKFLOW_EMAIL_ROUTING_POLICIES[event],
    routingContext,
  });
}

export async function saveOperationalTask(input: SaveOperationalTaskInput) {
  const checklist = parseChecklistPayload(input.values.checklistPayload);

  if (
    input.values.status === "COMPLETED" &&
    input.values.requiresChecklistCompletion &&
    checklist.some((item) => !item.completed)
  ) {
    throw new Error("Complete every checklist item before marking the task as completed.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await validateTaskRelations(tx, input.values);

    const assignedToUser = await tx.user.findUnique({
      where: {
        id: input.values.assignedToUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        role: true,
        isActive: true,
      },
    });

    if (!assignedToUser || !assignedToUser.isActive) {
      throw new Error("The selected assignee is not available.");
    }

    const currentTask = input.values.taskId
      ? await tx.operationalTask.findUnique({
          where: {
            id: input.values.taskId,
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
              },
            },
          },
        })
      : null;

    if (input.values.taskId && !currentTask) {
      throw new Error("Operational task not found.");
    }

    if (!canManageOperationalTasks(input.actorUser)) {
      throw new Error("You do not have permission to create operational tasks.");
    }

    const now = new Date();
    const nextStatus =
      input.values.status === "COMPLETED"
        ? "COMPLETED"
        : input.values.dueDate < now
          ? "OVERDUE"
          : input.values.status;
    const completedAt =
      nextStatus === "COMPLETED"
        ? currentTask?.completedAt ?? now
        : null;
    const reopenedCount =
      currentTask && currentTask.status === "COMPLETED" && nextStatus !== "COMPLETED"
        ? currentTask.reopenedCount + 1
        : currentTask?.reopenedCount ?? 0;

    const task = currentTask
      ? await tx.operationalTask.update({
          where: { id: currentTask.id },
          data: {
            title: input.values.title,
            description: input.values.description,
            type: input.values.type,
            assignedToUserId: input.values.assignedToUserId,
            priority: input.values.priority,
            status: nextStatus,
            startDate: input.values.startDate ?? null,
            dueDate: input.values.dueDate,
            completedAt,
            linkedProjectId: input.values.linkedProjectId ?? null,
            linkedVendorId: input.values.linkedVendorId ?? null,
            linkedProjectVendorId: input.values.linkedProjectVendorId ?? null,
            linkedCertificateId: input.values.linkedCertificateId ?? null,
            monthlyCycleId: input.values.monthlyCycleId ?? null,
            requiresChecklistCompletion: input.values.requiresChecklistCompletion,
            reopenedCount,
            lastStatusChangedAt:
              currentTask.status !== nextStatus ? now : currentTask.lastStatusChangedAt,
          },
        })
      : await tx.operationalTask.create({
          data: {
            title: input.values.title,
            description: input.values.description,
            type: input.values.type,
            assignedToUserId: input.values.assignedToUserId,
            assignedByUserId: input.actorUser.id,
            priority: input.values.priority,
            status: nextStatus,
            startDate: input.values.startDate ?? null,
            dueDate: input.values.dueDate,
            completedAt,
            linkedProjectId: input.values.linkedProjectId ?? null,
            linkedVendorId: input.values.linkedVendorId ?? null,
            linkedProjectVendorId: input.values.linkedProjectVendorId ?? null,
            linkedCertificateId: input.values.linkedCertificateId ?? null,
            monthlyCycleId: input.values.monthlyCycleId ?? null,
            requiresChecklistCompletion: input.values.requiresChecklistCompletion,
            lastStatusChangedAt: now,
          },
        });

    await tx.taskChecklistItem.deleteMany({
      where: {
        taskId: task.id,
      },
    });

    if (checklist.length > 0) {
      await tx.taskChecklistItem.createMany({
        data: checklist.map((item) => ({
          taskId: task.id,
          label: item.label,
          completed: item.completed,
          completedAt: item.completed ? now : null,
          orderIndex: item.orderIndex,
        })),
      });
    }

    await createAuditLog(tx, {
      action: !currentTask
        ? "TASK_ASSIGNED"
        : nextStatus === "COMPLETED" && currentTask.status !== "COMPLETED"
          ? "TASK_COMPLETED"
          : "TASK_UPDATED",
      entityType: "OperationalTask",
      entityId: task.id,
      projectId: task.linkedProjectId,
      certificateId: task.linkedCertificateId,
      userId: input.actorUser.id,
      details: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        assignedToUserId: task.assignedToUserId,
        assignedByUserId: task.assignedByUserId,
        checklistItems: checklist.length,
        monthlyCycleId: task.monthlyCycleId,
      },
    });

    return {
      task,
      assignedTo: assignedToUser,
      assignedBy: currentTask?.assignedBy ?? {
        id: input.actorUser.id,
        name: input.actorUser.name,
        email: input.actorUser.email,
      },
      shouldNotifyAssignment:
        !currentTask || currentTask.assignedToUserId !== task.assignedToUserId,
      shouldNotifyCompletion:
        task.status === "COMPLETED" && currentTask?.status !== "COMPLETED",
    };
  });

  const taskContext: TaskAlertPayload = {
    taskId: result.task.id,
    title: result.task.title,
    dueDate: result.task.dueDate,
    assignedTo: result.assignedTo,
    assignedBy: result.assignedBy,
    projectId: result.task.linkedProjectId,
    vendorId: result.task.linkedVendorId,
    projectVendorId: result.task.linkedProjectVendorId,
    certificateId: result.task.linkedCertificateId,
    href: buildAdminContextHref({
      taskId: result.task.id,
      projectId: result.task.linkedProjectId,
      vendorId: result.task.linkedVendorId,
      projectVendorId: result.task.linkedProjectVendorId,
      certificateId: result.task.linkedCertificateId,
    }),
    priority: result.task.priority,
  };

  if (result.shouldNotifyAssignment) {
    await notifyTaskEvent(prisma, "TASK_ASSIGNED", taskContext);
  }

  if (result.shouldNotifyCompletion) {
    await notifyTaskEvent(prisma, "TASK_COMPLETED", taskContext);
  }

  return result.task;
}

export async function updateOperationalTaskExecution(input: {
  actorUser: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
  values: z.infer<typeof taskExecutionSchema>;
}) {
  const values = taskExecutionSchema.parse(input.values);
  const checklist = parseChecklistPayload(values.checklistPayload);

  const result = await prisma.$transaction(async (tx) => {
    const currentTask = await tx.operationalTask.findUnique({
      where: {
        id: values.taskId,
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
          },
        },
      },
    });

    if (!currentTask) {
      throw new Error("Operational task not found.");
    }

    if (currentTask.assignedToUserId !== input.actorUser.id) {
      throw new Error("Only the assigned user can complete this task.");
    }

    if (currentTask.status === "COMPLETED") {
      throw new Error("This task has already been completed.");
    }

    if (
      currentTask.requiresChecklistCompletion &&
      checklist.some((item) => !item.completed)
    ) {
      throw new Error("Complete every checklist item before marking the task as completed.");
    }

    const now = new Date();
    const task = await tx.operationalTask.update({
      where: {
        id: currentTask.id,
      },
      data: {
        executionResult: values.executionResult,
        status: "COMPLETED",
        completedAt: now,
        lastStatusChangedAt: now,
      },
    });

    await tx.taskChecklistItem.deleteMany({
      where: {
        taskId: task.id,
      },
    });

    if (checklist.length > 0) {
      await tx.taskChecklistItem.createMany({
        data: checklist.map((item) => ({
          taskId: task.id,
          label: item.label,
          completed: item.completed,
          completedAt: item.completed ? now : null,
          orderIndex: item.orderIndex,
        })),
      });
    }

    await createAuditLog(tx, {
      action: "TASK_COMPLETED",
      entityType: "OperationalTask",
      entityId: task.id,
      projectId: task.linkedProjectId,
      certificateId: task.linkedCertificateId,
      userId: input.actorUser.id,
      details: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        assignedToUserId: task.assignedToUserId,
        assignedByUserId: task.assignedByUserId,
        checklistItems: checklist.length,
        executionResult: values.executionResult,
        monthlyCycleId: task.monthlyCycleId,
      },
    });

    return {
      task,
      assignedTo: currentTask.assignedTo,
      assignedBy: currentTask.assignedBy,
    };
  });

  const taskContext: TaskAlertPayload = {
    taskId: result.task.id,
    title: result.task.title,
    dueDate: result.task.dueDate,
    assignedTo: result.assignedTo,
    assignedBy: result.assignedBy,
    projectId: result.task.linkedProjectId,
    vendorId: result.task.linkedVendorId,
    projectVendorId: result.task.linkedProjectVendorId,
    certificateId: result.task.linkedCertificateId,
    href: buildAdminContextHref({
      taskId: result.task.id,
      projectId: result.task.linkedProjectId,
      vendorId: result.task.linkedVendorId,
      projectVendorId: result.task.linkedProjectVendorId,
      certificateId: result.task.linkedCertificateId,
    }),
    priority: result.task.priority,
    executionResult: result.task.executionResult,
  };

  await notifyTaskEvent(prisma, "TASK_COMPLETED", taskContext);

  return result.task;
}

export async function syncOperationalTaskAlerts() {
  const openTasks = await prisma.operationalTask.findMany({
    where: {
      status: {
        in: ["NOT_STARTED", "IN_PROGRESS", "WAITING", "BLOCKED", "OVERDUE"],
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      status: true,
      dueSoonNotifiedAt: true,
      overdueNotifiedAt: true,
      linkedProjectId: true,
      linkedVendorId: true,
      linkedProjectVendorId: true,
      linkedCertificateId: true,
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
        },
      },
    },
  });

  for (const task of openTasks) {
    const slaStatus = getTaskSlaStatus({
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
    });

    if (slaStatus === "AT_RISK" && !task.dueSoonNotifiedAt) {
      await prisma.operationalTask.update({
        where: { id: task.id },
        data: {
          dueSoonNotifiedAt: new Date(),
          status: task.status === "OVERDUE" ? "OVERDUE" : task.status,
        },
      });

      await notifyTaskEvent(prisma, "TASK_DUE_SOON", {
        taskId: task.id,
        title: task.title,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
        projectId: task.linkedProjectId,
        vendorId: task.linkedVendorId,
        projectVendorId: task.linkedProjectVendorId,
        certificateId: task.linkedCertificateId,
        href: buildAdminContextHref({
          taskId: task.id,
          projectId: task.linkedProjectId,
          vendorId: task.linkedVendorId,
          projectVendorId: task.linkedProjectVendorId,
          certificateId: task.linkedCertificateId,
        }),
        priority: task.priority,
      });
    }

    if (slaStatus === "OVERDUE" && !task.overdueNotifiedAt) {
      await prisma.operationalTask.update({
        where: { id: task.id },
        data: {
          overdueNotifiedAt: new Date(),
          status: "OVERDUE",
        },
      });

      await notifyTaskEvent(prisma, "TASK_OVERDUE", {
        taskId: task.id,
        title: task.title,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
        projectId: task.linkedProjectId,
        vendorId: task.linkedVendorId,
        projectVendorId: task.linkedProjectVendorId,
        certificateId: task.linkedCertificateId,
        href: buildAdminContextHref({
          taskId: task.id,
          projectId: task.linkedProjectId,
          vendorId: task.linkedVendorId,
          projectVendorId: task.linkedProjectVendorId,
          certificateId: task.linkedCertificateId,
        }),
        priority: task.priority,
      });
    }
  }
}
