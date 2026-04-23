"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types";
import { requireAdminSession } from "@/lib/auth";
import { canManageOperationalTasks } from "@/lib/permissions";
import { operationalTaskSchema } from "@/lib/validation";
import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { saveOperationalTask } from "@/server/services/task-service";

export async function saveOperationalTaskAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const values = operationalTaskSchema.parse({
      taskId: formData.get("taskId") || undefined,
      title: formData.get("title"),
      description: formData.get("description"),
      type: formData.get("type"),
      assignedToUserId: formData.get("assignedToUserId"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      startDate: formData.get("startDate") || undefined,
      dueDate: formData.get("dueDate"),
      linkedProjectId: formData.get("linkedProjectId") || undefined,
      linkedVendorId: formData.get("linkedVendorId") || undefined,
      linkedProjectVendorId: formData.get("linkedProjectVendorId") || undefined,
      linkedCertificateId: formData.get("linkedCertificateId") || undefined,
      monthlyCycleId: formData.get("monthlyCycleId") || undefined,
      requiresChecklistCompletion:
        formData.get("requiresChecklistCompletion") === "on",
      checklistPayload: formData.get("checklistPayload"),
    });

    if (!values.taskId && !canManageOperationalTasks(session.user.role)) {
      return {
        error: "You do not have permission to create operational tasks.",
      };
    }

    const task = await saveOperationalTask({
      actorUser: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
      values,
    });

    revalidatePath("/admin/tasks");
    revalidatePath(`/admin/tasks/${task.id}`);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/performance");
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");

    return {
      success: values.taskId
        ? "Operational task updated successfully."
        : "Operational task created successfully.",
      redirectTo: `/admin/tasks/${task.id}?notice=${values.taskId ? "task-updated" : "task-created"}`,
      noticeKey: values.taskId ? "task-updated" : "task-created",
    };
  } catch (error) {
    return toActionState(error);
  }
}
