import { NotificationDeliveryStatus } from "@prisma/client";
import { createElement } from "react";

import { SupplierInvitationEmail } from "@/emails";
import { absoluteUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/server/services/audit-service";
import { logSystemError } from "@/server/services/system-error-service";
import { sendDirectWorkflowEmail } from "@/server/services/email-service";

type SupplierInvitationInput = {
  userId: string;
  userName: string;
  userEmail: string;
  values: {
    supplierCompanyName?: string;
    supplierContactEmail: string;
    supplierContactName?: string;
    suggestedCategoryId?: string;
    internalNote?: string;
    customMessage?: string;
  };
};

type SupplierInvitationDeliveryResult = {
  invitationId: string;
  registrationUrl: string;
  invitedEmail: string;
  emailDeliveryStatus: NotificationDeliveryStatus;
  emailDeliveryError?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendSupplierInvitation(
  input: SupplierInvitationInput,
): Promise<SupplierInvitationDeliveryResult> {
  const invitedEmail = normalizeEmail(input.values.supplierContactEmail);
  const registrationUrl = absoluteUrl("/supplier-registration");

  const suggestedCategory = input.values.suggestedCategoryId
    ? await prisma.vendorCategory.findUnique({
        where: {
          id: input.values.suggestedCategoryId,
        },
        select: {
          name: true,
        },
      })
    : null;

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.supplierInvitation.create({
      data: {
        supplierCompanyName: input.values.supplierCompanyName ?? null,
        supplierContactName: input.values.supplierContactName ?? null,
        supplierContactEmail: invitedEmail,
        suggestedCategoryId: input.values.suggestedCategoryId ?? null,
        internalNote: input.values.internalNote ?? null,
        customMessage: input.values.customMessage ?? null,
        registrationUrl,
        invitedByUserId: input.userId,
      },
      select: {
        id: true,
        invitedAt: true,
      },
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "SupplierInvitation",
      entityId: created.id,
      userId: input.userId,
      details: {
        invitedEmail,
        invitedByName: input.userName,
        invitedByEmail: input.userEmail,
        invitedAt: created.invitedAt,
        suggestedCategoryId: input.values.suggestedCategoryId ?? null,
      },
    });

    return created;
  });

  const introPieces = [
    input.values.customMessage?.trim(),
    "Please use the public supplier registration form below to submit your company details.",
    "Registration does not guarantee approval, purchase orders, contracts, or awards.",
  ].filter(Boolean);

  try {
    const emailResult = await sendDirectWorkflowEmail({
      label: "supplier-invitation",
      to: [invitedEmail],
      subject: `Invitation to Register as Supplier - ${input.values.supplierCompanyName ?? "The Gathering KSA"}`,
      react: createElement(SupplierInvitationEmail, {
        preview: "Supplier registration invitation",
        heading: "Invitation to Register as Supplier",
        intro: introPieces.join(" "),
        registrationUrl,
        companyName: input.values.supplierCompanyName ?? null,
        contactName: input.values.supplierContactName ?? null,
        suggestedCategory: suggestedCategory?.name ?? null,
        customMessage: input.values.customMessage ?? null,
      }),
      fallback: {
        heading: "Invitation to Register as Supplier",
        intro: introPieces.join(" "),
        rows: [
          { label: "Company", value: input.values.supplierCompanyName ?? null },
          { label: "Contact", value: input.values.supplierContactName ?? null },
          { label: "Email", value: invitedEmail },
          { label: "Suggested Category", value: suggestedCategory?.name ?? null },
        ],
        actionLabel: "Open Registration Form",
        actionUrl: registrationUrl,
        footerNote:
          "Registration does not guarantee approval, purchase orders, contracts, or awards.",
      },
      logContext: {
        invitationId: invitation.id,
        invitedEmail,
        invitedByName: input.userName,
        invitedByEmail: input.userEmail,
      },
    });

    const emailDeliveryStatus = "skipped" in emailResult
      ? NotificationDeliveryStatus.SKIPPED
      : NotificationDeliveryStatus.SENT;
    const emailSentAt = emailDeliveryStatus === NotificationDeliveryStatus.SENT
      ? new Date()
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.supplierInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          emailDeliveryStatus,
          emailSentAt,
          emailDeliveryError: null,
        },
      });

      await createAuditLog(tx, {
        action: "NOTIFICATION_DISPATCHED",
        entityType: "SupplierInvitation",
        entityId: invitation.id,
        userId: input.userId,
        details: {
          invitedEmail,
          emailDeliveryStatus,
          emailSentAt,
        },
      });
    });

    return {
      invitationId: invitation.id,
      emailDeliveryStatus,
      registrationUrl,
      invitedEmail,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown invitation delivery error";

    await prisma.$transaction(async (tx) => {
      await tx.supplierInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          emailDeliveryStatus: NotificationDeliveryStatus.FAILED,
          emailDeliveryError: errorMessage,
        },
      });

      await createAuditLog(tx, {
        action: "NOTIFICATION_DISPATCHED",
        entityType: "SupplierInvitation",
        entityId: invitation.id,
        userId: input.userId,
        details: {
          invitedEmail,
          emailDeliveryStatus: NotificationDeliveryStatus.FAILED,
          emailDeliveryError: errorMessage,
        },
      });
    });

    await logSystemError({
      action: "SupplierInvitationSend",
      error,
      userId: input.userId,
      severity: "ERROR",
      context: {
        invitationId: invitation.id,
        invitedEmail,
        invitedByName: input.userName,
        invitedByEmail: input.userEmail,
      },
    });

    return {
      invitationId: invitation.id,
      emailDeliveryStatus: NotificationDeliveryStatus.FAILED,
      registrationUrl,
      invitedEmail,
      emailDeliveryError: errorMessage,
    };
  }
}
