import { prisma } from "@/lib/prisma";
import { hashToken } from "@/server/services/token-service";

export async function getPmApprovalViewByToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const approvalToken = await prisma.approvalToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      certificate: {
        include: {
          project: true,
          vendor: true,
        },
      },
    },
  });

  if (!approvalToken) {
    return {
      tokenStatus: "invalid" as const,
      decisionStatus: null,
      certificateId: "",
      certificateCode: "",
      projectName: "",
      projectCode: "",
      vendorName: "",
      poNumber: "",
      contractNumber: null,
      completionDate: new Date(),
      totalAmount: "0",
      executedScopeSummary: "",
      pmEmail: null,
      expiresAt: null,
      status: null,
    };
  }

  const decisionStatus =
    approvalToken.certificate.status === "PM_APPROVED"
      ? "approved"
      : approvalToken.certificate.status === "PM_REJECTED"
        ? "rejected"
        : null;

  const tokenStatus =
    approvalToken.usedAt && decisionStatus
      ? "used"
      : approvalToken.invalidatedAt || approvalToken.certificate.status !== "PENDING_PM_APPROVAL"
        ? "processed"
        : approvalToken.expiresAt < new Date()
          ? "expired"
          : "valid";

  return {
    tokenStatus,
    decisionStatus,
    certificateId: approvalToken.certificate.id,
    certificateCode: approvalToken.certificate.certificateCode,
    projectName: approvalToken.certificate.project.projectName,
    projectCode: approvalToken.certificate.project.projectCode,
    vendorName: approvalToken.certificate.vendor.vendorName,
    poNumber: approvalToken.certificate.poNumber,
    contractNumber: approvalToken.certificate.contractNumber,
    completionDate: approvalToken.certificate.completionDate,
    totalAmount: approvalToken.certificate.totalAmount.toString(),
    executedScopeSummary: approvalToken.certificate.executedScopeSummary,
    pmEmail: approvalToken.certificate.pmEmail,
    expiresAt: approvalToken.expiresAt,
    status: approvalToken.certificate.status,
  };
}

export async function getVerificationView(certificateCode: string) {
  return prisma.certificate.findUnique({
    where: {
      certificateCode,
    },
    include: {
      project: {
        select: {
          projectName: true,
          projectCode: true,
        },
      },
      vendor: {
        select: {
          vendorName: true,
        },
      },
    },
  });
}
