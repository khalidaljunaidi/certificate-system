"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { vendorRegistrationReviewSchema, vendorRegistrationSubmissionSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";
import { testOdooConnection } from "@/server/services/odoo-service";
import {
  approveVendorRegistrationRequest,
  replaceVendorRegistrationAttachment,
  rejectVendorRegistrationRequest,
  submitVendorRegistrationRequest,
} from "@/server/services/vendor-registration-service";
import { retryVendorOdooSync } from "@/server/services/vendor-odoo-sync-service";
import { logSystemError } from "@/server/services/system-error-service";

const MAX_SUPPLIER_REGISTRATION_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SUPPLIER_REGISTRATION_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_SUPPLIER_REGISTRATION_FILE_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
];

const supplierRegistrationFileLabels: Record<string, string> = {
  crAttachment: "CR",
  vatAttachment: "VAT",
  companyProfileAttachment: "Company Profile",
  financialsAttachment: "Financials",
  bankCertificateAttachment: "Bank Certificate",
  replacementAttachment: "Attachment",
};

const DUPLICATE_VENDOR_REGISTRATION_MESSAGE =
  "A registration already exists with the same CR, VAT, or email.";

function withNotice(path: string, notice: string) {
  const safePath = path.startsWith("/") ? path : "/admin/vendor-registrations";
  return `${safePath}${safePath.includes("?") ? "&" : "?"}notice=${notice}`;
}

function isAllowedSupplierRegistrationFile(file: File) {
  const name = file.name.trim().toLowerCase();

  return (
    ALLOWED_SUPPLIER_REGISTRATION_FILE_TYPES.has(file.type) ||
    ALLOWED_SUPPLIER_REGISTRATION_FILE_EXTENSIONS.some((extension) =>
      name.endsWith(extension),
    )
  );
}

function assertValidSupplierRegistrationFile(file: File, fieldName: string) {
  const label = supplierRegistrationFileLabels[fieldName] ?? fieldName;

  if (file.size > MAX_SUPPLIER_REGISTRATION_FILE_BYTES) {
    throw new Error(`${label} must be 10MB or less.`);
  }

  if (!isAllowedSupplierRegistrationFile(file)) {
    throw new Error(`${label} must be a PDF, JPG, or PNG file.`);
  }
}

function getRequiredFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  const label = supplierRegistrationFileLabels[fieldName] ?? fieldName;

  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }

  assertValidSupplierRegistrationFile(value, fieldName);

  return value;
}

function getOptionalFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  assertValidSupplierRegistrationFile(value, fieldName);

  return value;
}

function logValidationWarning(action: string, fieldErrors: Record<string, string[]>) {
  console.warn("[server-action-validation]", {
    action,
    fields: Object.keys(fieldErrors),
  });
}

function normalizeRegistrationFieldErrors(
  fieldErrors: Record<string, string[]>,
) {
  const normalized = { ...fieldErrors };

  if (normalized.declarationAccepted?.length) {
    normalized.declarationAccepted = ["Please accept the final declaration."];
  }

  return normalized;
}

function toRegistrationValidationState(error: unknown): ActionState | null {
  if (!(error instanceof ZodError)) {
    return null;
  }

  const fieldErrors = normalizeRegistrationFieldErrors(
    error.flatten().fieldErrors,
  );

  logValidationWarning("submitVendorRegistrationAction", fieldErrors);

  return {
    error: "Please review the highlighted fields.",
    fieldErrors,
  };
}

function isDuplicateRegistrationError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? (error.meta.target as string[])
      : [];

    return target.some((field) =>
      [
        "companyEmail",
        "crNumber",
        "vatNumber",
        "vendorEmail",
        "vendorId",
      ].includes(field),
    );
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("already exists") &&
    (message.includes("cr") ||
      message.includes("vat") ||
      message.includes("email") ||
      message.includes("master registry"))
  );
}

function toDuplicateRegistrationState(): ActionState {
  const fieldErrors = {
    crNumber: [DUPLICATE_VENDOR_REGISTRATION_MESSAGE],
    vatNumber: [DUPLICATE_VENDOR_REGISTRATION_MESSAGE],
    companyEmail: [DUPLICATE_VENDOR_REGISTRATION_MESSAGE],
  };

  logValidationWarning("submitVendorRegistrationAction", fieldErrors);

  return {
    error: DUPLICATE_VENDOR_REGISTRATION_MESSAGE,
    fieldErrors,
  };
}

function toRegistrationFileValidationState(error: unknown): ActionState | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const fieldEntry = Object.entries(supplierRegistrationFileLabels).find(
    ([, label]) => error.message.startsWith(`${label} `),
  );

  if (!fieldEntry) {
    return null;
  }

  const [fieldName] = fieldEntry;
  const fieldErrors = {
    [fieldName]: [error.message],
  };

  logValidationWarning("submitVendorRegistrationAction", fieldErrors);

  return {
    error: error.message,
    fieldErrors,
  };
}

