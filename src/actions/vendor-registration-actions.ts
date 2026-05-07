"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type VendorRegistrationAttachmentType } from "@prisma/client";
import type { z } from "zod";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { vendorRegistrationReviewSchema, vendorRegistrationSubmissionSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";
import { testOdooConnection } from "@/server/services/odoo-service";
import {
  approveVendorRegistrationRequest,
  isVendorRegistrationAttachmentUploadError,
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
const FILE_TOO_LARGE_MESSAGE = "File is too large. Maximum allowed size is 10MB.";
const SUPPLIER_REGISTRATION_UPLOAD_ERROR =
  "Document upload failed. Please try again or contact procurement.";
const SUPPLIER_REGISTRATION_GENERIC_ERROR =
  "We could not submit the registration. Please try again or contact procurement.";
const MAX_SPECIFIC_CITY_SELECTIONS = 250;
const MAX_REASONABLE_TEXT_FIELD_BYTES = 5000;
const OPTION_PAYLOAD_FIELD_NAMES = new Set([
  "countries",
  "countryoptions",
  "cities",
  "cityoptions",
  "categories",
  "categoryoptions",
  "subcategories",
  "subcategoryoptions",
  "coverageoptions",
  "coverageoptionlabels",
]);
const VENDOR_REGISTRATION_ATTACHMENT_TYPES = new Set<string>([
  "CR",
  "VAT",
  "COMPANY_PROFILE",
  "FINANCIALS",
  "BANK_CERTIFICATE",
  "SIGNATURE",
  "STAMP",
]);
type ParsedVendorRegistrationSubmission = z.infer<
  typeof vendorRegistrationSubmissionSchema
>;
type UploadedRegistrationAttachmentMetadata = {
  id: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
};

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

function getFileSizeMb(file: File) {
  return Number((file.size / (1024 * 1024)).toFixed(2));
}

function logSupplierRegistrationFileWarning(input: {
  documentType: string;
  file: File;
  reason: string;
}) {
  console.warn("[supplier-registration-file-validation]", {
    action: "submitVendorRegistrationAction",
    documentType: input.documentType,
    fileName: input.file.name,
    mimeType: input.file.type || "unknown",
    fileSizeMB: getFileSizeMb(input.file),
    reason: input.reason,
  });
}

function validateSupplierRegistrationFile(file: File, fieldName: string) {
  const label = supplierRegistrationFileLabels[fieldName] ?? fieldName;

  if (file.size > MAX_SUPPLIER_REGISTRATION_FILE_BYTES) {
    logSupplierRegistrationFileWarning({
      documentType: label,
      file,
      reason: "file-too-large",
    });
    return FILE_TOO_LARGE_MESSAGE;
  }

  if (!isAllowedSupplierRegistrationFile(file)) {
    logSupplierRegistrationFileWarning({
      documentType: label,
      file,
      reason: "unsupported-file-type",
    });
    return `${label} must be a PDF, JPG, or PNG file.`;
  }

  return null;
}

function getRequiredFile(
  formData: FormData,
  fieldName: string,
  fieldErrors: Record<string, string[]>,
) {
  const value = formData.get(fieldName);
  const label = supplierRegistrationFileLabels[fieldName] ?? fieldName;

  if (!(value instanceof File) || value.size === 0) {
    fieldErrors[fieldName] = [`${label} is required.`];
    return undefined;
  }

  const validationError = validateSupplierRegistrationFile(value, fieldName);

  if (validationError) {
    fieldErrors[fieldName] = [validationError];
    return undefined;
  }

  return value;
}

function getOptionalFile(
  formData: FormData,
  fieldName: string,
  fieldErrors: Record<string, string[]>,
) {
  const value = formData.get(fieldName);

  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  const validationError = validateSupplierRegistrationFile(value, fieldName);

  if (validationError) {
    fieldErrors[fieldName] = [validationError];
    return undefined;
  }

  return value;
}

function logValidationWarning(action: string, fieldErrors: Record<string, string[]>) {
  console.warn("[server-action-validation]", {
    action,
    fields: Object.keys(fieldErrors),
  });
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

async function logSupplierRegistrationSubmitError(
  error: unknown,
  context?: {
    fieldErrors?: Record<string, string[]>;
    persist?: boolean;
    reason?: string;
  },
) {
  const errorMessage = getSafeErrorMessage(error);
  const fieldNames = context?.fieldErrors
    ? Object.keys(context.fieldErrors)
    : undefined;
  const log = context?.persist === false ? console.warn : console.error;

  log("[supplier-registration-submit]", {
    action: "submitVendorRegistrationAction",
    errorMessage,
    fields: fieldNames,
    reason: context?.reason,
  });

  if (context?.persist === false) {
    return;
  }

  try {
    await logSystemError({
      action: "SupplierRegistrationSubmit",
      error,
      severity: "ERROR",
      context: {
        reason: context?.reason,
        fields: fieldNames,
      },
    });
  } catch (loggingError) {
    console.error("[supplier-registration-submit-log-failed]", {
      action: "submitVendorRegistrationAction",
      errorMessage: getSafeErrorMessage(loggingError),
    });
  }
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

function normalizePayloadFieldName(fieldName: string) {
  return fieldName.replace(/[\s_\-[\].]/g, "").toLowerCase();
}

function looksLikeSerializedOptionList(fieldName: string, value: string) {
  const normalizedFieldName = normalizePayloadFieldName(fieldName);
  const trimmed = value.trim();

  if (
    OPTION_PAYLOAD_FIELD_NAMES.has(normalizedFieldName) &&
    (trimmed.startsWith("[") ||
      trimmed.startsWith("{") ||
      trimmed.length > MAX_REASONABLE_TEXT_FIELD_BYTES)
  ) {
    return true;
  }

  return (
    trimmed.length > MAX_REASONABLE_TEXT_FIELD_BYTES &&
    (trimmed.startsWith("[") || trimmed.startsWith("{"))
  );
}

function validateRegistrationPayloadShape(formData: FormData): ActionState | null {
  const fieldErrors: Record<string, string[]> = {};
  const coverageScope = String(formData.get("coverageScope") ?? "");
  const cityIds = formData
    .getAll("cityIds")
    .map(String)
    .filter(Boolean);

  if (
    coverageScope === "SPECIFIC_CITIES" &&
    cityIds.length > MAX_SPECIFIC_CITY_SELECTIONS
  ) {
    fieldErrors.cityIds = [
      `Select ${MAX_SPECIFIC_CITY_SELECTIONS} cities or fewer for specific city coverage.`,
    ];
  }

  for (const [fieldName, value] of formData.entries()) {
    if (value instanceof File) {
      fieldErrors[fieldName] = [
        "Files must be uploaded before final submission. Please retry the document upload.",
      ];
      continue;
    }

    if (looksLikeSerializedOptionList(fieldName, String(value))) {
      fieldErrors[fieldName] = [
        "This field contains option list data that is not allowed in the final submission. Please refresh and submit again.",
      ];
    }
  }

  if (Object.keys(fieldErrors).length === 0) {
    return null;
  }

  logValidationWarning("submitVendorRegistrationAction", fieldErrors);

  return {
    error: "The registration payload is too large. Please refresh and submit again.",
    fieldErrors,
  };
}

function toRegistrationFileValidationState(error: unknown): ActionState | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const fieldEntry = Object.entries(supplierRegistrationFileLabels).find(
    ([, label]) =>
      error.message.startsWith(`${label} `) ||
      error.message.startsWith(`${label}: `),
  );

  if (!fieldEntry) {
    return null;
  }

  const [fieldName] = fieldEntry;
  const message = error.message.includes(FILE_TOO_LARGE_MESSAGE)
    ? FILE_TOO_LARGE_MESSAGE
    : error.message;
  const fieldErrors = {
    [fieldName]: [message],
  };

  logValidationWarning("submitVendorRegistrationAction", fieldErrors);

  return {
    error: message,
    fieldErrors,
  };
}

function getFirstFieldError(fieldErrors: Record<string, string[]>) {
  return Object.values(fieldErrors)
    .flatMap((messages) => messages)
    .find(Boolean);
}

function parseRegistrationFormData(formData: FormData):
  | {
      success: true;
      values: ParsedVendorRegistrationSubmission;
    }
  | {
      success: false;
      state: ActionState;
    } {
  const result = vendorRegistrationSubmissionSchema.safeParse({
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

  if (!result.success) {
    const fieldErrors = normalizeRegistrationFieldErrors(
      result.error.flatten().fieldErrors,
    );

    logValidationWarning("submitVendorRegistrationAction", fieldErrors);

    return {
      success: false,
      state: {
        error: "Please review the highlighted fields.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    values: result.data,
  };
}

function getRequiredAttachmentMetadata(
  formData: FormData,
  fieldName: string,
  fieldErrors: Record<string, string[]>,
) {
  const metadata = getOptionalAttachmentMetadata(formData, fieldName, fieldErrors);
  const label = supplierRegistrationFileLabels[fieldName] ?? fieldName;

  if (!metadata && !fieldErrors[fieldName]) {
    fieldErrors[fieldName] = [`${label} is required.`];
  }

  return metadata;
}

function getOptionalAttachmentMetadata(
  formData: FormData,
  fieldName: string,
  fieldErrors: Record<string, string[]>,
): UploadedRegistrationAttachmentMetadata | undefined {
  const label = supplierRegistrationFileLabels[fieldName] ?? fieldName;
  const attachmentId = String(formData.get(`${fieldName}AttachmentId`) ?? "");
  const fileName = String(formData.get(`${fieldName}FileName`) ?? "");
  const mimeType = String(formData.get(`${fieldName}MimeType`) ?? "");
  const storagePath = String(formData.get(`${fieldName}StoragePath`) ?? "");
  const sizeBytesRaw = String(formData.get(`${fieldName}SizeBytes`) ?? "");

  if (!attachmentId && !fileName && !mimeType && !storagePath && !sizeBytesRaw) {
    return undefined;
  }

  const sizeBytes = Number(sizeBytesRaw);

  if (!attachmentId || !fileName || !mimeType || !storagePath || !sizeBytes) {
    fieldErrors[fieldName] = [`${label} upload metadata is incomplete.`];
    return undefined;
  }

  if (sizeBytes > MAX_SUPPLIER_REGISTRATION_FILE_BYTES) {
    fieldErrors[fieldName] = [FILE_TOO_LARGE_MESSAGE];
    return undefined;
  }

  if (!ALLOWED_SUPPLIER_REGISTRATION_FILE_TYPES.has(mimeType)) {
    const lowerName = fileName.trim().toLowerCase();
    const hasAllowedExtension = ALLOWED_SUPPLIER_REGISTRATION_FILE_EXTENSIONS.some(
      (extension) => lowerName.endsWith(extension),
    );

    if (!hasAllowedExtension) {
      fieldErrors[fieldName] = [`${label} must be a PDF, JPG, or PNG file.`];
      return undefined;
    }
  }

  if (storagePath.includes("..") || storagePath.startsWith("/")) {
    fieldErrors[fieldName] = [`${label} storage path is invalid.`];
    return undefined;
  }

  return {
    id: attachmentId,
    fileName,
    mimeType,
    storagePath,
    sizeBytes,
  };
}

function collectRegistrationAttachments(formData: FormData):
  | {
      success: true;
      attachments: {
        CR: UploadedRegistrationAttachmentMetadata;
        VAT: UploadedRegistrationAttachmentMetadata;
        COMPANY_PROFILE: UploadedRegistrationAttachmentMetadata;
        FINANCIALS?: UploadedRegistrationAttachmentMetadata;
        BANK_CERTIFICATE?: UploadedRegistrationAttachmentMetadata;
      };
    }
  | {
      success: false;
      state: ActionState;
    } {
  const fieldErrors: Record<string, string[]> = {};
  const attachments = {
    CR: getRequiredAttachmentMetadata(formData, "crAttachment", fieldErrors),
    VAT: getRequiredAttachmentMetadata(formData, "vatAttachment", fieldErrors),
    COMPANY_PROFILE: getRequiredAttachmentMetadata(
      formData,
      "companyProfileAttachment",
      fieldErrors,
    ),
    FINANCIALS: getOptionalAttachmentMetadata(formData, "financialsAttachment", fieldErrors),
    BANK_CERTIFICATE: getOptionalAttachmentMetadata(
      formData,
      "bankCertificateAttachment",
      fieldErrors,
    ),
  };

  for (const [documentType, attachment] of Object.entries(attachments)) {
    if (attachment) {
      console.info("[vendor-registration-file-mapping]", {
        documentType,
        originalFileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        storagePath: attachment.storagePath,
      });
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    logValidationWarning("submitVendorRegistrationAction", fieldErrors);

    return {
      success: false,
      state: {
        error:
          getFirstFieldError(fieldErrors) ??
          "Please review the highlighted document uploads.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    attachments: {
      CR: attachments.CR as UploadedRegistrationAttachmentMetadata,
      VAT: attachments.VAT as UploadedRegistrationAttachmentMetadata,
      COMPANY_PROFILE:
        attachments.COMPANY_PROFILE as UploadedRegistrationAttachmentMetadata,
      FINANCIALS: attachments.FINANCIALS,
      BANK_CERTIFICATE: attachments.BANK_CERTIFICATE,
    },
  };
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

function isSupplierRegistrationStorageError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("failed to upload file") ||
    message.includes("document upload") ||
    message.includes("supabase storage") ||
    message.includes("storage bucket") ||
    message.includes("bucket is missing") ||
    message.includes("invalid path specified") ||
    message.includes("storage object path") ||
    message.includes("storage bucket name") ||
    message.includes("supabase_url") ||
    message.includes("supabase_service_role_key") ||
    message.includes("fetch failed")
  );
}

export async function submitVendorRegistrationAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const payloadShapeState = validateRegistrationPayloadShape(formData);

    if (payloadShapeState) {
      await logSupplierRegistrationSubmitError(
        new Error(payloadShapeState.error ?? "Payload validation failed."),
        {
          fieldErrors: payloadShapeState.fieldErrors,
          persist: false,
          reason: "payload-shape",
        },
      );
      return payloadShapeState;
    }

    const parsedRegistration = parseRegistrationFormData(formData);

    if (!parsedRegistration.success) {
      await logSupplierRegistrationSubmitError(
        new Error(parsedRegistration.state.error ?? "Validation failed."),
        {
          fieldErrors: parsedRegistration.state.fieldErrors,
          persist: false,
          reason: "validation",
        },
      );
      return parsedRegistration.state;
    }

    const request = await submitVendorRegistrationRequest({
      values: parsedRegistration.values,
    });

    revalidatePath("/admin/vendor-registrations");

    return {
      success: "Supplier registration submitted successfully.",
      noticeKey: "vendor-registration-submitted",
      redirectTo: `/supplier-registration?submitted=${request.requestNumber}`,
    };
  } catch (error) {
    if (isDuplicateRegistrationError(error)) {
      console.warn("[supplier-registration-submit]", {
        action: "submitVendorRegistrationAction",
        errorMessage: DUPLICATE_VENDOR_REGISTRATION_MESSAGE,
        fields: ["crNumber", "vatNumber", "companyEmail"],
        reason: "duplicate",
      });
      return toDuplicateRegistrationState();
    }

    const fileValidationState = toRegistrationFileValidationState(error);
    if (fileValidationState) {
      await logSupplierRegistrationSubmitError(error, {
        fieldErrors: fileValidationState.fieldErrors,
        persist: false,
        reason: "file-validation",
      });
      return fileValidationState;
    }

    if (isVendorRegistrationAttachmentUploadError(error)) {
      await logSupplierRegistrationSubmitError(error, {
        fieldErrors: error.fieldErrors,
        reason: "document-upload",
      });

      return {
        error: SUPPLIER_REGISTRATION_UPLOAD_ERROR,
        fieldErrors: error.fieldErrors,
      };
    }

    if (isSupplierRegistrationStorageError(error)) {
      await logSupplierRegistrationSubmitError(error, {
        reason: "document-upload",
      });

      return {
        error: SUPPLIER_REGISTRATION_UPLOAD_ERROR,
      };
    }

    if (isInternalSupplierRegistrationError(error)) {
      await logSupplierRegistrationSubmitError(error, {
        reason: "internal-processing",
      });

      return {
        error:
          "We could not submit the registration due to a system processing delay. Please try again.",
      };
    }

    await logSupplierRegistrationSubmitError(error, {
      reason: "unhandled",
    });

    return {
      error: SUPPLIER_REGISTRATION_GENERIC_ERROR,
    };
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

    const parsedReview = vendorRegistrationReviewSchema.safeParse({
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
      rejectionReason: formData.get("rejectionReason") || undefined,
    });

    if (!parsedReview.success) {
      const fieldErrors = parsedReview.error.flatten().fieldErrors;
      logValidationWarning("reviewVendorRegistrationAction", fieldErrors);

      return {
        error: "Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const values = parsedReview.data;

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
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageVendorGovernance(session.user)) {
      return {
        error: "You do not have permission to replace supplier registration attachments.",
      };
    }

    const attachmentId = String(formData.get("attachmentId") ?? "");
    const expectedAttachmentType = String(
      formData.get("expectedAttachmentType") ?? "",
    );
    const file = formData.get("attachmentFile");

    if (!attachmentId) {
      return {
        error: "Attachment update failed. Please try again.",
        fieldErrors: {
          attachmentId: ["Attachment record is missing."],
        },
      };
    }

    if (!VENDOR_REGISTRATION_ATTACHMENT_TYPES.has(expectedAttachmentType)) {
      return {
        error: "Attachment update failed. Please try again.",
        fieldErrors: {
          expectedAttachmentType: ["Attachment document type is invalid."],
        },
      };
    }

    if (!(file instanceof File) || file.size === 0) {
      return {
        error: "Please choose a replacement file.",
        fieldErrors: {
          attachmentFile: ["Please choose a replacement file."],
        },
      };
    }

    const fileError = validateSupplierRegistrationFile(
      file,
      "replacementAttachment",
    );

    if (fileError) {
      return {
        error: fileError,
        fieldErrors: {
          attachmentFile: [fileError],
        },
      };
    }

    const result = await replaceVendorRegistrationAttachment({
      attachmentId,
      expectedType: expectedAttachmentType as VendorRegistrationAttachmentType,
      file,
      userId: session.user.id,
    });

    revalidatePath("/admin/vendor-registrations");
    revalidatePath(`/admin/vendor-registrations/${result.requestId}`);

    return {
      success: "Attachment updated successfully.",
      noticeKey: "attachment-updated",
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Attachment document type mismatch")
    ) {
      await logSystemError({
        action: "VendorRegistrationAttachmentReplace",
        error,
        severity: "WARNING",
        context: {
          attachmentId: String(formData.get("attachmentId") ?? ""),
          expectedAttachmentType: String(
            formData.get("expectedAttachmentType") ?? "",
          ),
        },
      });

      return {
        error: error.message,
        fieldErrors: {
          expectedAttachmentType: [error.message],
        },
      };
    }

    await logSystemError({
      action: "VendorRegistrationAttachmentReplace",
      error,
      severity: "ERROR",
      context: {
        attachmentId: String(formData.get("attachmentId") ?? ""),
      },
    });

    return {
      error: "Attachment update failed. Please try again.",
    };
  }
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
