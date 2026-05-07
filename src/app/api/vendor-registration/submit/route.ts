import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { ActionState } from "@/lib/types";
import { vendorRegistrationSubmissionSchema } from "@/lib/validation";
import { logSystemError } from "@/server/services/system-error-service";
import { submitVendorRegistrationRequest } from "@/server/services/vendor-registration-service";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const MAX_SPECIFIC_CITY_SELECTIONS = 250;
const MAX_REASONABLE_TEXT_FIELD_BYTES = 5000;
const FILE_TOO_LARGE_MESSAGE =
  "File is too large. Maximum allowed size is 10MB.";
const GENERIC_SUBMIT_ERROR =
  "We could not submit the registration. Please try again or contact procurement.";
const DUPLICATE_VENDOR_REGISTRATION_MESSAGE =
  "A registration already exists with the same CR, VAT, or email.";

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

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const ATTACHMENT_FIELDS = [
  {
    fieldName: "crAttachment",
    documentType: "CR",
    label: "CR",
    required: true,
  },
  {
    fieldName: "vatAttachment",
    documentType: "VAT",
    label: "VAT",
    required: true,
  },
  {
    fieldName: "companyProfileAttachment",
    documentType: "COMPANY_PROFILE",
    label: "Company Profile",
    required: true,
  },
  {
    fieldName: "financialsAttachment",
    documentType: "FINANCIALS",
    label: "Financials",
    required: false,
  },
  {
    fieldName: "bankCertificateAttachment",
    documentType: "BANK_CERTIFICATE",
    label: "Bank Certificate",
    required: false,
  },
] as const;

type ParsedRegistrationSubmission = z.infer<
  typeof vendorRegistrationSubmissionSchema
>;
type AttachmentDocumentType = (typeof ATTACHMENT_FIELDS)[number]["documentType"];

