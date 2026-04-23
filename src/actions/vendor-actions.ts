"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types";
import { requireAdminSession } from "@/lib/auth";
import {
  canFinalizeVendorEvaluation,
  canManageWorkflowEmailSettings,
  canManageVendorGovernance,
  isPrimaryEvaluator,
  canRequestVendorEvaluation,
} from "@/lib/permissions";
import {
  createVendorEvaluationCycleSchema,
  finalizeVendorEvaluationSchema,
  vendorCategorySchema,
  vendorMasterSchema,
  vendorEvaluationSubmissionSchema,
  forceFinalizeVendorEvaluationSchema,
  vendorGovernanceSchema,
  vendorSubcategorySchema,
  workflowEmailSettingSchema,
} from "@/lib/validation";
import {
  createVendorCategory,
  createVendorEvaluationCycle,
  createVendorSubcategory,
  finalizeVendorEvaluationCycle,
  saveVendorMaster,
  submitVendorEvaluationByToken,
  updateVendorGovernance,
} from "@/server/services/vendor-service";
import { updateWorkflowEmailSetting } from "@/server/services/workflow-email-settings-service";
import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";

function buildVendorDetailPath(
  vendorId: string,
  params?: Record<string, string>,
  hash?: string,
) {
  const search = new URLSearchParams(params);
  const basePath = `/admin/vendors/${vendorId}`;
  const path = search.size > 0 ? `${basePath}?${search.toString()}` : basePath;

  return hash ? `${path}#${hash}` : path;
}

function revalidateVendorSurfaces(vendorId: string) {
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
}

function buildVendorSaveRedirectPath(vendorId: string, redirectTo?: string | null) {
  if (!redirectTo) {
    return buildVendorDetailPath(vendorId, {
      notice: "vendor-saved",
    });
  }

  const url = new URL(
    redirectTo,
    "https://tg-certificate-system.local",
  );
  url.searchParams.set("notice", "vendor-saved");

  return `${url.pathname}${url.search}`;
}

