import { type PaymentAmountSource, Prisma } from "@prisma/client";

import { createAuditLog } from "@/server/services/audit-service";

type TransactionClient = Prisma.TransactionClient;

type PaymentAmountSyncReason =
  | "PO_CONTRACT_CREATED"
  | "PO_CONTRACT_UPDATED"
  | "CERTIFICATE_PM_APPROVED"
  | "CERTIFICATE_ISSUED"
  | "CERTIFICATE_REVOKED"
  | "CERTIFICATE_ARCHIVED"
  | "CERTIFICATE_UNARCHIVED";

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : null;
}

export async function syncProjectVendorPaymentAmount(
  tx: TransactionClient,
  input: {
    projectVendorId: string;
    userId?: string | null;
    reason: PaymentAmountSyncReason;
  },
) {
  const projectVendor = await tx.projectVendor.findUnique({
    where: {
      id: input.projectVendorId,
    },
    select: {
      id: true,
      projectId: true,
      poNumber: true,
      contractNumber: true,
      poAmount: true,
      paymentAmount: true,
      paymentAmountSource: true,
      paymentSourceCertificateId: true,
      project: {
        select: {
          projectName: true,
          projectCode: true,
        },
      },
      vendor: {
        select: {
          vendorId: true,
          vendorName: true,
        },
      },
    },
  });

  if (!projectVendor) {
    throw new Error("Project vendor assignment not found for payment synchronization.");
  }

  const nextPaymentAmount = projectVendor.poAmount ?? null;
  const nextPaymentAmountSource: PaymentAmountSource | null = projectVendor.poAmount
    ? "PO_CONTRACT"
    : null;
  const nextSourceCertificateId = null;

  const previousPaymentAmount = decimalToString(projectVendor.paymentAmount);
  const nextPaymentAmountString = decimalToString(nextPaymentAmount);

  const hasChanged =
    previousPaymentAmount !== nextPaymentAmountString ||
    projectVendor.paymentAmountSource !== nextPaymentAmountSource ||
    projectVendor.paymentSourceCertificateId !== nextSourceCertificateId;

  if (!hasChanged) {
    return {
      projectVendorId: projectVendor.id,
      paymentAmount: nextPaymentAmountString,
      paymentAmountSource: nextPaymentAmountSource,
      paymentSourceCertificateId: nextSourceCertificateId,
      paymentSourceCertificateCode: null,
    };
  }

  await tx.projectVendor.update({
    where: {
      id: projectVendor.id,
    },
    data: {
      paymentAmount: nextPaymentAmount,
      paymentAmountSource: nextPaymentAmountSource,
      paymentSourceCertificateId: nextSourceCertificateId,
      paymentAmountSyncedAt: new Date(),
    },
  });

  await createAuditLog(tx, {
    action: "UPDATED",
    entityType: "ProjectVendor",
    entityId: projectVendor.id,
    projectId: projectVendor.projectId,
    userId: input.userId ?? undefined,
    details: {
      projectVendorId: projectVendor.id,
      poNumber: projectVendor.poNumber,
      contractNumber: projectVendor.contractNumber,
      vendorId: projectVendor.vendor.vendorId,
      vendorName: projectVendor.vendor.vendorName,
      projectName: projectVendor.project.projectName,
      sourceSyncReason: input.reason,
      previousPaymentAmount,
      nextPaymentAmount: nextPaymentAmountString,
      previousPaymentAmountSource: projectVendor.paymentAmountSource,
      nextPaymentAmountSource,
      previousSourceCertificateId: projectVendor.paymentSourceCertificateId,
      nextSourceCertificateId,
      poAmount: decimalToString(projectVendor.poAmount),
    },
  });

  return {
    projectVendorId: projectVendor.id,
    paymentAmount: nextPaymentAmountString,
    paymentAmountSource: nextPaymentAmountSource,
    paymentSourceCertificateId: nextSourceCertificateId,
    paymentSourceCertificateCode: null,
  };
}
