"use server";

import { revalidatePath } from "next/cache";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import { canManageWorkflowEmailSettings } from "@/lib/permissions";
import { workflowEmailGroupMemberSchema } from "@/lib/validation";
import { saveNotificationEmailGroupMember } from "@/server/services/notification-group-service";
import type { ActionState } from "@/lib/types";

function getSuccessMessage(
  intent: "create" | "update" | "deactivate" | "activate",
) {
  switch (intent) {
    case "create":
      return "Notification group member added successfully.";
    case "update":
      return "Notification group member updated successfully.";
    case "deactivate":
      return "Notification group member removed successfully.";
    case "activate":
      return "Notification group member restored successfully.";
    default:
      return "Notification group member saved successfully.";
  }
}

export async function saveNotificationGroupMemberAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageWorkflowEmailSettings(session.user)) {
      return {
        error: "You do not have permission to manage notification groups.",
      };
    }

    const values = workflowEmailGroupMemberSchema.parse({
      intent: formData.get("intent"),
      groupId: formData.get("groupId"),
      memberId: formData.get("memberId") || undefined,
      name: formData.get("name"),
      email: formData.get("email"),
    });

    await saveNotificationEmailGroupMember({
      groupId: values.groupId,
      memberId: values.memberId,
      intent: values.intent,
      name: values.name,
      email: values.email,
    });

    revalidatePath("/admin/settings");

    return {
      success: getSuccessMessage(values.intent),
      noticeKey: "notification-group-updated",
    };
  } catch (error) {
    return toActionState(error);
  }
}