export async function saveVendorMasterAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user.role)) {
      return {
        error: "You do not have permission to manage vendor master records.",
      };
    }

    const values = vendorMasterSchema.parse({
      vendorRecordId: formData.get("vendorRecordId") || undefined,
      vendorName: formData.get("vendorName"),
      vendorEmail: formData.get("vendorEmail"),
      vendorId: formData.get("vendorId"),
      vendorPhone: formData.get("vendorPhone") || undefined,
      status: formData.get("status"),
      classification: formData.get("classification") || undefined,
      notes: formData.get("notes") || undefined,
      categoryId: formData.get("categoryId") || undefined,
      subcategoryId: formData.get("subcategoryId") || undefined,
    });

    const redirectTo = formData.get("redirectTo");
    const vendor = await saveVendorMaster(session.user.id, values);
    revalidateVendorSurfaces(vendor.id);
    revalidatePath("/admin/projects");

    return {
      success: values.vendorRecordId
        ? "Vendor updated successfully."
        : "Vendor created successfully.",
      noticeKey: "vendor-saved",
      redirectTo: buildVendorSaveRedirectPath(
        vendor.id,
        redirectTo ? String(redirectTo) : null,
      ),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateVendorGovernanceAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user.role)) {
      return {
        error: "You do not have permission to update vendor governance data.",
      };
    }

    const values = vendorGovernanceSchema.parse({
      vendorId: formData.get("vendorId"),
      categoryId: formData.get("categoryId") || undefined,
      subcategoryId: formData.get("subcategoryId") || undefined,
    });

    const vendor = await updateVendorGovernance(session.user.id, values);
    revalidateVendorSurfaces(vendor.id);

    return {
      success: "Vendor governance details updated successfully.",
      noticeKey: "vendor-governance-updated",
      redirectTo: buildVendorDetailPath(vendor.id, {
        notice: "vendor-governance-updated",
      }, "profile-editor"),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createVendorCategoryAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user.role)) {
      return {
        error: "You do not have permission to manage vendor governance data.",
      };
    }

    const values = vendorCategorySchema.parse({
      vendorId: formData.get("vendorId"),
      name: formData.get("name"),
      externalKey: formData.get("externalKey") || undefined,
    });

    await createVendorCategory(session.user.id, values);
    revalidateVendorSurfaces(values.vendorId);

    return {
      success: "Vendor category created successfully.",
      noticeKey: "vendor-category-created",
      redirectTo: buildVendorDetailPath(
        values.vendorId,
        { notice: "vendor-category-created" },
        "profile-editor",
      ),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createVendorSubcategoryAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user.role)) {
      return {
        error: "You do not have permission to manage vendor governance data.",
      };
    }

    const values = vendorSubcategorySchema.parse({
      vendorId: formData.get("vendorId"),
      categoryId: formData.get("categoryId"),
      name: formData.get("name"),
      externalKey: formData.get("externalKey") || undefined,
    });

    await createVendorSubcategory(session.user.id, values);
    revalidateVendorSurfaces(values.vendorId);

    return {
      success: "Vendor subcategory created successfully.",
      noticeKey: "vendor-subcategory-created",
      redirectTo: buildVendorDetailPath(
        values.vendorId,
        { notice: "vendor-subcategory-created" },
        "profile-editor",
      ),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createVendorEvaluationCycleAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canRequestVendorEvaluation(session.user.role)) {
      return {
        error: "You do not have permission to request a vendor evaluation.",
      };
    }

    const values = createVendorEvaluationCycleSchema.parse({
      vendorId: formData.get("vendorId"),
      sourceProjectId: formData.get("sourceProjectId"),
      year: formData.get("year"),
      projectManagerEmail: formData.get("projectManagerEmail"),
    });

    const cycle = await createVendorEvaluationCycle({
      userId: session.user.id,
      values,
    });

    revalidateVendorSurfaces(cycle.vendorId);

    return {
      success: "Vendor evaluation request sent successfully.",
      noticeKey: "vendor-evaluation-requested",
      redirectTo: buildVendorDetailPath(cycle.vendorId, {
        notice: "vendor-evaluation-requested",
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function finalizeVendorEvaluationCycleAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canFinalizeVendorEvaluation(session.user.role)) {
      return {
        error: "You do not have permission to finalize this vendor evaluation.",
      };
    }

    const vendorId = String(formData.get("vendorId"));
    const values = finalizeVendorEvaluationSchema.parse({
      cycleId: formData.get("cycleId"),
      criteriaSnapshot: formData.get("criteriaSnapshot"),
      totalScorePercent: formData.get("totalScorePercent"),
      summary: formData.get("summary"),
      strengths: formData.get("strengths"),
      concerns: formData.get("concerns"),
      recommendation: formData.get("recommendation"),
      correctiveActions: formData.get("correctiveActions"),
    });

    await finalizeVendorEvaluationCycle({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      values,
    });

    revalidateVendorSurfaces(vendorId);

    return {
      success: "Vendor evaluation finalized successfully.",
      noticeKey: "vendor-evaluation-finalized",
      redirectTo: buildVendorDetailPath(vendorId, {
        notice: "vendor-evaluation-finalized",
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function forceFinalizeVendorEvaluationCycleAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canFinalizeVendorEvaluation(session.user.role) || !isPrimaryEvaluator(session.user.email)) {
      return {
        error: "Only Khaled can force-finalize vendor evaluations.",
      };
    }

    const vendorId = String(formData.get("vendorId"));
    const values = forceFinalizeVendorEvaluationSchema.parse({
      cycleId: formData.get("cycleId"),
      criteriaSnapshot: formData.get("criteriaSnapshot"),
      totalScorePercent: formData.get("totalScorePercent"),
      summary: formData.get("summary"),
      strengths: formData.get("strengths"),
      concerns: formData.get("concerns"),
      recommendation: formData.get("recommendation"),
      correctiveActions: formData.get("correctiveActions"),
      overrideReason: formData.get("overrideReason"),
    });

    await finalizeVendorEvaluationCycle({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      values,
      forceFinalize: true,
      overrideReason: values.overrideReason,
    });

    revalidateVendorSurfaces(vendorId);

    return {
      success: "Vendor evaluation force-finalized successfully.",
      noticeKey: "vendor-evaluation-force-finalized",
      redirectTo: buildVendorDetailPath(vendorId, {
        notice: "vendor-evaluation-force-finalized",
      }, "evaluation-history"),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function submitVendorEvaluationByTokenAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;

    const values = vendorEvaluationSubmissionSchema.parse({
      token: formData.get("token"),
      evaluatorName: formData.get("evaluatorName"),
      criteriaSnapshot: formData.get("criteriaSnapshot"),
      totalScorePercent: formData.get("totalScorePercent"),
      summary: formData.get("summary"),
      strengths: formData.get("strengths"),
      concerns: formData.get("concerns"),
      recommendation: formData.get("recommendation"),
      correctiveActions: formData.get("correctiveActions"),
    });

    await submitVendorEvaluationByToken({
      values,
    });

    return {
      success: "Evaluation submitted successfully.",
      completionState: "submitted",
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateWorkflowEmailSettingAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageWorkflowEmailSettings(session.user.role)) {
      return {
        error: "You do not have permission to update workflow email settings.",
      };
    }

    const values = workflowEmailSettingSchema.parse({
      event: formData.get("event"),
      enabled: formData.get("enabled") === "on",
      includeDefaultTo: formData.get("includeDefaultTo") === "on",
      includeDefaultCc: formData.get("includeDefaultCc") === "on",
      toEmails: String(formData.get("toEmails") || "")
        .split(/[\n,;]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
      ccEmails: String(formData.get("ccEmails") || "")
        .split(/[\n,;]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    });

    await updateWorkflowEmailSetting(session.user.id, values);
    revalidatePath("/admin/settings");
    revalidatePath("/admin", "layout");

    return {
      success: "Workflow email routing updated successfully.",
      noticeKey: "workflow-email-routing-saved",
      redirectTo: "/admin/settings?notice=workflow-email-routing-saved",
    };
  } catch (error) {
    return toActionState(error);
  }
}
