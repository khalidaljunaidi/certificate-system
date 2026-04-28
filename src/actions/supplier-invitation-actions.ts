"use server";

import { revalidatePath } from "next/cache";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { supplierInvitationSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";
import { logSystemError } from "@/server/services/system-error-service";
import { sendSupplierInvitation } from "@/server/services/supplier-invitation-service";

const DEFAULT_INVITATION_REDIRECT = "/admin/vendor-registrations";

function normalizeRedirectPath(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string") {
    return DEFAULT_INVITATION_REDIRECT;
  }

  const trimmedValue = rawValue.trim();

  if (!trimmedValue.startsWith("/admin/")) {
    return DEFAULT_INVITATION_REDIRECT;
  }

  return trimmedValue;
}

function appendNotice(path: string, notice: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("notice", notice);

  return `${url.pathname}${url.search}${url.hash}`;
}

export async function sendSupplierInvitationAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const redirectPath = normalizeRedirectPath(formData.get("redirectPath"));

    if (!canManageVendorGovernance(session.user)) {
      return {
        error: "You do not have permission to send supplier invitations.",
      };
    }

    const values = supplierInvitationSchema.parse({
      supplierCompanyName: formData.get("supplierCompanyName") || undefined,
      supplierContactEmail: formData.get("supplierContactEmail"),
      supplierContactName: formData.get("supplierContactName") || undefined,
      suggestedCategoryId: formData.get("suggestedCategoryId") || undefined,
      internalNote: formData.get("internalNote") || undefined,
      customMessage: formData.get("customMessage") || undefined,
    });

    const result = await sendSupplierInvitation({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      values,
    });

    revalidatePath("/admin/vendors");
    revalidatePath("/admin/vendor-registrations");

    if (result.emailDeliveryStatus === "FAILED") {
      return {
        error:
          "Could not send the supplier invitation. The invitation was saved, but email delivery failed.",
        noticeKey: "supplier-invitation-failed",
        redirectTo: appendNotice(redirectPath, "supplier-invitation-failed"),
      };
    }

    if (result.emailDeliveryStatus === "SKIPPED") {
      return {
        success:
          "Invitation recorded successfully, but email delivery was skipped because the mail service is not configured in this environment.",
        noticeKey: "supplier-invitation-skipped",
        redirectTo: appendNotice(redirectPath, "supplier-invitation-skipped"),
      };
    }

    return {
      success: "Supplier invitation sent successfully.",
      noticeKey: "supplier-invitation-sent",
      redirectTo: appendNotice(redirectPath, "supplier-invitation-sent"),
    };
  } catch (error) {
    await logSystemError({
      action: "SupplierInvitationSendAction",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}
