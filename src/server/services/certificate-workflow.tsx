import { Prisma } from "@prisma/client";
import type { z } from "zod";

import { CERTIFICATE_CODE_PREFIX } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, buildPmApprovalUrl, buildVerifyUrl } from "@/lib/utils";
import {
  archiveCertificateSchema,
  certificateDraftSchema,
  duplicateCertificateSchema,
  issueCertificateSchema,
  pmApprovalSchema,
  pmRejectionSchema,
  reopenCertificateSchema,
  revokeCertificateSchema,
  submitForPmApprovalSchema,
} from "@/lib/validation";
import { getCertificateForPdf } from "@/server/queries/certificate-queries";
import { createAuditLog } from "@/server/services/audit-service";
import {
  sendCertificateReopenedEmail,
  sendIssuedCertificateEmail,
  sendPmDecisionNotificationEmail,
  sendPmApprovalRequestEmail,
} from "@/server/services/email-service";
import { createWorkflowNotification } from "@/server/services/notification-service";
import { generateCertificatePdfBuffer } from "@/server/services/pdf-service";
import { uploadCertificatePdf } from "@/server/services/storage-service";
import {
  createPmApprovalToken,
  hashToken,
  invalidateOutstandingPmTokens,
} from "@/server/services/token-service";

const CERTIFICATE_CODE_SUFFIX_WIDTH = 3;
const CERTIFICATE_CODE_RETRY_LIMIT = 5;

async function getProjectVendorContext(
  tx: Prisma.TransactionClient,
  projectId: string,
  projectVendorId: string,
  vendorId: string,
) {
  const projectVendor = await tx.projectVendor.findUnique({
    where: {
      id: projectVendorId,
    },
    include: {
      project: true,
      vendor: true,
    },
  });

  if (
    !projectVendor ||
    !projectVendor.isActive ||
    projectVendor.projectId !== projectId ||
    projectVendor.vendorId !== vendorId
  ) {
    throw new Error("The selected vendor is not active for this project.");
  }

  return projectVendor;
}

