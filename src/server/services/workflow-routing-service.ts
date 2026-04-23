import type { Prisma, WorkflowEmailEvent } from "@prisma/client";

import { PROCUREMENT_TEAM_EMAILS } from "@/lib/constants";
import type {
  WorkflowRoutingPolicy,
  WorkflowRoutingStrategy,
} from "@/lib/workflow-routing";
import { prisma } from "@/lib/prisma";

type RecipientReference = {
  userId?: string | null;
  email?: string | null;
};

export type WorkflowRoutingContext = {
  projectManager?: RecipientReference | null;
  assignedUser?: RecipientReference | null;
  evaluatedEmployee?: RecipientReference | null;
  entityOwner?: RecipientReference | null;
  procurementChainEmails?: string[];
  procurementChainUserIds?: string[];
  fallbackRecipientUserIds?: string[];
  fallbackRecipientEmails?: string[];
  fallbackToEmails?: string[];
  fallbackCcEmails?: string[];
  manualRecipientUserIds?: string[];
  manualRecipientEmails?: string[];
  manualToEmails?: string[];
  manualCcEmails?: string[];
};

type WorkflowEmailSettingRecord = {
  enabled: boolean;
  includeDefaultTo: boolean;
  includeDefaultCc: boolean;
  toEmails: string[];
  ccEmails: string[];
} | null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function uniqueEmails(
  emails: Array<string | null | undefined>,
  excluded: string[] = [],
) {
  const excludedSet = new Set(excluded.map(normalizeEmail));
  const values = new Set<string>();

  for (const email of emails) {
    if (!email) {
      continue;
    }

    const normalized = normalizeEmail(email);

    if (!normalized || excludedSet.has(normalized)) {
      continue;
    }

    values.add(normalized);
  }

  return [...values];
}

function uniqueUserIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter(Boolean) as string[])];
}

function collectEmailsForStrategy(
  strategy: WorkflowRoutingStrategy,
  lane: "to" | "cc",
  context: WorkflowRoutingContext,
) {
  switch (strategy) {
    case "project_manager":
      return uniqueEmails([context.projectManager?.email]);
    case "assigned_user":
      return uniqueEmails([context.assignedUser?.email]);
    case "evaluated_employee":
      return uniqueEmails([context.evaluatedEmployee?.email]);
    case "procurement_chain":
      return uniqueEmails(
        context.procurementChainEmails?.length
          ? context.procurementChainEmails
          : [...PROCUREMENT_TEAM_EMAILS],
      );
    case "entity_owner":
      return uniqueEmails([context.entityOwner?.email]);
    case "default_fallback":
      return uniqueEmails(
        lane === "to"
          ? [
              ...(context.fallbackToEmails ?? []),
              ...(context.fallbackRecipientEmails ?? []),
            ]
          : [
              ...(context.fallbackCcEmails ?? []),
              ...(context.fallbackRecipientEmails ?? []),
            ],
      );
    case "manual_override":
      return uniqueEmails(
        lane === "to"
          ? [...(context.manualToEmails ?? []), ...(context.manualRecipientEmails ?? [])]
          : [...(context.manualCcEmails ?? []), ...(context.manualRecipientEmails ?? [])],
      );
    default:
      return [];
  }
}

function collectUserReferencesForStrategy(
  strategy: WorkflowRoutingStrategy,
  context: WorkflowRoutingContext,
) {
  switch (strategy) {
    case "project_manager":
      return [context.projectManager ?? null];
    case "assigned_user":
      return [context.assignedUser ?? null];
    case "evaluated_employee":
      return [context.evaluatedEmployee ?? null];
    case "entity_owner":
      return [context.entityOwner ?? null];
    case "procurement_chain":
      return [
        ...(context.procurementChainUserIds ?? []).map((userId) => ({ userId })),
        ...(context.procurementChainEmails?.length
          ? context.procurementChainEmails
          : [...PROCUREMENT_TEAM_EMAILS]
        ).map((email) => ({ email })),
      ];
    case "default_fallback":
      return [
        ...(context.fallbackRecipientUserIds ?? []).map((userId) => ({ userId })),
        ...(context.fallbackRecipientEmails ?? []).map((email) => ({ email })),
      ];
    case "manual_override":
      return [
        ...(context.manualRecipientUserIds ?? []).map((userId) => ({ userId })),
        ...(context.manualRecipientEmails ?? []).map((email) => ({ email })),
      ];
    default:
      return [];
  }
}