function parseRegistrationFormData(formData: FormData) {
  return vendorRegistrationSubmissionSchema.parse({
    companyName: formData.get("companyName"),
    legalName: formData.get("legalName"),
    companyEmail: formData.get("companyEmail"),
    companyPhone: formData.get("companyPhone"),
    website: formData.get("website") || undefined,
    crNumber: formData.get("crNumber"),
    vatNumber: formData.get("vatNumber"),
    countryCode: formData.get("countryCode"),
    coverageScope: formData.get("coverageScope"),
    cityIds: formData.getAll("cityIds").map(String),
    categoryId: formData.get("categoryId"),
    subcategoryIds: formData.getAll("subcategoryIds").map(String),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    district: formData.get("district"),
    region: formData.get("region") || undefined,
    postalCode: formData.get("postalCode"),
    poBox: formData.get("poBox") || undefined,
    businessDescription: formData.get("businessDescription"),
    servicesOverview: formData.get("servicesOverview"),
    yearsInBusiness: formData.get("yearsInBusiness"),
    employeeCount: formData.get("employeeCount"),
    reference1: {
      name: formData.get("reference1Name"),
      companyName: formData.get("reference1CompanyName"),
      email: formData.get("reference1Email"),
      phone: formData.get("reference1Phone"),
      title: formData.get("reference1Title"),
    },
    reference2: {
      name: formData.get("reference2Name"),
      companyName: formData.get("reference2CompanyName"),
      email: formData.get("reference2Email"),
      phone: formData.get("reference2Phone"),
      title: formData.get("reference2Title"),
    },
    reference3: {
      name: formData.get("reference3Name"),
      companyName: formData.get("reference3CompanyName"),
      email: formData.get("reference3Email"),
      phone: formData.get("reference3Phone"),
      title: formData.get("reference3Title"),
    },
    bankName: formData.get("bankName"),
    accountName: formData.get("accountName"),
    iban: formData.get("iban"),
    swiftCode: formData.get("swiftCode"),
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    additionalInformation: formData.get("additionalInformation") || undefined,
    declarationName: formData.get("declarationName"),
    declarationTitle: formData.get("declarationTitle"),
    declarationAccepted: formData.get("declarationAccepted"),
  });
}

function isInternalSupplierRegistrationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("prisma") ||
    message.includes("transaction api error") ||
    message.includes("transaction expired") ||
    message.includes("invalid `") ||
    message.includes(".next")
  );
}

