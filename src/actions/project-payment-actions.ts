"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import {
  canAssignPaymentFinanceOwner,
  canCreatePaymentPlan,
  canClosePayments,
  canUpdatePayments,
  isPrimaryEvaluator,
} from "@/lib/permissions";
import {
  paymentRecordCloseSchema,
  paymentRecordGovernanceSchema,
  projectVendorPaymentInstallmentSchema,
} from "@/lib/validation";
import type { ActionState } from "@/lib/types";
import { logSystemError } from "@/server/services/system-error-service";
import {
  saveProjectVendorPaymentInstallment,
  setPaymentRecordClosedState,
  updatePaymentRecordGovernance,
} from "@/server/services/project-payment-service";
import { uploadProjectVendorPaymentInvoice } from "@/server/services/storage-service";

function readInvoiceFile(formData: FormData) {
  const value = formData.get("invoiceAttachment");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  if (!allowedMimeTypes.has(value.type)) {
    throw new Error("Invoice attachment must be a PDF, JPG, or PNG file.");
  }

  const maxSizeBytes = 10 * 1024 * 1024;
  if (value.size > maxSizeBytes) {
    throw new Error("Invoice attachment exceeds the 10 MB file size limit.");
  }

  return value;
}

function buildPaymentRedirectTarget(input: {
  redirectTo: string | null;
  projectId: string;
  projectVendorId: string;
  notice: string;
  anchor?: string;
}) {
  if (!input.redirectTo) {
    return `/admin/projects/${input.projectId}?projectVendorId=${input.projectVendorId}&notice=${input.notice}${
      input.anchor ? `#${input.anchor}` : ""
    }`;
  }

  const url = new URL(input.redirectTo, "https://thegatheringksa.local");
  url.searchParams.set("notice", input.notice);
  return `${url.pathname}${url.search}${input.anchor ? `#${input.anchor}` : ""}`;
}

export async function saveProjectVendorPaymentInstallmentAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canCreatePaymentPlan(session.user) && !canUpdatePayments(session.user)) {
      return {
        error: "You do not have permission to manage payment tracking.",
      };
    }

    const values = projectVendorPaymentInstallmentSchema.parse({
      projectId: formData.get("projectId"),
      projectVendorId: formData.get("projectVendorId"),
      installmentId: formData.get("installmentId") || undefined,
      workflowIntent: formData.get("workflowIntent"),
      amount: formData.get("amount"),
      dueDate: formData.get("dueDate"),
      condition: formData.get("condition"),
      invoiceNumber: formData.get("invoiceNumber") || undefined,
      invoiceDate: formData.get("invoiceDate") || undefined,
      invoiceAmount: formData.get("invoiceAmount") || undefined,
      invoiceReceivedDate: formData.get("invoiceReceivedDate") || undefined,
      taxInvoiceValidated: formData.get("taxInvoiceValidated"),
      invoiceStatus: formData.get("invoiceStatus") || undefined,
      financeReviewNotes: formData.get("financeReviewNotes") || undefined,
      scheduledPaymentDate: formData.get("scheduledPaymentDate") || undefined,
      paymentDate: formData.get("paymentDate") || undefined,
      notes: formData.get("notes") || undefined,
    });
    const redirectTo = formData.get("redirectTo");

    const invoiceFile = readInvoiceFile(formData);
    const invoiceStoragePath = invoiceFile
      ? (
          await uploadProjectVendorPaymentInvoice({
            projectVendorId: values.projectVendorId,
            installmentId: values.installmentId ?? cryptoRandomId(),
            originalFileName: invoiceFile.name,
            buffer: Buffer.from(await invoiceFile.arrayBuffer()),
            mimeType: invoiceFile.type,
          })
        ).path
      : null;

    const result = await saveProjectVendorPaymentInstallment({
      userId: session.user.id,
      projectId: values.projectId,
      projectVendorId: values.projectVendorId,
      installmentId: values.installmentId ?? null,
      workflowIntent: values.workflowIntent,
      amount: values.amount,
      dueDate: values.dueDate,
      condition: values.condition,
      invoiceNumber: values.invoiceNumber ?? null,
      invoiceStoragePath: invoiceStoragePath ?? undefined,
      invoiceDate: values.invoiceDate ?? null,
      invoiceAmount: values.invoiceAmount ?? null,
      invoiceReceivedDate: values.invoiceReceivedDate ?? null,
      taxInvoiceValidated: values.taxInvoiceValidated,
      invoiceStatus: values.invoiceStatus ?? null,
      financeReviewNotes: values.financeReviewNotes ?? null,
      scheduledPaymentDate: values.scheduledPaymentDate ?? null,
      paymentDate: values.paymentDate ?? null,
      notes: values.notes ?? null,
    });

    revalidatePath(`/admin/projects/${values.projectId}`);
    revalidatePath(`/admin/projects/${values.projectId}/certificates`);
    revalidatePath("/admin/projects");
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/payments/${values.projectVendorId}`);

    return {
      success: result.fullyPaid
        ? "Payment installment saved and the assignment is now fully paid."
        : "Payment installment saved successfully.",
      noticeKey: result.fullyPaid ? "payment-fully-paid" : "payment-saved",
      redirectTo: buildPaymentRedirectTarget({
        redirectTo: redirectTo ? String(redirectTo) : null,
        projectId: values.projectId,
        projectVendorId: values.projectVendorId,
        notice: result.fullyPaid ? "payment-fully-paid" : "payment-saved",
        anchor: redirectTo ? "payment-workspace" : undefined,
      }),
    };
  } catch (error) {
    await logSystemError({
      action: "ProjectPaymentSave",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}

export async function updatePaymentRecordGovernanceAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const canAssignFinanceOwner = canAssignPaymentFinanceOwner(session.user);
    const canUpdateRecord = canUpdatePayments(session.user);

    if (!canAssignFinanceOwner && !canUpdateRecord) {
      return {
        error: "You do not have permission to update payment record governance.",
      };
    }

    const financeOwnerValue = formData.get("financeOwnerUserId");
    const paymentNotesValue = formData.get("paymentNotes");
    const values = paymentRecordGovernanceSchema.parse({
      projectVendorId: formData.get("projectVendorId"),
      financeOwnerUserId:
        financeOwnerValue === null ? undefined : String(financeOwnerValue),
      paymentNotes: paymentNotesValue === null ? undefined : String(paymentNotesValue),
      paymentWorkflowOverrideStatus:
        formData.get("paymentWorkflowOverrideStatus") === null
          ? undefined
          : String(formData.get("paymentWorkflowOverrideStatus")),
      paymentWorkflowOverrideReason:
        formData.get("paymentWorkflowOverrideReason") === null
          ? undefined
          : String(formData.get("paymentWorkflowOverrideReason")),
    });
    const redirectTo = formData.get("redirectTo");

    const result = await updatePaymentRecordGovernance({
      userId: session.user.id,
      projectVendorId: values.projectVendorId,
      financeOwnerUserId: canAssignFinanceOwner ? values.financeOwnerUserId : undefined,
      paymentNotes: values.paymentNotes,
      paymentWorkflowOverrideStatus: canAssignFinanceOwner
        ? values.paymentWorkflowOverrideStatus || undefined
        : undefined,
      paymentWorkflowOverrideReason: canAssignFinanceOwner
        ? values.paymentWorkflowOverrideReason ?? null
        : undefined,
    });

    revalidatePath(`/admin/projects/${result.projectId}`);
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/payments/${result.projectVendorId}`);

    return {
      success: "Payment record updated successfully.",
      noticeKey: "payment-record-updated",
      redirectTo: buildPaymentRedirectTarget({
        redirectTo: redirectTo ? String(redirectTo) : null,
        projectId: result.projectId,
        projectVendorId: result.projectVendorId,
        notice: "payment-record-updated",
        anchor: redirectTo ? "payment-workspace" : undefined,
      }),
    };
  } catch (error) {
    await logSystemError({
      action: "PaymentRecordGovernanceUpdate",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}

export async function setPaymentRecordClosedStateAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canClosePayments(session.user)) {
      return {
        error: "You do not have permission to close or reopen payment records.",
      };
    }

    const values = paymentRecordCloseSchema.parse({
      projectVendorId: formData.get("projectVendorId"),
      closeAction: formData.get("closeAction"),
      overrideClosure: formData.get("overrideClosure"),
      closeReason: formData.get("closeReason") || undefined,
    });
    const redirectTo = formData.get("redirectTo");

    const result = await setPaymentRecordClosedState({
      userId: session.user.id,
      userEmail: session.user.email,
      projectVendorId: values.projectVendorId,
      closeAction: values.closeAction,
      closeReason: values.closeReason ?? null,
      overrideClosure:
        values.overrideClosure &&
        isPrimaryEvaluator(session.user.email),
    });

    revalidatePath(`/admin/projects/${result.projectId}`);
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/payments/${result.projectVendorId}`);

    return {
      success: result.closed
        ? "Payment record closed successfully."
        : "Payment record reopened successfully.",
      noticeKey: result.closed ? "payment-record-closed" : "payment-record-reopened",
      redirectTo: buildPaymentRedirectTarget({
        redirectTo: redirectTo ? String(redirectTo) : null,
        projectId: result.projectId,
        projectVendorId: result.projectVendorId,
        notice: result.closed ? "payment-record-closed" : "payment-record-reopened",
        anchor: redirectTo ? "payment-workspace" : undefined,
      }),
    };
  } catch (error) {
    await logSystemError({
      action: "PaymentRecordCloseStateUpdate",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}

function cryptoRandomId() {
  return crypto
    .randomBytes(6)
    .toString("hex")
    .toUpperCase();
}
