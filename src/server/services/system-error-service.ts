import type { Prisma, SystemErrorSeverity } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { SystemErrorLogView } from "@/lib/types";

function stringifyContext(context: unknown): Prisma.InputJsonValue | undefined {
  if (context === undefined) {
    return undefined;
  }

  if (context === null) {
    return undefined;
  }

  if (typeof context === "string") {
    return context;
  }

  if (typeof context === "number" || typeof context === "boolean") {
    return context;
  }

  try {
    return JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export async function logSystemError(input: {
  action: string;
  error: unknown;
  userId?: string | null;
  severity?: SystemErrorSeverity;
  context?: unknown;
}) {
  const error =
    input.error instanceof Error
      ? input.error
      : new Error(typeof input.error === "string" ? input.error : "Unknown error");

  return prisma.systemErrorLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      errorName: error.name || null,
      errorMessage: error.message,
      stackTrace: error.stack ?? null,
      severity: input.severity ?? "ERROR",
      context: stringifyContext(input.context),
    },
  });
}

export async function getSystemErrorLogs(limit = 100): Promise<SystemErrorLogView[]> {
  const logs = await prisma.systemErrorLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      userId: true,
      action: true,
      errorName: true,
      errorMessage: true,
      stackTrace: true,
      severity: true,
      context: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.user?.name ?? null,
    action: log.action,
    errorName: log.errorName,
    errorMessage: log.errorMessage,
    stackTrace: log.stackTrace,
    severity: log.severity,
    context: log.context,
    createdAt: log.createdAt,
  }));
}
