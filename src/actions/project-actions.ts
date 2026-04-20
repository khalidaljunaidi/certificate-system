"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types";
import { requireAdminSession } from "@/lib/auth";
import { projectFormSchema, projectVendorFormSchema } from "@/lib/validation";
import { createProject, addVendorToProject } from "@/server/services/project-service";
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
      vendorName: formData.get("vendorName"),
      vendorEmail: formData.get("vendorEmail"),
      vendorId: formData.get("vendorId"),
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