async function generateCertificateCode(
  tx: Prisma.TransactionClient,
  projectId: string,
  projectCode: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${projectId})::bigint)
  `;

  const prefix = `${CERTIFICATE_CODE_PREFIX}-${projectCode}-`;
  const [row] = await tx.$queryRaw<Array<{ maxSuffix: number }>>`
    SELECT COALESCE(
      MAX((regexp_replace("certificateCode", '^.*-(\\d+)$', '\\1'))::int),
      0
    ) AS "maxSuffix"
    FROM "Certificate"
    WHERE "projectId" = ${projectId}
      AND "certificateCode" LIKE ${`${prefix}%`}
  `;

  let suffix = Number(row?.maxSuffix ?? 0);
  let collisionCount = 0;

  for (let attempt = 1; attempt <= CERTIFICATE_CODE_RETRY_LIMIT; attempt += 1) {
    const certificateCode = `${prefix}${String(suffix + 1).padStart(
      CERTIFICATE_CODE_SUFFIX_WIDTH,
      "0",
    )}`;

    const existing = await tx.certificate.findUnique({
      where: {
        certificateCode,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      if (collisionCount > 0) {
        console.warn("[certificate-workflow] certificate code collisions resolved", {
          projectId,
          projectCode,
          collisionCount,
          generatedCode: certificateCode,
        });
      }

      return {
        certificateCode,
        collisionCount,
      };
    }

    collisionCount += 1;
    suffix += 1;

    console.warn("[certificate-workflow] certificate code collision detected", {
      projectId,
      projectCode,
      attemptedCode: certificateCode,
      collisionCount,
      attempt,
    });
  }

  console.error("[certificate-workflow] certificate number generation exhausted retries", {
    projectId,
    projectCode,
    retryLimit: CERTIFICATE_CODE_RETRY_LIMIT,
  });

  throw new Error("Could not create certificate number. Please try again.");
}

export async function saveCertificateDraft(input: {
  userId: string;
  certificateId?: string;
  values: z.infer<typeof certificateDraftSchema>;
}) {
  console.info("[certificate-workflow] saveCertificateDraft called", {
    certificateId: input.certificateId ?? null,
    operation: input.certificateId ? "UPDATE" : "CREATE",
    projectId: input.values.projectId,
    projectVendorId: input.values.projectVendorId,
    vendorId: input.values.vendorId,
  });

  const payload = await prisma.$transaction(async (tx) => {
    const projectVendor = await getProjectVendorContext(
      tx,
      input.values.projectId,
      input.values.projectVendorId,
      input.values.vendorId,
    );

    if (input.certificateId) {
      const existing = await tx.certificate.findUnique({
        where: {
          id: input.certificateId,
        },
      });

      if (!existing) {
        throw new Error("Certificate not found.");
      }

      if (existing.isArchived) {
        throw new Error(
          "Archived certificates must be unarchived before they can be edited.",
        );
      }

      if (!["DRAFT", "PM_REJECTED", "REOPENED"].includes(existing.status)) {
        throw new Error(
          "Only reopened, draft, or PM-rejected certificates can be edited.",
        );
      }

      const isReopenedRevision = existing.status === "REOPENED";
      const nextStatus = isReopenedRevision ? "PENDING_PM_APPROVAL" : "DRAFT";
      const token = isReopenedRevision
        ? await createPmApprovalToken(tx, existing.id)
        : null;

      const updated = await tx.certificate.update({
        where: {
          id: input.certificateId,
        },
        data: {
          projectId: input.values.projectId,
          vendorId: input.values.vendorId,
          projectVendorId: input.values.projectVendorId,
          issueDate: input.values.issueDate,
          poNumber: input.values.poNumber,
          contractNumber: input.values.contractNumber,
          completionDate: input.values.completionDate,
          totalAmount: new Prisma.Decimal(input.values.totalAmount),
          executedScopeSummary: input.values.executedScopeSummary,
          clientName: input.values.clientName,
          clientTitle: input.values.clientTitle,
          approverName: input.values.approverName,
          approverTitle: input.values.approverTitle,
          pmEmail: input.values.pmEmail,
          pmName: null,
          pmTitle: null,
          pmApprovedAt: null,
          approvalNotes: null,
          status: nextStatus,
        },
      });

      await createAuditLog(tx, {
        action: "UPDATED",
        entityType: "Certificate",
        entityId: updated.id,
        certificateId: updated.id,
        projectId: updated.projectId,
        userId: input.userId,
        details: {
          certificateCode: updated.certificateCode,
          projectVendorId: projectVendor.id,
          revisionRestarted: isReopenedRevision,
        },
      });

      await createWorkflowNotification(tx, {
        type: "CERTIFICATE_UPDATED",
        title: "Certificate updated",
        message: `${projectVendor.vendor.vendorName} certificate details were updated under ${projectVendor.project.projectName}.`,
        projectId: updated.projectId,
        vendorId: updated.vendorId,
        projectVendorId: updated.projectVendorId,
        certificateId: updated.id,
        routingStrategies: ["project_manager", "procurement_chain"],
        routingContext: {
          projectManager: {
            email: updated.pmEmail,
          },
        },
      });

      if (isReopenedRevision && token) {
        await createAuditLog(tx, {
          action: "SENT_FOR_PM_APPROVAL",
          entityType: "Certificate",
          entityId: updated.id,
          certificateId: updated.id,
          projectId: updated.projectId,
          userId: input.userId,
          details: {
            pmEmail: updated.pmEmail,
            expiresAt: token.expiresAt.toISOString(),
            restartedFromRevision: true,
          },
        });

        await createWorkflowNotification(tx, {
          type: "SENT_FOR_PM_APPROVAL",
          title: "Revision sent for PM approval",
          message: `${projectVendor.vendor.vendorName} revised certificate was sent for PM approval under ${projectVendor.project.projectName}.`,
          projectId: updated.projectId,
          vendorId: updated.vendorId,
          projectVendorId: updated.projectVendorId,
          certificateId: updated.id,
          routingStrategies: ["project_manager", "procurement_chain"],
          routingContext: {
            projectManager: {
              email: updated.pmEmail,
            },
          },
        });
      }

      console.info("[certificate-workflow] certificate updated", {
        certificateId: updated.id,
        certificateCode: updated.certificateCode,
        status: updated.status,
        operation: "UPDATE",
      });

      return {
        certificate: updated,
        pmApprovalPayload:
          isReopenedRevision && token
            ? {
                approvalUrl: buildPmApprovalUrl(token.rawToken),
                contractNumber: updated.contractNumber,
                pmEmail: updated.pmEmail ?? "",
                poNumber: updated.poNumber,
                projectName: projectVendor.project.projectName,
                vendorName: projectVendor.vendor.vendorName,
              }
            : null,
      };
    }

    const certificateCodeResult = await generateCertificateCode(
      tx,
      input.values.projectId,
      projectVendor.project.projectCode,
    );

    const created = await tx.certificate.create({
      data: {
        certificateCode: certificateCodeResult.certificateCode,
        projectId: input.values.projectId,
        vendorId: input.values.vendorId,
        projectVendorId: input.values.projectVendorId,
        issueDate: input.values.issueDate,
        poNumber: input.values.poNumber,
        contractNumber: input.values.contractNumber,
        completionDate: input.values.completionDate,
        totalAmount: new Prisma.Decimal(input.values.totalAmount),
        executedScopeSummary: input.values.executedScopeSummary,
        clientName: input.values.clientName,
        clientTitle: input.values.clientTitle,
        approverName: input.values.approverName,
        approverTitle: input.values.approverTitle,
        pmEmail: input.values.pmEmail,
        createdById: input.userId,
      },
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "Certificate",
        entityId: created.id,
        certificateId: created.id,
        projectId: created.projectId,
        userId: input.userId,
        details: {
          certificateCode: created.certificateCode,
          certificateCodeCollisionCount: certificateCodeResult.collisionCount,
          vendorName: projectVendor.vendor.vendorName,
        },
      });

    await createWorkflowNotification(tx, {
      type: "CERTIFICATE_CREATED",
      title: "Certificate created",
      message: `${projectVendor.vendor.vendorName} draft certificate was created under ${projectVendor.project.projectName}.`,
      projectId: created.projectId,
      vendorId: created.vendorId,
      projectVendorId: created.projectVendorId,
      certificateId: created.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: created.pmEmail,
        },
      },
    });

    console.info("[certificate-workflow] certificate created", {
      certificateId: created.id,
      certificateCode: created.certificateCode,
      status: created.status,
      operation: "CREATE",
      certificateCodeCollisionCount: certificateCodeResult.collisionCount,
    });

    return {
      certificate: created,
      pmApprovalPayload: null,
    };
  });

  if (payload.pmApprovalPayload) {
    await sendPmApprovalRequestEmail({
      to: payload.pmApprovalPayload.pmEmail,
      approvalUrl: payload.pmApprovalPayload.approvalUrl,
      projectName: payload.pmApprovalPayload.projectName,
      vendorName: payload.pmApprovalPayload.vendorName,
      poNumber: payload.pmApprovalPayload.poNumber,
      contractNumber: payload.pmApprovalPayload.contractNumber,
    });
  }

  return payload.certificate;
}

export async function duplicateCertificateDraft(input: {
  userId: string;
  values: z.infer<typeof duplicateCertificateSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.certificate.findUnique({
      where: { id: input.values.certificateId },
      include: {
        project: true,
        vendor: true,
      },
    });

    if (!source) {
      throw new Error("Certificate not found.");
    }

    const certificateCodeResult = await generateCertificateCode(
      tx,
      source.projectId,
      source.project.projectCode,
    );

    const duplicate = await tx.certificate.create({
      data: {
        certificateCode: certificateCodeResult.certificateCode,
        projectId: source.projectId,
        vendorId: source.vendorId,
        projectVendorId: source.projectVendorId,
        issueDate: source.issueDate,
        poNumber: source.poNumber,
        contractNumber: source.contractNumber,
        completionDate: source.completionDate,
        totalAmount: source.totalAmount,
        executedScopeSummary: source.executedScopeSummary,
        clientName: source.clientName,
        clientTitle: source.clientTitle,
        approverName: source.approverName,
        approverTitle: source.approverTitle,
        pmEmail: source.pmEmail,
        createdById: input.userId,
      },
    });

    await createAuditLog(tx, {
      action: "DUPLICATED",
      entityType: "Certificate",
        entityId: duplicate.id,
        certificateId: duplicate.id,
        projectId: duplicate.projectId,
        userId: input.userId,
        details: {
          sourceCertificateId: source.id,
          sourceCertificateCode: source.certificateCode,
          certificateCodeCollisionCount: certificateCodeResult.collisionCount,
        },
      });

    await createWorkflowNotification(tx, {
      type: "CERTIFICATE_CREATED",
      title: "Certificate duplicated into draft",
      message: `${source.vendor.vendorName} certificate content was duplicated into a new draft for ${source.project.projectName}.`,
      projectId: duplicate.projectId,
      vendorId: duplicate.vendorId,
      projectVendorId: duplicate.projectVendorId,
      certificateId: duplicate.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: duplicate.pmEmail,
        },
      },
    });

    return duplicate;
  });
}

export async function submitCertificateForPmApproval(input: {
  userId: string;
  values: z.infer<typeof submitForPmApprovalSchema>;
}) {
  const payload = await prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: {
        id: input.values.certificateId,
      },
      include: {
        project: true,
        vendor: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found.");
    }

    if (certificate.isArchived) {
      throw new Error(
        "Archived certificates must be unarchived before they can be sent for PM approval.",
      );
    }

    if (
      !["DRAFT", "PM_REJECTED", "PENDING_PM_APPROVAL"].includes(
        certificate.status,
      )
    ) {
      throw new Error("This certificate cannot be sent for PM approval.");
    }

    if (!certificate.pmEmail) {
      throw new Error("A Project Manager email is required before submission.");
    }

    const token = await createPmApprovalToken(tx, certificate.id);

    await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        status: "PENDING_PM_APPROVAL",
      },
    });

    await createAuditLog(tx, {
      action: "SENT_FOR_PM_APPROVAL",
      entityType: "Certificate",
      entityId: certificate.id,
      certificateId: certificate.id,
      projectId: certificate.projectId,
      userId: input.userId,
      details: {
        pmEmail: certificate.pmEmail,
        expiresAt: token.expiresAt.toISOString(),
      },
    });

    await createWorkflowNotification(tx, {
      type: "SENT_FOR_PM_APPROVAL",
      title: "Sent for PM approval",
      message: `${certificate.vendor.vendorName} certificate was sent for PM approval under ${certificate.project.projectName}.`,
      projectId: certificate.projectId,
      vendorId: certificate.vendorId,
      projectVendorId: certificate.projectVendorId,
      certificateId: certificate.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: certificate.pmEmail,
        },
      },
    });

    return {
      certificateId: certificate.id,
      projectName: certificate.project.projectName,
      vendorName: certificate.vendor.vendorName,
      poNumber: certificate.poNumber,
      contractNumber: certificate.contractNumber,
      pmEmail: certificate.pmEmail,
      approvalUrl: buildPmApprovalUrl(token.rawToken),
    };
  });

  await sendPmApprovalRequestEmail({
    to: payload.pmEmail,
    approvalUrl: payload.approvalUrl,
    projectName: payload.projectName,
    vendorName: payload.vendorName,
    poNumber: payload.poNumber,
    contractNumber: payload.contractNumber,
  });

  return payload;
}

export async function forceApproveCertificateByExecutive(input: {
  userId: string;
  userName: string;
  userTitle: string;
  overrideReason: string;
  values: {
    certificateId: string;
  };
}) {
  const payload = await prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: {
        id: input.values.certificateId,
      },
      include: {
        project: true,
        vendor: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found.");
    }

    if (certificate.isArchived) {
      throw new Error(
        "Archived certificates must be unarchived before an override can be applied.",
      );
    }

    if (certificate.status !== "PENDING_PM_APPROVAL") {
      throw new Error("Only pending PM approval certificates can be bypassed.");
    }

    const approvedAt = new Date();
    const updated = await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        status: "PM_APPROVED",
        pmName: input.userName,
        pmTitle: input.userTitle,
        pmApprovedAt: approvedAt,
        approvalNotes: input.overrideReason,
      },
    });

    await invalidateOutstandingPmTokens(tx, updated.id);

    await createAuditLog(tx, {
      action: "PM_APPROVED",
      entityType: "Certificate",
      entityId: updated.id,
      certificateId: updated.id,
      projectId: updated.projectId,
      userId: input.userId,
      details: {
        previousStatus: certificate.status,
        nextStatus: updated.status,
        overrideReason: input.overrideReason,
        overrideByName: input.userName,
        overrideByTitle: input.userTitle,
        bypassedStep: "PM_APPROVAL",
        approvedAt: approvedAt.toISOString(),
      },
    });

    await createWorkflowNotification(tx, {
      type: "PM_APPROVED",
      title: "Certificate approved by executive override",
      message: `${certificate.vendor.vendorName} certificate under ${certificate.project.projectName} was advanced to PM approved by Khaled without waiting for the pending approval step.`,
      projectId: updated.projectId,
      vendorId: updated.vendorId,
      projectVendorId: updated.projectVendorId,
      certificateId: updated.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: certificate.pmEmail,
        },
      },
      severity: "WARNING",
    });

    return {
      certificate: updated,
      projectName: certificate.project.projectName,
      vendorName: certificate.vendor.vendorName,
    };
  });

  return payload;
}

export async function approveCertificateByToken(input: {
  values: z.infer<typeof pmApprovalSchema>;
}) {
  const payload = await prisma.$transaction(async (tx) => {
    const approvalToken = await tx.approvalToken.findUnique({
      where: {
        tokenHash: hashToken(input.values.token),
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
      throw new Error("This approval link is invalid.");
    }

    if (
      approvalToken.usedAt ||
      approvalToken.invalidatedAt ||
      approvalToken.expiresAt < new Date()
    ) {
      throw new Error("This approval link has expired or was already used.");
    }

    if (approvalToken.certificate.status !== "PENDING_PM_APPROVAL") {
      throw new Error("This certificate is no longer awaiting PM approval.");
    }

    const approvedAt = new Date();

    const certificate = await tx.certificate.update({
      where: {
        id: approvalToken.certificate.id,
      },
      data: {
        status: "PM_APPROVED",
        pmName: input.values.pmName,
        pmTitle: input.values.pmTitle,
        approvalNotes: input.values.approvalNotes,
        pmApprovedAt: approvedAt,
      },
    });

    await tx.approvalToken.update({
      where: {
        id: approvalToken.id,
      },
      data: {
        usedAt: approvedAt,
      },
    });

    await invalidateOutstandingPmTokens(tx, certificate.id);

    await createAuditLog(tx, {
      action: "PM_APPROVED",
      entityType: "Certificate",
      entityId: certificate.id,
      certificateId: certificate.id,
      projectId: certificate.projectId,
      details: {
        pmName: input.values.pmName,
        pmTitle: input.values.pmTitle,
      },
    });

    await createWorkflowNotification(tx, {
      type: "PM_APPROVED",
      title: "Project Manager approved certificate",
      message: `${approvalToken.certificate.vendor.vendorName} certificate was approved by the Project Manager under ${approvalToken.certificate.project.projectName}.`,
      projectId: certificate.projectId,
      vendorId: certificate.vendorId,
      projectVendorId: certificate.projectVendorId,
      certificateId: certificate.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: approvalToken.certificate.pmEmail,
        },
      },
    });

    return {
      projectName: approvalToken.certificate.project.projectName,
      vendorName: approvalToken.certificate.vendor.vendorName,
      approvalNotes: input.values.approvalNotes,
    };
  });

  await sendPmDecisionNotificationEmail({
    projectName: payload.projectName,
    vendorName: payload.vendorName,
    statusText: "approved",
    notes: payload.approvalNotes,
  });
}

export async function rejectCertificateByToken(input: {
  values: z.infer<typeof pmRejectionSchema>;
}) {
  const payload = await prisma.$transaction(async (tx) => {
    const approvalToken = await tx.approvalToken.findUnique({
      where: {
        tokenHash: hashToken(input.values.token),
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
      throw new Error("This approval link is invalid.");
    }

    if (
      approvalToken.usedAt ||
      approvalToken.invalidatedAt ||
      approvalToken.expiresAt < new Date()
    ) {
      throw new Error("This approval link has expired or was already used.");
    }

    if (approvalToken.certificate.status !== "PENDING_PM_APPROVAL") {
      throw new Error("This certificate is no longer awaiting PM approval.");
    }

    const rejectedAt = new Date();

    const certificate = await tx.certificate.update({
      where: {
        id: approvalToken.certificate.id,
      },
      data: {
        status: "PM_REJECTED",
        pmName: input.values.pmName,
        pmTitle: input.values.pmTitle,
        approvalNotes: input.values.approvalNotes,
        pmApprovedAt: null,
      },
    });

    await tx.approvalToken.update({
      where: {
        id: approvalToken.id,
      },
      data: {
        usedAt: rejectedAt,
      },
    });

    await invalidateOutstandingPmTokens(tx, certificate.id);

    await createAuditLog(tx, {
      action: "PM_REJECTED",
      entityType: "Certificate",
      entityId: certificate.id,
      certificateId: certificate.id,
      projectId: certificate.projectId,
      details: {
        pmName: input.values.pmName,
        pmTitle: input.values.pmTitle,
        notes: input.values.approvalNotes,
      },
    });

    await createWorkflowNotification(tx, {
      type: "PM_REJECTED",
      title: "Project Manager rejected certificate",
      message: `${approvalToken.certificate.vendor.vendorName} certificate was rejected by the Project Manager under ${approvalToken.certificate.project.projectName}.`,
      projectId: certificate.projectId,
      vendorId: certificate.vendorId,
      projectVendorId: certificate.projectVendorId,
      certificateId: certificate.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: approvalToken.certificate.pmEmail,
        },
      },
    });

    return {
      projectName: approvalToken.certificate.project.projectName,
      vendorName: approvalToken.certificate.vendor.vendorName,
      approvalNotes: input.values.approvalNotes,
    };
  });

  await sendPmDecisionNotificationEmail({
    projectName: payload.projectName,
    vendorName: payload.vendorName,
    statusText: "rejected",
    notes: payload.approvalNotes,
  });
}

export async function issueCertificate(input: {
  userId: string;
  values: z.infer<typeof issueCertificateSchema>;
}) {
  const certificate = await getCertificateForPdf(input.values.certificateId);

  if (!certificate) {
    throw new Error("Certificate not found.");
  }

  if (certificate.isArchived) {
    throw new Error(
      "Archived certificates must be unarchived before they can be issued.",
    );
  }

  if (certificate.status !== "PM_APPROVED") {
    throw new Error("Only PM-approved certificates can be issued.");
  }

  const pdfBuffer = await generateCertificatePdfBuffer(certificate);
  const uploadResult = await uploadCertificatePdf(
    certificate.certificateCode,
    pdfBuffer,
  );
  const verificationUrl = buildVerifyUrl(certificate.certificateCode);
  const stablePdfUrl = `/api/certificates/${certificate.id}/pdf`;

  const payload = await prisma.$transaction(async (tx) => {
    const issuedAt = new Date();
    const isReissue = Boolean(certificate.issuedAt);

    const updated = await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        status: "ISSUED",
        issuedAt,
        pdfUrl: stablePdfUrl,
        pdfStoragePath: uploadResult.path,
      },
    });

    await createAuditLog(tx, {
      action: isReissue ? "REISSUED" : "ISSUED",
      entityType: "Certificate",
      entityId: updated.id,
      certificateId: updated.id,
      projectId: updated.projectId,
      userId: input.userId,
      details: {
        pdfStoragePath: uploadResult.path,
        reissued: isReissue,
      },
    });

    await createWorkflowNotification(tx, {
      type: "CERTIFICATE_ISSUED",
      title: isReissue ? "Certificate reissued" : "Certificate issued",
      message: `${certificate.vendor.vendorName} certificate was ${isReissue ? "reissued" : "issued"} under ${certificate.project.projectName}.`,
      projectId: updated.projectId,
      vendorId: updated.vendorId,
      projectVendorId: updated.projectVendorId,
      certificateId: updated.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: certificate.pmEmail,
        },
      },
    });

    return {
      isReissue,
      projectName: certificate.project.projectName,
      vendorName: certificate.vendor.vendorName,
      vendorEmail: certificate.vendor.vendorEmail,
      certificateCode: certificate.certificateCode,
      pmEmail: certificate.pmEmail,
    };
  });

  await sendIssuedCertificateEmail({
    to: payload.vendorEmail,
    cc: payload.pmEmail ? [payload.pmEmail] : [],
    projectName: payload.projectName,
    vendorName: payload.vendorName,
    certificateCode: payload.certificateCode,
    verificationUrl,
    pdfBuffer,
  });

  return {
    pdfUrl: stablePdfUrl,
  };
}

export async function reopenCertificate(input: {
  userId: string;
  userName: string;
  values: z.infer<typeof reopenCertificateSchema>;
}) {
  const payload = await prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: {
        id: input.values.certificateId,
      },
      include: {
        project: true,
        vendor: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found.");
    }

    if (certificate.isArchived) {
      throw new Error(
        "Archived certificates must be unarchived before they can be reopened.",
      );
    }

    if (certificate.status !== "ISSUED") {
      throw new Error("Only issued certificates can be reopened for revision.");
    }

    const reopened = await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        status: "REOPENED",
        pmApprovedAt: null,
        approvalNotes: null,
        pdfUrl: null,
        pdfStoragePath: null,
      },
    });

    await invalidateOutstandingPmTokens(tx, reopened.id);

    await createAuditLog(tx, {
      action: "REOPENED",
      entityType: "Certificate",
      entityId: reopened.id,
      certificateId: reopened.id,
      projectId: reopened.projectId,
      userId: input.userId,
      details: {
        certificateCode: reopened.certificateCode,
        message: "Certificate reopened for revision",
        previousIssuedAt: certificate.issuedAt?.toISOString() ?? null,
      },
    });

    await createWorkflowNotification(tx, {
      type: "CERTIFICATE_REOPENED",
      title: "Certificate reopened for revision",
      message: `${certificate.vendor.vendorName} certificate was reopened for revision under ${certificate.project.projectName}.`,
      projectId: reopened.projectId,
      vendorId: reopened.vendorId,
      projectVendorId: reopened.projectVendorId,
      certificateId: reopened.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: certificate.pmEmail,
        },
      },
    });

    return {
      certificateCode: reopened.certificateCode,
      certificateId: reopened.id,
      projectId: reopened.projectId,
      projectName: certificate.project.projectName,
      pmEmail: certificate.pmEmail,
      reopenUrl: absoluteUrl(
        `/admin/projects/${reopened.projectId}/certificates/${reopened.id}`,
      ),
      vendorName: certificate.vendor.vendorName,
    };
  });

  await sendCertificateReopenedEmail({
    projectName: payload.projectName,
    vendorName: payload.vendorName,
    certificateCode: payload.certificateCode,
    reopenedByName: input.userName,
    reopenUrl: payload.reopenUrl,
    projectManagerEmail: payload.pmEmail,
  });

  return payload;
}

export async function revokeCertificate(input: {
  userId: string;
  values: z.infer<typeof revokeCertificateSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: {
        id: input.values.certificateId,
      },
      include: {
        project: true,
        vendor: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found.");
    }

    if (certificate.isArchived) {
      throw new Error(
        "Archived certificates must be unarchived before they can be revoked.",
      );
    }

    if (certificate.status !== "ISSUED") {
      throw new Error("Only issued certificates can be revoked.");
    }

    const revokedAt = new Date();

    const revoked = await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        status: "REVOKED",
        revokedAt,
        revokedReason: input.values.revokedReason,
      },
    });

    await createAuditLog(tx, {
      action: "REVOKED",
      entityType: "Certificate",
      entityId: revoked.id,
      certificateId: revoked.id,
      projectId: revoked.projectId,
      userId: input.userId,
      details: {
        revokedReason: input.values.revokedReason,
      },
    });

    await createWorkflowNotification(tx, {
      type: "CERTIFICATE_REVOKED",
      title: "Certificate revoked",
      message: `${certificate.vendor.vendorName} certificate was revoked under ${certificate.project.projectName}.`,
      projectId: revoked.projectId,
      vendorId: revoked.vendorId,
      projectVendorId: revoked.projectVendorId,
      certificateId: revoked.id,
      routingStrategies: ["project_manager", "procurement_chain"],
      routingContext: {
        projectManager: {
          email: certificate.pmEmail,
        },
      },
    });

    return revoked;
  });
}

export async function archiveCertificate(input: {
  userId: string;
  values: z.infer<typeof archiveCertificateSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: {
        id: input.values.certificateId,
      },
      include: {
        project: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found.");
    }

    if (certificate.isArchived) {
      throw new Error("Certificate is already archived.");
    }

    const archivedAt = new Date();

    const archived = await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        isArchived: true,
        archivedAt,
      },
    });

    await invalidateOutstandingPmTokens(tx, archived.id);

    await createAuditLog(tx, {
      action: "ARCHIVED",
      entityType: "Certificate",
      entityId: archived.id,
      certificateId: archived.id,
      projectId: archived.projectId,
      userId: input.userId,
      details: {
        certificateCode: archived.certificateCode,
        archivedAt: archivedAt.toISOString(),
      },
    });

    return archived;
  });
}

export async function unarchiveCertificate(input: {
  userId: string;
  values: z.infer<typeof archiveCertificateSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: {
        id: input.values.certificateId,
      },
      include: {
        project: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found.");
    }

    if (!certificate.isArchived) {
      throw new Error("Certificate is not archived.");
    }

    const unarchived = await tx.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    await createAuditLog(tx, {
      action: "UNARCHIVED",
      entityType: "Certificate",
      entityId: unarchived.id,
      certificateId: unarchived.id,
      projectId: unarchived.projectId,
      userId: input.userId,
      details: {
        certificateCode: unarchived.certificateCode,
      },
    });

    return unarchived;
  });
}
