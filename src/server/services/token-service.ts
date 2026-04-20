import crypto from "node:crypto";
import { addDays } from "date-fns";
import type { Prisma } from "@prisma/client";

import { DEFAULT_PM_TOKEN_TTL_DAYS } from "@/lib/constants";

export function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function invalidateOutstandingPmTokens(
  tx: Prisma.TransactionClient,
  certificateId: string,
) {
  await tx.approvalToken.updateMany({
    where: {
      certificateId,
      usedAt: null,
      invalidatedAt: null,
    },
    data: {
      invalidatedAt: new Date(),
    },
  });
}

export async function createPmApprovalToken(
  tx: Prisma.TransactionClient,
  certificateId: string,
) {
  await invalidateOutstandingPmTokens(tx, certificateId);

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = addDays(new Date(), DEFAULT_PM_TOKEN_TTL_DAYS);

  await tx.approvalToken.create({
    data: {
      certificateId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  return {
    rawToken,
    expiresAt,
  };
}