function jsonActionState(state: ActionState, status = 200) {
  return Response.json(state, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
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

function validatePayloadShape(formData: FormData): ActionState | null {
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

  console.warn("[supplier-registration-submit-api] payload blocked", {
    fields: Object.keys(fieldErrors),
  });

  return {
    error: "The registration payload is too large. Please refresh and submit again.",
    fieldErrors,
  };
}

function parseRegistrationFormData(formData: FormData):
  | {
      success: true;
      values: ParsedRegistrationSubmission;
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

    console.warn("[supplier-registration-submit-api] validation failed", {
      fields: Object.keys(fieldErrors),
    });

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

function isAllowedFile(file: File) {
  const fileName = file.name.trim().toLowerCase();

  return (
    ALLOWED_FILE_TYPES.has(file.type) ||
    ALLOWED_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  );
}

function sanitizeAttachmentFileName(fileName: string, fallback: string) {
  const safeName = fileName
    .trim()
    .replace(/[^\w .()\-]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 160);

  return safeName || fallback;
}

function getFileSizeMb(file: File) {
  return Number((file.size / (1024 * 1024)).toFixed(2));
}

async function collectEmailOnlyAttachments(formData: FormData): Promise<
  | {
      success: true;
      emailAttachments: Array<{ filename: string; content: Buffer }>;
      emailOnlyAttachments: Array<{
        documentType: AttachmentDocumentType;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
      }>;
    }
  | {
      success: false;
      state: ActionState;
    }
> {
  const fieldErrors: Record<string, string[]> = {};
  const emailAttachments: Array<{ filename: string; content: Buffer }> = [];
  const emailOnlyAttachments: Array<{
    documentType: AttachmentDocumentType;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }> = [];
  let totalSizeBytes = 0;

  for (const field of ATTACHMENT_FIELDS) {
    const value = formData.get(field.fieldName);

    if (!(value instanceof File) || value.size === 0) {
      if (field.required) {
        fieldErrors[field.fieldName] = [`${field.label} is required.`];
      }
      continue;
    }

    console.info("[supplier-registration-submit-api] file received", {
      documentType: field.documentType,
      fileName: value.name,
      mimeType: value.type || "unknown",
      fileSizeMB: getFileSizeMb(value),
    });

    if (value.size > MAX_FILE_BYTES) {
      fieldErrors[field.fieldName] = [FILE_TOO_LARGE_MESSAGE];
      continue;
    }

    if (!isAllowedFile(value)) {
      fieldErrors[field.fieldName] = [
        `${field.label} must be a PDF, JPG, or PNG file.`,
      ];
      continue;
    }

    totalSizeBytes += value.size;

    if (totalSizeBytes > MAX_TOTAL_FILE_BYTES) {
      fieldErrors[field.fieldName] = [
        "Total upload size is too large. Maximum allowed total size is 20MB.",
      ];
      continue;
    }

    const fileName = sanitizeAttachmentFileName(
      value.name,
      `${field.documentType}.pdf`,
    );
    const mimeType = value.type || "application/octet-stream";
    const content = Buffer.from(await value.arrayBuffer());

    emailAttachments.push({
      filename: fileName,
      content,
    });
    emailOnlyAttachments.push({
      documentType: field.documentType,
      fileName,
      mimeType,
      sizeBytes: value.size,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    console.warn("[supplier-registration-submit-api] file validation failed", {
      fields: Object.keys(fieldErrors),
    });

    return {
      success: false,
      state: {
        error:
          Object.values(fieldErrors).flatMap((messages) => messages)[0] ??
          "Please review the highlighted document uploads.",
        fieldErrors,
      },
    };
  }

  return {
    success: true,
    emailAttachments,
    emailOnlyAttachments,
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
      ["companyEmail", "crNumber", "vatNumber", "vendorEmail", "vendorId"].includes(
        field,
      ),
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

async function logSubmitError(
  error: unknown,
  context?: Record<string, unknown>,
) {
  console.error("[supplier-registration-submit-api] failed", {
    errorMessage: error instanceof Error ? error.message : "Unknown error",
    ...context,
  });

  await logSystemError({
    action: "SupplierRegistrationSubmitApi",
    error,
    severity: "ERROR",
    context,
  }).catch(() => undefined);
}

export async function POST(request: Request) {
  try {
    console.info("[supplier-registration] final submit started");

    const formData = await request.formData();
    const keys = Array.from(new Set(Array.from(formData.keys()))).sort();
    const fileFields = [...formData.entries()]
      .filter(([, value]) => value instanceof File && value.size > 0)
      .map(([key, value]) => ({
        key,
        sizeMB: getFileSizeMb(value as File),
      }));

    console.info("[supplier-registration-submit-api] payload received", {
      keys,
      fileFields,
      selectedCities: formData.getAll("cityIds").length,
      selectedSubcategories: formData.getAll("subcategoryIds").length,
    });

    const payloadShapeState = validatePayloadShape(formData);

    if (payloadShapeState) {
      return jsonActionState(payloadShapeState, 400);
    }

    const parsedRegistration = parseRegistrationFormData(formData);

    if (!parsedRegistration.success) {
      return jsonActionState(parsedRegistration.state, 400);
    }

    const collectedAttachments = await collectEmailOnlyAttachments(formData);

    if (!collectedAttachments.success) {
      return jsonActionState(collectedAttachments.state, 400);
    }

    const createdRequest = await submitVendorRegistrationRequest({
      values: parsedRegistration.values,
      emailOnlyAttachments: collectedAttachments.emailOnlyAttachments,
      emailAttachments: collectedAttachments.emailAttachments,
    });

    revalidatePath("/admin/vendor-registrations");

    console.info("[supplier-registration] final submit success", {
      requestNumber: createdRequest.requestNumber,
      emailWarning: createdRequest.emailWarning ?? null,
    });

    return jsonActionState({
      success: "Supplier registration submitted successfully.",
      noticeKey: "vendor-registration-submitted",
      redirectTo: `/supplier-registration?submitted=${createdRequest.requestNumber}`,
    });
  } catch (error) {
    if (isDuplicateRegistrationError(error)) {
      console.warn("[supplier-registration-submit-api] duplicate blocked", {
        fields: ["crNumber", "vatNumber", "companyEmail"],
      });

      return jsonActionState(
        {
          error: DUPLICATE_VENDOR_REGISTRATION_MESSAGE,
          fieldErrors: {
            crNumber: [DUPLICATE_VENDOR_REGISTRATION_MESSAGE],
            vatNumber: [DUPLICATE_VENDOR_REGISTRATION_MESSAGE],
            companyEmail: [DUPLICATE_VENDOR_REGISTRATION_MESSAGE],
          },
        },
        409,
      );
    }

    await logSubmitError(error, {
      reason: "unhandled",
    });

    return jsonActionState(
      {
        error: GENERIC_SUBMIT_ERROR,
      },
      500,
    );
  }
}
