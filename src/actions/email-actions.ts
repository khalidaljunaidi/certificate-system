"use server";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import type { ActionState } from "@/lib/types";
import { emailTestSchema } from "@/lib/validation";
import { sendWorkflowEmailTest } from "@/server/services/email-service";

export async function sendWorkflowEmailTestAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const values = emailTestSchema.parse({
      recipientEmail: String(formData.get("recipientEmail")).trim().toLowerCase(),
      template: formData.get("template"),
    });

    await sendWorkflowEmailTest({
      template: values.template,
      recipientEmail: values.recipientEmail,
      requestedBy: session.user.email,
    });

    const labels = {
      PM_APPROVAL_REQUEST: "PM approval request",
      PROCUREMENT_NOTIFICATION: "Procurement notification",
      CERTIFICATE_ISSUED: "issued certificate",
      CERTIFICATE_REOPENED: "certificate reopened notification",
    } as const;

    return {
      success: `${labels[values.template]} test email sent to ${values.recipientEmail}.`,
    };
  } catch (error) {
    return toActionState(error);
  }
}
