import type { Prisma } from "@prisma/client";

import type { SupplierInvitationView } from "@/lib/types";
import { prisma } from "@/lib/prisma";

function getSupplierInvitationSelect() {
  return {
    id: true,
    supplierCompanyName: true,
    supplierContactName: true,
    supplierContactEmail: true,
    suggestedCategoryId: true,
    internalNote: true,
    customMessage: true,
    registrationUrl: true,
    invitedByUserId: true,
    invitedAt: true,
    emailSentAt: true,
    emailDeliveryStatus: true,
    emailDeliveryError: true,
    invitedBy: {
      select: {
        name: true,
      },
    },
    suggestedCategory: {
      select: {
        name: true,
      },
    },
  } as const;
}

type SupplierInvitationRecord = Prisma.SupplierInvitationGetPayload<{
  select: ReturnType<typeof getSupplierInvitationSelect>;
}>;

function mapInvitation(
  invitation: SupplierInvitationRecord,
): SupplierInvitationView {
  return {
    id: invitation.id,
    supplierCompanyName: invitation.supplierCompanyName,
    supplierContactName: invitation.supplierContactName,
    supplierContactEmail: invitation.supplierContactEmail,
    suggestedCategoryId: invitation.suggestedCategoryId,
    suggestedCategoryName: invitation.suggestedCategory?.name ?? null,
    internalNote: invitation.internalNote,
    customMessage: invitation.customMessage,
    registrationUrl: invitation.registrationUrl,
    invitedByUserId: invitation.invitedByUserId,
    invitedByName: invitation.invitedBy?.name ?? null,
    invitedAt: invitation.invitedAt,
    emailSentAt: invitation.emailSentAt,
    emailDeliveryStatus: invitation.emailDeliveryStatus,
    emailDeliveryError: invitation.emailDeliveryError,
  };
}

export async function getSupplierInvitations(limit = 5) {
  const invitations = await prisma.supplierInvitation.findMany({
    orderBy: {
      invitedAt: "desc",
    },
    take: limit,
    select: getSupplierInvitationSelect(),
  });

  return invitations.map(mapInvitation);
}