export async function submitVendorRegistrationAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const values = parseRegistrationFormData(formData);

    const request = await submitVendorRegistrationRequest({
      values,
      files: {
        CR: getRequiredFile(formData, "crAttachment"),
        VAT: getRequiredFile(formData, "vatAttachment"),
        COMPANY_PROFILE: getRequiredFile(formData, "companyProfileAttachment"),
        FINANCIALS: getOptionalFile(formData, "financialsAttachment"),
        BANK_CERTIFICATE: getOptionalFile(formData, "bankCertificateAttachment"),
      },
    });

    revalidatePath("/admin/vendor-registrations");

    return {
      success: "Supplier registration submitted successfully.",
      noticeKey: "vendor-registration-submitted",
      redirectTo: `/supplier-registration?submitted=${request.requestNumber}`,
    };
  } catch (error) {
    const validationState = toRegistrationValidationState(error);
    if (validationState) {
      return validationState;
    }

    if (isDuplicateRegistrationError(error)) {
      return toDuplicateRegistrationState();
    }

    const fileValidationState = toRegistrationFileValidationState(error);
    if (fileValidationState) {
      return fileValidationState;
    }

    if (isInternalSupplierRegistrationError(error)) {
      await logSystemError({
        action: "SupplierRegistrationSubmit",
        error,
        severity: "ERROR",
      });

      return {
        error:
          "We could not submit the registration due to a system processing delay. Please try again.",
      };
    }

    await logSystemError({
      action: "SupplierRegistrationSubmit",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}

export async function reviewVendorRegistrationAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user)) {
      return {
        error: "You do not have permission to review vendor registrations.",
      };
    }

    const values = vendorRegistrationReviewSchema.parse({
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
      rejectionReason: formData.get("rejectionReason") || undefined,
    });

    if (values.decision === "APPROVE") {
      const result = await approveVendorRegistrationRequest({
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        values,
      });

      revalidatePath("/admin/vendor-registrations");
      revalidatePath(`/admin/vendor-registrations/${values.requestId}`);
      revalidatePath("/admin/vendors");
      revalidatePath(`/admin/vendors/${result.vendorId}`);
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin", "layout");

      const odooSyncFailed = result.odooSyncStatus === "FAILED";

      return {
        success: odooSyncFailed
          ? "Vendor registration approved. Odoo sync failed and can be retried from this page."
          : "Vendor registration approved successfully.",
        noticeKey: odooSyncFailed
          ? "vendor-registration-approved-odoo-failed"
          : "vendor-registration-approved",
        redirectTo: `/admin/vendor-registrations/${values.requestId}?notice=${
          odooSyncFailed
            ? "vendor-registration-approved-odoo-failed"
            : "vendor-registration-approved"
        }`,
      };
    }

    await rejectVendorRegistrationRequest({
      userId: session.user.id,
      values,
    });

    revalidatePath("/admin/vendor-registrations");
    revalidatePath(`/admin/vendor-registrations/${values.requestId}`);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin", "layout");

    return {
      success: "Vendor registration rejected successfully.",
      noticeKey: "vendor-registration-rejected",
      redirectTo: `/admin/vendor-registrations/${values.requestId}?notice=vendor-registration-rejected`,
    };
  } catch (error) {
    await logSystemError({
      action: "SupplierRegistrationReview",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}

export async function replaceVendorRegistrationAttachmentAction(
  formData: FormData,
): Promise<void> {
  const redirectTo = String(
    formData.get("redirectTo") ?? "/admin/vendor-registrations",
  );
  let nextUrl = withNotice(redirectTo, "attachment-updated");

  try {
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user)) {
      nextUrl = withNotice(redirectTo, "attachment-update-denied");
    } else {
      const attachmentId = String(formData.get("attachmentId") ?? "");
      const file = formData.get("attachmentFile");

      if (!attachmentId) {
        throw new Error("Attachment record is missing.");
      }

      if (!(file instanceof File) || file.size === 0) {
        throw new Error("Please choose a replacement file.");
      }

      assertValidSupplierRegistrationFile(file, "replacementAttachment");

      const result = await replaceVendorRegistrationAttachment({
        attachmentId,
        file,
        userId: session.user.id,
      });

      revalidatePath("/admin/vendor-registrations");
      revalidatePath(`/admin/vendor-registrations/${result.requestId}`);
    }
  } catch (error) {
    await logSystemError({
      action: "VendorRegistrationAttachmentReplace",
      error,
      severity: "ERROR",
      context: {
        redirectTo,
        attachmentId: String(formData.get("attachmentId") ?? ""),
      },
    });

    nextUrl = withNotice(redirectTo, "attachment-update-failed");
  }

  redirect(nextUrl);
}

export async function retryOdooVendorSyncAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user)) {
      return {
        error: "You do not have permission to sync vendors with Odoo.",
      };
    }

    const targetType = String(formData.get("targetType") ?? "");
    const targetId = String(formData.get("targetId") ?? "");
    const vendorId = String(formData.get("vendorId") ?? "");
    const redirectTo = String(formData.get("redirectTo") ?? "");

    if (targetType !== "registration" && targetType !== "vendor") {
      return {
        error: "Odoo sync target type is invalid.",
      };
    }

    if (!targetId || !vendorId) {
      return {
        error: "Odoo sync target is missing.",
      };
    }

    const result = await retryVendorOdooSync({
      vendorId,
      registrationRequestId: targetType === "registration" ? targetId : null,
      userId: session.user.id,
    });

    revalidatePath("/admin/vendor-registrations");
    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/${vendorId}`);

    if (targetType === "registration") {
      revalidatePath(`/admin/vendor-registrations/${targetId}`);
    }

    revalidatePath("/admin", "layout");

    if (result.status === "FAILED") {
      return {
        error: `Odoo sync failed. ${result.error}`,
        redirectTo: redirectTo
          ? withNotice(redirectTo, "odoo-sync-failed")
          : undefined,
      };
    }

    return {
      success: "Vendor synced with Odoo successfully.",
      redirectTo: redirectTo
        ? withNotice(redirectTo, "odoo-sync-synced")
        : undefined,
    };
  } catch (error) {
    await logSystemError({
      action: "OdooVendorSyncRetry",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}

export async function testOdooConnectionAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user)) {
      return {
        error: "You do not have permission to test Odoo connectivity.",
      };
    }

    const result = await testOdooConnection();

    if (result.status === "CONNECTED") {
      return {
        success: `Connected as UID: ${result.uid}. Database: ${result.db}. URL: ${result.url}. res.partner count: ${result.partnerCount ?? "unavailable"}.`,
      };
    }

    await logSystemError({
      action: "OdooConnectionTest",
      error: new Error(result.error),
      userId: session.user.id,
      severity: "WARNING",
      context: {
        odooDiagnostics: result.diagnostics,
      },
    });

    return {
      error: `Failed: ${result.error}`,
    };
  } catch (error) {
    await logSystemError({
      action: "OdooConnectionTest",
      error,
      severity: "ERROR",
    });

    return toActionState(error);
  }
}
