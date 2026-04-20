import type { AuditAction, Prisma } from "@prisma/client";

type AuditInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  certificateId?: string | null;
  userId?: string | null;
  details?: Prisma.InputJsonValue;
};

export async function createAuditLog(
  tx: Prisma.TransactionClient,
  input: AuditInput,
) {
  return tx.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId ?? undefined,
      certificateId: input.certificateId ?? undefined,
      userId: input.userId ?? undefined,
      details: input.details,
    },
  });
}
