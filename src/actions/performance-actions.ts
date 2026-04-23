"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/types";
import { requireAdminSession } from "@/lib/auth";
import {
  canEvaluateTeamPerformance,
  canManageMonthlyGovernance,
} from "@/lib/permissions";
import {
  monthlyCycleSchema,
  monthlyCycleStatusActionSchema,
  monthlyPerformanceReviewSchema,
  quarterlyPerformanceReviewSchema,
} from "@/lib/validation";
import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import {
  createMonthlyCycle,
  saveMonthlyPerformanceReview,
  saveQuarterlyPerformanceReview,
  updateMonthlyCycleStatus,
} from "@/server/services/performance-service";

function buildPerformancePath(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  return `/admin/performance?${params.toString()}`;
}

export async function saveQuarterlyPerformanceReviewAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canEvaluateTeamPerformance(session.user.role, session.user.email)) {
      return {
        error: "Only Khaled can create or finalize quarterly performance reviews.",
      };
    }

    const values = quarterlyPerformanceReviewSchema.parse({
      reviewId: formData.get("reviewId") || undefined,
      employeeUserId: formData.get("employeeUserId"),
      year: formData.get("year"),
      quarter: formData.get("quarter"),
      managerScorecard: formData.get("managerScorecard"),
      managerComments: formData.get("managerComments"),
      recommendation: formData.get("recommendation"),
    });
    const intent = String(formData.get("intent") || "draft");
    const finalize = intent === "finalize";

    const review = await saveQuarterlyPerformanceReview({
      actor: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      values,
      finalize,
    });

    revalidatePath("/admin/performance");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");

    return {
      success: finalize
        ? "Quarterly performance review finalized successfully."
        : "Quarterly performance review saved successfully.",
      redirectTo: `/admin/performance?employeeUserId=${review.employeeUserId}&year=${review.year}&quarter=${review.quarter}&notice=${finalize ? "performance-review-finalized" : "performance-review-saved"}`,
      noticeKey: finalize ? "performance-review-finalized" : "performance-review-saved",
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createMonthlyCycleAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageMonthlyGovernance(session.user.role, session.user.email)) {
      return {
        error: "Only Khaled can create or activate monthly cycles.",
      };
    }

    const values = monthlyCycleSchema.parse({
      month: formData.get("month"),
      year: formData.get("year"),
      label: formData.get("label") || undefined,
      status: formData.get("status"),
      activate: formData.get("activate") === "on",
    });

    const cycle = await createMonthlyCycle({
      actor: {
        id: session.user.id,
        email: session.user.email,
      },
      values,
    });

    revalidatePath("/admin/performance");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/dashboard");

    return {
      success: "Monthly cycle created successfully.",
      noticeKey: "monthly-cycle-created",
      redirectTo: buildPerformancePath({
        cycleId: cycle.id,
        notice: "monthly-cycle-created",
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateMonthlyCycleStatusAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageMonthlyGovernance(session.user.role, session.user.email)) {
      return {
        error: "Only Khaled can manage monthly cycle state.",
      };
    }

    const values = monthlyCycleStatusActionSchema.parse({
      cycleId: formData.get("cycleId"),
      action: formData.get("action"),
    });

    const cycle = await updateMonthlyCycleStatus({
      actor: {
        id: session.user.id,
        email: session.user.email,
      },
      cycleId: values.cycleId,
      action: values.action,
    });

    revalidatePath("/admin/performance");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/dashboard");

    return {
      success: "Monthly cycle updated successfully.",
      noticeKey: "monthly-cycle-updated",
      redirectTo: buildPerformancePath({
        cycleId: cycle.id,
        notice: "monthly-cycle-updated",
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function saveMonthlyPerformanceReviewAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canEvaluateTeamPerformance(session.user.role, session.user.email)) {
      return {
        error: "Only Khaled can create or finalize monthly team reviews.",
      };
    }

    const values = monthlyPerformanceReviewSchema.parse({
      reviewId: formData.get("reviewId") || undefined,
      cycleId: formData.get("cycleId"),
      employeeUserId: formData.get("employeeUserId"),
      managerScorePercent: formData.get("managerScorePercent") || undefined,
      managerNotes: formData.get("managerNotes") || undefined,
      recommendation: formData.get("recommendation") || undefined,
    });
    const intent = String(formData.get("intent") || "draft");
    const finalize = intent === "finalize";

    const review = await saveMonthlyPerformanceReview({
      actor: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      values,
      finalize,
    });

    revalidatePath("/admin/performance");
    revalidatePath("/admin/dashboard");

    return {
      success: finalize
        ? "Monthly review finalized successfully."
        : "Monthly review saved successfully.",
      noticeKey: finalize ? "monthly-review-finalized" : "monthly-review-saved",
      redirectTo: buildPerformancePath({
        cycleId: review.cycleId,
        notice: finalize ? "monthly-review-finalized" : "monthly-review-saved",
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}
