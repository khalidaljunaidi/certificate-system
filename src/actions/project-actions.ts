"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types";
import { requireAdminSession } from "@/lib/auth";
import { canManageProjectStatus } from "@/lib/permissions";
import {
  projectFormSchema,
  projectVendorFormSchema,
  updateProjectStatusSchema,
} from "@/lib/validation";
import {
  createProject,
  addVendorToProject,
  updateProjectStatus,
} from "@/server/services/project-service";
import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";

export async function createProjectAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const values = projectFormSchema.parse({
      projectCode: formData.get("projectCode"),
      projectName: formData.get("projectName"),
      projectLocation: formData.get("projectLocation"),
      clientName: formData.get("clientName"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate") || undefined,
      status: formData.get("status"),
    });

    await createProject(session.user.id, values);
    revalidatePath("/admin/projects");
    revalidatePath("/admin/dashboard");

    return {
      success: "Project created successfully.",
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function addProjectVendorAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const projectId = String(formData.get("projectId"));
    const values = projectVendorFormSchema.parse({
      projectId,
      existingVendorRecordId:
        formData.get("existingVendorRecordId") || undefined,
      vendorName: formData.get("vendorName") || undefined,
      vendorEmail: formData.get("vendorEmail") || undefined,
      vendorId: formData.get("vendorId") || undefined,
      vendorPhone: formData.get("vendorPhone") || undefined,
      poNumber: formData.get("poNumber") || undefined,
      contractNumber: formData.get("contractNumber") || undefined,
    });

    await addVendorToProject(session.user.id, values);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath("/admin/projects");

    return {
      success: "Vendor PO record added successfully.",
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateProjectStatusAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageProjectStatus(session.user.role)) {
      return {
        error: "You do not have permission to update project status.",
      };
    }

    const values = updateProjectStatusSchema.parse({
      projectId: formData.get("projectId"),
      status: formData.get("status"),
    });

    const project = await updateProjectStatus(session.user.id, values);

    revalidatePath(`/admin/projects/${project.id}`);
    revalidatePath("/admin/projects");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin", "layout");

    return {
      success: "Project status updated successfully.",
      noticeKey: "project-status-updated",
      redirectTo: `/admin/projects/${project.id}?notice=project-status-updated`,
    };
  } catch (error) {
    return toActionState(error);
  }
}
