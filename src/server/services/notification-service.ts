import type {
  NotificationEventKey,
  NotificationSeverity,
  NotificationType,
  Prisma,
} from "@prisma/client";

import {
  NOTIFICATION_EVENT_DEFAULTS,
  PRIMARY_EVALUATOR_EMAIL,
  PROCUREMENT_TEAM_EMAILS,
} from "@/lib/constants";
import { buildAdminContextHref } from "@/lib/context-links";
import { NOTIFICATION_ROUTING_POLICIES } from "@/lib/workflow-routing";
import {
  resolveNotificationRecipientUserIds,
  type WorkflowRoutingContext,
} from "@/server/services/workflow-routing-service";

type WorkflowNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string | null;
  certificateId?: string | null;
  vendorId?: string | null;
  projectVendorId?: string | null;
  taskId?: string | null;
  href?: string | null;
  recipientUserIds?: string[];
  includeProcurementTeam?: boolean;
  eventKey?: NotificationEventKey;
  severity?: NotificationSeverity;
  dedupeKey?: string | null;
  cooldownMinutes?: number;
  routingStrategies?: Array<
    | "project_manager"
    | "assigned_user"
    | "evaluated_employee"
    | "procurement_chain"
    | "entity_owner"
    | "default_fallback"
    | "manual_override"
  >;
  routingContext?: WorkflowRoutingContext;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

function mergeUsersById(
  users: Array<{
    id: string;
    email: string;
    name: string | null;
  }>,
) {
  const seen = new Set<string>();
  const merged: typeof users = [];

  for (const user of users) {
    if (seen.has(user.id)) {
      continue;
    }

    seen.add(user.id);
    merged.push(user);
  }

  return merged;
}

function inferEventKeyFromType(type: NotificationType): NotificationEventKey {
  switch (type) {
    case "CERTIFICATE_CREATED":
      return "CERT_CREATED";
    case "SENT_FOR_PM_APPROVAL":
      return "CERT_SUBMITTED_PM";
    case "PM_APPROVED":
      return "CERT_PM_APPROVED";
    case "PM_REJECTED":
      return "CERT_PM_REJECTED";
    case "CERTIFICATE_ISSUED":
      return "CERT_ISSUED";
    case "CERTIFICATE_REOPENED":
      return "CERT_REOPENED";
    case "CERTIFICATE_REVOKED":
      return "CERT_REVOKED";
    case "TASK_ASSIGNED":
      return "TASK_ASSIGNED";
    case "TASK_DUE_SOON":
      return "TASK_DUE_SOON";
    case "TASK_OVERDUE":
      return "TASK_OVERDUE";
    case "TASK_COMPLETED":
      return "TASK_COMPLETED";
    case "VENDOR_CREATED":
      return "VENDOR_CREATED";
    case "SYSTEM_ALERT":
      return "SYSTEM_ALERT";
    case "CERTIFICATE_UPDATED":
      return "CERT_CREATED";
    case "VENDOR_EVALUATION_REQUESTED":
      return "SYSTEM_ALERT";
    case "VENDOR_EVALUATION_READY_FOR_PROCUREMENT":
      return "SYSTEM_ALERT";
    case "VENDOR_EVALUATION_COMPLETED":
      return "SYSTEM_ALERT";
    default:
      return "SYSTEM_ALERT";
  }
}

const MANDATORY_EXECUTIVE_NOTIFICATION_TYPES = new Set<NotificationType>([
  "CERTIFICATE_CREATED",
  "CERTIFICATE_UPDATED",
  "SENT_FOR_PM_APPROVAL",
  "PM_APPROVED",
  "PM_REJECTED",
  "CERTIFICATE_ISSUED",
  "CERTIFICATE_REOPENED",
  "CERTIFICATE_REVOKED",
  "VENDOR_EVALUATION_REQUESTED",
  "VENDOR_EVALUATION_READY_FOR_PROCUREMENT",
  "VENDOR_EVALUATION_COMPLETED",
  "TASK_OVERDUE",
  "SYSTEM_ALERT",
]);

const MANDATORY_EXECUTIVE_NOTIFICATION_EVENT_KEYS = new Set<
  NotificationEventKey | "PERFORMANCE_REVIEW_FINALIZED"
>(["PERFORMANCE_REVIEW_FINALIZED"]);

