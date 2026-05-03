"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/types";
import { requireAdminSession } from "@/lib/auth";
import { isPrimaryEvaluator } from "@/lib/permissions";
import {
  archiveCertificateSchema,
  certificateOverrideSchema,
  certificateDraftSchema,
  duplicateCertificateSchema,
  issueCertificateSchema,
  reopenCertificateSchema,
  revokeCertificateSchema,
  submitForPmApprovalSchema,
} from "@/lib/validation";
import {
  archiveCertificate,
  duplicateCertificateDraft,
  issueCertificate,
  regenerateCertificatePdf,
  reopenCertificate,
  revokeCertificate,
  saveCertificateDraft,
  forceApproveCertificateByExecutive,
  submitCertificateForPmApproval,
  unarchiveCertificate,
} from "@/server/services/certificate-workflow";
import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";

function buildCertificateDetailPath(
  projectId: string,
  certificateId: string,
  params?: Record<string, string>,
) {
  const search = new URLSearchParams(params);
  const basePath = `/admin/projects/${projectId}/certificates/${certificateId}`;

  return search.size > 0 ? `${basePath}?${search.toString()}` : basePath;
}

export async function saveCertificateDraftAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const certificateId = formData.get("certificateId")
      ? String(formData.get("certificateId"))
      : undefined;
    const formMode = String(formData.get("formMode") || "create");
    const hasCertificateId = Boolean(certificateId);

    console.info("[certificate] form submission received", {
      certificateId: certificateId ?? null,
      formMode,
      hasCertificateId,
    });

    if (formMode === "create" && hasCertificateId) {
      console.warn("[certificate] create mode received unexpected certificateId", {
        certificateId,
      });

      return {
        error: "Create mode cannot submit an existing certificate ID.",
      };
    }

    if (formMode !== "create" && !hasCertificateId) {
      console.warn("[certificate] edit mode missing certificateId", {
        formMode,
      });

      return {
        error: "Edit mode requires a certificate ID.",
      };
    }

    const values = certificateDraftSchema.parse({
      projectId: formData.get("projectId"),
      projectVendorId: formData.get("projectVendorId"),
      vendorId: formData.get("vendorId"),
      issueDate: formData.get("issueDate"),
      poNumber: formData.get("poNumber"),
      contractNumber: formData.get("contractNumber") || undefined,
      completionDate: formData.get("completionDate"),
      totalAmount: formData.get("totalAmount"),
      executedScopeSummary: formData.get("executedScopeSummary"),
      clientName: formData.get("clientName"),
      clientTitle: formData.get("clientTitle"),
      approverName: formData.get("approverName"),
      approverTitle: formData.get("approverTitle"),
      pmEmail: formData.get("pmEmail"),
    });
    const operation = hasCertificateId ? "UPDATE" : "CREATE";

    console.info("[certificate] saveCertificateDraftAction resolved operation", {
      certificateId: certificateId ?? null,
      operation,
      projectId: values.projectId,
      projectVendorId: values.projectVendorId,
      vendorId: values.vendorId,
    });

    const certificate = await saveCertificateDraft({
      userId: session.user.id,
      certificateId,
      values,
    });

    revalidatePath(`/admin/projects/${certificate.projectId}`);
    revalidatePath(`/admin/projects/${certificate.projectId}/certificates`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin", "layout");

    const notice =
      formMode === "revision"
        ? "revision-submitted"
        : certificateId
          ? "certificate-saved"
          : "certificate-created";

    return {
      success: "Certificate saved successfully.",
      redirectTo: buildCertificateDetailPath(certificate.projectId, certificate.id, {
        notice,
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateCertificateAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId") || "");
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = duplicateCertificateSchema.parse({
      certificateId,
    });

    const duplicate = await duplicateCertificateDraft({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${duplicate.projectId}`);
    revalidatePath(`/admin/projects/${duplicate.projectId}/certificates`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(duplicate.projectId, duplicate.id, {
      notice: "certificate-duplicated",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to duplicate certificate.";

    if (projectId && certificateId) {
      redirectPath = buildCertificateDetailPath(projectId, certificateId, {
        error: message,
      });
    } else {
      redirectPath = `/admin/certificates?error=${encodeURIComponent(message)}`;
    }
  }

  redirect(redirectPath);
}

export async function submitForPmApprovalAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId"));
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = submitForPmApprovalSchema.parse({
      certificateId,
    });

    await submitCertificateForPmApproval({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/notifications");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      notice: "pm-request-sent",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send PM approval.";

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      error: message,
    });
  }

  redirect(redirectPath);
}

export async function forceApproveCertificateAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!isPrimaryEvaluator(session.user.email)) {
      return {
        error: "Only Khaled can bypass pending certificate approval.",
      };
    }

    const projectId = String(formData.get("projectId"));
    const certificateId = String(formData.get("certificateId"));

    const values = certificateOverrideSchema.parse({
      certificateId,
      overrideReason: formData.get("overrideReason"),
    });

    await forceApproveCertificateByExecutive({
      userId: session.user.id,
      userName: session.user.name,
      userTitle: session.user.title,
      overrideReason: values.overrideReason,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");

    return {
      success: "Certificate advanced successfully through executive override.",
      noticeKey: "certificate-override-approved",
      redirectTo: buildCertificateDetailPath(projectId, certificateId, {
        notice: "certificate-override-approved",
      }),
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function issueCertificateAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId"));
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = issueCertificateSchema.parse({
      certificateId,
    });

    await issueCertificate({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      notice: "certificate-issued",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to issue certificate.";

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      error: message,
    });
  }

  redirect(redirectPath);
}

export async function regenerateCertificatePdfAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId"));
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = issueCertificateSchema.parse({
      certificateId,
    });

    await regenerateCertificatePdf({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      notice: "certificate-pdf-regenerated",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to regenerate PDF.";

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      error: message,
    });
  }

  redirect(redirectPath);
}

export async function reopenCertificateAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId"));
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = reopenCertificateSchema.parse({
      certificateId,
    });

    await reopenCertificate({
      userId: session.user.id,
      userName: session.user.name,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      notice: "certificate-reopened",
      mode: "edit",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reopen certificate.";

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      error: message,
    });
  }

  redirect(redirectPath);
}

export async function archiveCertificateAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId"));
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = archiveCertificateSchema.parse({
      certificateId,
    });

    await archiveCertificate({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      notice: "certificate-archived",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to archive certificate.";

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      error: message,
    });
  }

  redirect(redirectPath);
}

export async function unarchiveCertificateAction(formData: FormData) {
  const session = await requireAdminSession();
  const projectId = String(formData.get("projectId"));
  const certificateId = String(formData.get("certificateId"));
  let redirectPath: string;

  try {
    const values = archiveCertificateSchema.parse({
      certificateId,
    });

    await unarchiveCertificate({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin", "layout");

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      notice: "certificate-unarchived",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to unarchive certificate.";

    redirectPath = buildCertificateDetailPath(projectId, certificateId, {
      error: message,
    });
  }

  redirect(redirectPath);
}

export async function revokeCertificateAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();
    const projectId = String(formData.get("projectId"));
    const certificateId = String(formData.get("certificateId"));

    const values = revokeCertificateSchema.parse({
      certificateId,
      revokedReason: formData.get("revokedReason"),
    });

    await revokeCertificate({
      userId: session.user.id,
      values,
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/certificates`);
    revalidatePath(`/admin/projects/${projectId}/certificates/${certificateId}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");

    return {
      success: "Certificate revoked successfully.",
    };
  } catch (error) {
    return toActionState(error);
  }
}
