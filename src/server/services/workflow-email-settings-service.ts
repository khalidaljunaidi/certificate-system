import type { WorkflowEmailEvent } from "@prisma/client";

import { WORKFLOW_EMAIL_EVENT_OPTIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { WorkflowEmailSettingView } from "@/lib/types";
import { workflowEmailSettingSchema } from "@/lib/validation";
import type { z } from "zod";

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

function getDefaultSetting(event: WorkflowEmailEvent): WorkflowEmailSettingView {
  return {
    event,
    enabled: true,
    includeDefaultTo: true,
    includeDefaultCc: true,
    toEmails: [],
    ccEmails: [],
    updatedAt: null,
    updatedByName: null,
  };
}

export async function getWorkflowEmailSettings(): Promise<WorkflowEmailSettingView[]> {
  const settings = await prisma.workflowEmailSetting.findMany({
    include: {
      updatedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return WORKFLOW_EMAIL_EVENT_OPTIONS.map(({ value }) => {
    const existing = settings.find((setting) => setting.event === value);

    if (!existing) {
      return getDefaultSetting(value);
    }

    return {
      event: existing.event,
      enabled: existing.enabled,
      includeDefaultTo: existing.includeDefaultTo,
      includeDefaultCc: existing.includeDefaultCc,
      toEmails: existing.toEmails,
      ccEmails: existing.ccEmails,
      updatedAt: existing.updatedAt,
      updatedByName: existing.updatedBy?.name ?? null,
    };
  });
}

export async function updateWorkflowEmailSetting(
  userId: string,
  values: z.infer<typeof workflowEmailSettingSchema>,
) {
  return prisma.workflowEmailSetting.upsert({
    where: {
      event: values.event,
    },
    update: {
      enabled: values.enabled,
      includeDefaultTo: values.includeDefaultTo,
      includeDefaultCc: values.includeDefaultCc,
      toEmails: values.toEmails,
      ccEmails: values.ccEmails,
      updatedByUserId: userId,
    },
    create: {
      event: values.event,
      enabled: values.enabled,
      includeDefaultTo: values.includeDefaultTo,
      includeDefaultCc: values.includeDefaultCc,
      toEmails: values.toEmails,
      ccEmails: values.ccEmails,
      updatedByUserId: userId,
    },
  });
}

export async function resolveWorkflowEmailRecipients(input: {
  event: WorkflowEmailEvent;
  defaultTo: string[];
  defaultCc?: string[];
}) {
  const setting =
    (await prisma.workflowEmailSetting.findUnique({
      where: {
        event: input.event,
      },
    })) ?? null;

  const enabled = setting?.enabled ?? true;

  if (!enabled) {
    return {
      enabled: false,
      to: [] as string[],
      cc: [] as string[],
    };
  }

  const to = uniqueEmails([
    ...(setting?.includeDefaultTo ?? true ? input.defaultTo : []),
    ...(setting?.toEmails ?? []),
  ]);
  const cc = uniqueEmails(
    [
      ...(setting?.includeDefaultCc ?? true ? input.defaultCc ?? [] : []),
      ...(setting?.ccEmails ?? []),
    ],
    to,
  );

  return {
    enabled: true,
    to,
    cc,
  };
}