function shouldAddMandatoryExecutiveOversight(input: {
  type: NotificationType;
  eventKey: NotificationEventKey;
}) {
  return (
    MANDATORY_EXECUTIVE_NOTIFICATION_TYPES.has(input.type) ||
    MANDATORY_EXECUTIVE_NOTIFICATION_EVENT_KEYS.has(input.eventKey)
  );
}

async function resolveMandatoryExecutiveOversightUsers(
  tx: Prisma.TransactionClient,
) {
  const user = await tx.user.findUnique({
    where: {
      email: PRIMARY_EVALUATOR_EMAIL,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    console.warn("[notification] mandatory executive oversight user not found", {
      email: PRIMARY_EVALUATOR_EMAIL,
    });
    return [];
  }

  return [user];
}

async function resolveRecipientUsers(
  tx: Prisma.TransactionClient,
  input: WorkflowNotificationInput,
) {
  const routingStrategies =
    input.routingStrategies ??
    NOTIFICATION_ROUTING_POLICIES[
      input.eventKey ?? inferEventKeyFromType(input.type)
    ];

  if (routingStrategies && input.routingContext) {
    const resolvedUsers = await resolveNotificationRecipientUserIds(tx, {
      strategies: routingStrategies,
      context: input.routingContext,
    });

    if (resolvedUsers.length > 0) {
      return resolvedUsers;
    }
  }

  const recipientClauses: Prisma.UserWhereInput[] = [];

  if (input.recipientUserIds?.length) {
    recipientClauses.push({
      id: {
        in: input.recipientUserIds,
      },
    });
  }

  if (input.includeProcurementTeam ?? true) {
    recipientClauses.push({
      email: {
        in: [...PROCUREMENT_TEAM_EMAILS],
      },
    });
  }

  if (recipientClauses.length === 0) {
    return [];
  }

  return tx.user.findMany({
    where: {
      isActive: true,
      OR: recipientClauses,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

async function createDispatchLog(
  tx: Prisma.TransactionClient,
  input: WorkflowNotificationInput & {
    eventKey: NotificationEventKey;
    severity: NotificationSeverity;
    href: string;
    recipientSnapshot: Prisma.InputJsonValue;
    inAppCreatedCount: number;
    emailDeliveryStatus?: "NOT_REQUESTED" | "SKIPPED" | "SENT" | "FAILED" | "PARTIAL";
  },
) {
  return tx.notificationDispatchLog.create({
    data: {
      eventKey: input.eventKey,
      type: input.type,
      severity: input.severity,
      dedupeKey: input.dedupeKey ?? undefined,
      cooldownUntil:
        input.cooldownMinutes && input.cooldownMinutes > 0
          ? new Date(Date.now() + input.cooldownMinutes * 60 * 1000)
          : undefined,
      inAppCreatedCount: input.inAppCreatedCount,
      emailDeliveryStatus: input.emailDeliveryStatus ?? "NOT_REQUESTED",
      relatedProjectId: input.projectId ?? undefined,
      relatedVendorId: input.vendorId ?? undefined,
      relatedProjectVendorId: input.projectVendorId ?? undefined,
      relatedCertificateId: input.certificateId ?? undefined,
      relatedTaskId: input.taskId ?? undefined,
      linkHref: input.href,
      recipientSnapshot: input.recipientSnapshot,
    },
  });
}

async function shouldSkipByCooldown(
  tx: Prisma.TransactionClient,
  input: WorkflowNotificationInput,
) {
  if (!input.dedupeKey || !input.cooldownMinutes || input.cooldownMinutes <= 0) {
    return false;
  }

  const latest = await tx.notificationDispatchLog.findFirst({
    where: {
      dedupeKey: input.dedupeKey,
      eventKey: input.eventKey ?? inferEventKeyFromType(input.type),
      createdAt: {
        gte: new Date(Date.now() - input.cooldownMinutes * 60 * 1000),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });

  return Boolean(latest);
}

export async function createWorkflowNotification(
  tx: Prisma.TransactionClient,
  input: WorkflowNotificationInput,
) {
  const eventKey = input.eventKey ?? inferEventKeyFromType(input.type);
  const severity = input.severity ?? NOTIFICATION_EVENT_DEFAULTS[eventKey].severity;
  const href = buildAdminContextHref({
    href: input.href,
    taskId: input.taskId,
    projectId: input.projectId,
    vendorId: input.vendorId,
    projectVendorId: input.projectVendorId,
    certificateId: input.certificateId,
  });

  if (await shouldSkipByCooldown(tx, { ...input, eventKey })) {
    console.info("[notification] workflow notification skipped by cooldown", {
      type: input.type,
      eventKey,
      dedupeKey: input.dedupeKey ?? null,
      cooldownMinutes: input.cooldownMinutes ?? null,
      projectId: input.projectId ?? null,
      vendorId: input.vendorId ?? null,
      certificateId: input.certificateId ?? null,
      taskId: input.taskId ?? null,
    });
    return [];
  }

  const recipientUsers = await resolveRecipientUsers(tx, input);
  const mandatoryOversightUsers = shouldAddMandatoryExecutiveOversight({
    type: input.type,
    eventKey,
  })
    ? await resolveMandatoryExecutiveOversightUsers(tx)
    : [];
  const resolvedRecipients = mergeUsersById([
    ...recipientUsers,
    ...mandatoryOversightUsers,
  ]);
  const recipientIds = uniqueStrings(resolvedRecipients.map((user) => user.id));

  if (recipientIds.length === 0) {
    await createDispatchLog(tx, {
      ...input,
      eventKey,
      severity,
      href,
      recipientSnapshot: {
        recipientUserIds: input.recipientUserIds ?? [],
        includeProcurementTeam: input.includeProcurementTeam ?? true,
        resolvedRecipients: [],
        mandatoryOversightRecipientEmails: [],
        reason: "NO_ACTIVE_RECIPIENTS",
      },
      inAppCreatedCount: 0,
      emailDeliveryStatus: "SKIPPED",
    });

    console.warn("[notification] workflow notification skipped", {
      type: input.type,
      eventKey,
      title: input.title,
      projectId: input.projectId ?? null,
      certificateId: input.certificateId ?? null,
      vendorId: input.vendorId ?? null,
      taskId: input.taskId ?? null,
      requestedRecipientUserIds: input.recipientUserIds ?? [],
      includeProcurementTeam: input.includeProcurementTeam ?? true,
      reason: "NO_ACTIVE_RECIPIENTS",
    });
    return [];
  }

  const recipientSnapshot = {
    recipientUserIds: resolvedRecipients.map((user) => user.id),
    recipientNames: resolvedRecipients.map((user) => user.name),
    recipientEmails: resolvedRecipients.map((user) => user.email.toLowerCase()),
    mandatoryOversightRecipientEmails: mandatoryOversightUsers.map((user) =>
      user.email.toLowerCase(),
    ),
    routingStrategies: input.routingStrategies ?? null,
  };

  const dispatchLog = await createDispatchLog(tx, {
    ...input,
    eventKey,
    severity,
    href,
    recipientSnapshot,
    inAppCreatedCount: recipientIds.length,
  });

  const createdNotifications = await Promise.all(
    recipientIds.map((userId) =>
      tx.notification.create({
        data: {
          userId,
          type: input.type,
          eventKey,
          severity,
          title: input.title,
          message: input.message,
          relatedProjectId: input.projectId ?? undefined,
          relatedCertificateId: input.certificateId ?? undefined,
          relatedVendorId: input.vendorId ?? undefined,
          relatedProjectVendorId: input.projectVendorId ?? undefined,
          relatedTaskId: input.taskId ?? undefined,
          href,
          dispatchLogId: dispatchLog.id,
        },
      }),
    ),
  );

  await tx.notificationDispatchLog.update({
    where: {
      id: dispatchLog.id,
    },
    data: {
      inAppCreatedCount: createdNotifications.length,
    },
  });

  console.info("[notification] workflow notification created", {
    type: input.type,
    eventKey,
    severity,
    title: input.title,
    projectId: input.projectId ?? null,
    certificateId: input.certificateId ?? null,
    vendorId: input.vendorId ?? null,
    projectVendorId: input.projectVendorId ?? null,
    taskId: input.taskId ?? null,
    recipientUserIds: resolvedRecipients.map((user) => user.id),
    recipientEmails: resolvedRecipients.map((user) => user.email.toLowerCase()),
    recipientNames: resolvedRecipients.map((user) => user.name),
    mandatoryOversightRecipientEmails: mandatoryOversightUsers.map((user) =>
      user.email.toLowerCase(),
    ),
    createdCount: createdNotifications.length,
    href,
  });

  return createdNotifications;
}
