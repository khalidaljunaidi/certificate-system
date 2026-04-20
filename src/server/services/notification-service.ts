import type { NotificationType, Prisma } from "@prisma/client";

import { PROCUREMENT_TEAM_EMAILS } from "@/lib/constants";

type WorkflowNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string | null;
  certificateId?: string | null;
  recipientUserIds?: string[];
  includeProcurementTeam?: boolean;
};

export async function createWorkflowNotification(
  tx: Prisma.TransactionClient,
  input: WorkflowNotificationInput,
) {
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
    console.warn("[notification] workflow notification skipped", {
      type: input.type,
      title: input.title,
      projectId: input.projectId ?? null,
      certificateId: input.certificateId ?? null,
      requestedRecipientUserIds: input.recipientUserIds ?? [],
      includeProcurementTeam: input.includeProcurementTeam ?? true,
      reason: "NO_RECIPIENT_FILTERS",
    });
    return [];
  }

  const recipientUsers = await tx.user.findMany({
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

  const recipientIds = [...new Set(recipientUsers.map((user) => user.id))];

  if (recipientIds.length === 0) {
    console.warn("[notification] workflow notification skipped", {
      type: input.type,
      title: input.title,
      projectId: input.projectId ?? null,
      certificateId: input.certificateId ?? null,
      requestedRecipientUserIds: input.recipientUserIds ?? [],
      includeProcurementTeam: input.includeProcurementTeam ?? true,
      reason: "NO_ACTIVE_RECIPIENTS",
    });
    return [];
  }

  const missingProcurementEmails =
    input.includeProcurementTeam ?? true
      ? [...PROCUREMENT_TEAM_EMAILS].filter(
          (email) =>
            !recipientUsers.some(
              (recipient) => recipient.email.toLowerCase() === email,
            ),
        )
      : [];

  if (missingProcurementEmails.length > 0) {
    console.warn("[notification] procurement recipients missing", {
      type: input.type,
      missingProcurementEmails,
      projectId: input.projectId ?? null,
      certificateId: input.certificateId ?? null,
    });
  }

  const createdNotifications = await Promise.all(
    recipientIds.map((userId) =>
      tx.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          message: input.message,
          relatedProjectId: input.projectId ?? undefined,
          relatedCertificateId: input.certificateId ?? undefined,
        },
      }),
    ),
  );

  console.info("[notification] workflow notification created", {
    type: input.type,
    title: input.title,
    projectId: input.projectId ?? null,
    certificateId: input.certificateId ?? null,
    recipientUserIds: recipientUsers.map((user) => user.id),
    recipientEmails: recipientUsers.map((user) => user.email.toLowerCase()),
    recipientNames: recipientUsers.map((user) => user.name),
    createdCount: createdNotifications.length,
  });

  return createdNotifications;
}