async function getWorkflowEmailSetting(event: WorkflowEmailEvent) {
  return prisma.workflowEmailSetting.findUnique({
    where: {
      event,
    },
    select: {
      enabled: true,
      includeDefaultTo: true,
      includeDefaultCc: true,
      toEmails: true,
      ccEmails: true,
    },
  });
}

export async function resolveWorkflowEmailRouting(input: {
  event: WorkflowEmailEvent;
  policy: WorkflowRoutingPolicy;
  context: WorkflowRoutingContext;
}) {
  const setting = (await getWorkflowEmailSetting(input.event)) as WorkflowEmailSettingRecord;

  if (setting && !setting.enabled) {
    return {
      enabled: false,
      to: [] as string[],
      cc: [] as string[],
      usedFallbackTo: false,
      usedFallbackCc: false,
      resolvedPrimaryTo: [] as string[],
      resolvedPrimaryCc: [] as string[],
      resolvedFallbackTo: [] as string[],
      resolvedFallbackCc: [] as string[],
    };
  }

  const resolvedPrimaryTo = uniqueEmails(
    input.policy.primaryTo.flatMap((strategy) =>
      collectEmailsForStrategy(strategy, "to", input.context),
    ),
  );
  const resolvedPrimaryCc = uniqueEmails(
    input.policy.primaryCc.flatMap((strategy) =>
      collectEmailsForStrategy(strategy, "cc", input.context),
    ),
    resolvedPrimaryTo,
  );
  const manualToRecipients = uniqueEmails([
    ...(setting?.toEmails ?? []),
    ...(input.context.manualToEmails ?? []),
    ...(input.context.manualRecipientEmails ?? []),
  ]);
  const manualCcRecipients = uniqueEmails(
    [
      ...(setting?.ccEmails ?? []),
      ...(input.context.manualCcEmails ?? []),
      ...(input.context.manualRecipientEmails ?? []),
    ],
    [...resolvedPrimaryTo, ...manualToRecipients, ...resolvedPrimaryCc],
  );
  const to = uniqueEmails([...resolvedPrimaryTo, ...manualToRecipients]);
  const cc = uniqueEmails([...resolvedPrimaryCc, ...manualCcRecipients], to);

  return {
    enabled: true,
    to,
    cc,
    resolvedPrimaryTo,
    resolvedPrimaryCc,
    resolvedFallbackTo: [] as string[],
    resolvedFallbackCc: [] as string[],
    usedFallbackTo: false,
    usedFallbackCc: false,
  };
}

export async function resolveNotificationRecipientUserIds(
  tx: Prisma.TransactionClient,
  input: {
    strategies: WorkflowRoutingStrategy[];
    context: WorkflowRoutingContext;
  },
) {
  const references = input.strategies.flatMap((strategy) =>
    collectUserReferencesForStrategy(strategy, input.context),
  );
  const explicitUserIds = uniqueUserIds(references.map((reference) => reference?.userId));
  const explicitEmails = uniqueEmails(references.map((reference) => reference?.email));

  if (explicitUserIds.length === 0 && explicitEmails.length === 0) {
    return [];
  }

  const users = await tx.user.findMany({
    where: {
      isActive: true,
      OR: [
        ...(explicitUserIds.length > 0
          ? [
              {
                id: {
                  in: explicitUserIds,
                },
              },
            ]
          : []),
        ...(explicitEmails.length > 0
          ? [
              {
                email: {
                  in: explicitEmails,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return users;
}
