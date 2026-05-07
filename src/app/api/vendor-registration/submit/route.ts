import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { ActionState } from "@/lib/types";
import { vendorRegistrationSubmissionSchema } from "@/lib/validation";
import { logSystemError } from "@/server/services/system-error-service";
import { submitVendorRegistrationRequest } from "@/server/services/vendor-registration-service";

export const runtime = "nodejs";

const MAX_SPECIFIC_CITY_SELECTIONS = 250;
const MAX_REASONABLE_TEXT_FIELD_BYTES = 5000;
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

const FILE_PAYLOAD_FIELD_NAMES = new Set([
  "crattachment",
  "vatattachment",
  "companyprofileattachment",
  "financialsattachment",
  "bankcertificateattachment",
]);

type ParsedRegistrationSubmission = z.infer<
  typeof vendorRegistrationSubmissionSchema
>;
type SubmitPayload = Record<string, unknown>;

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

function readString(payload: SubmitPayload, fieldName: string) {
  const value = payload[fieldName];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function readOptionalString(payload: SubmitPayload, fieldName: string) {
  const value = readString(payload, fieldName);

  return value?.trim() ? value : undefined;
}

function readStringArray(payload: SubmitPayload, fieldName: string) {
  const value = payload[fieldName];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (typeof item === "number" || typeof item === "boolean") {
        return String(item);
      }

      return "";
    })
    .filter(Boolean);
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

function validatePayloadShape(payload: SubmitPayload): ActionState | null {
  const fieldErrors: Record<string, string[]> = {};
  const coverageScope = readString(payload, "coverageScope") ?? "";
  const cityIds = readStringArray(payload, "cityIds");

  if (
    coverageScope === "SPECIFIC_CITIES" &&
    cityIds.length > MAX_SPECIFIC_CITY_SELECTIONS
  ) {
    fieldErrors.cityIds = [
      `Select ${MAX_SPECIFIC_CITY_SELECTIONS} cities or fewer for specific city coverage.`,
    ];
  }

  for (const [fieldName, value] of Object.entries(payload)) {
    const normalizedFieldName = normalizePayloadFieldName(fieldName);

    if (FILE_PAYLOAD_FIELD_NAMES.has(normalizedFieldName)) {
      fieldErrors[fieldName] = [
        "Files are not submitted through this form. Please email documents after submission.",
      ];
      continue;
    }

    if (Array.isArray(value)) {
      if (OPTION_PAYLOAD_FIELD_NAMES.has(normalizedFieldName)) {
        fieldErrors[fieldName] = [
          "Option list data is not allowed in the final submission. Please refresh and submit again.",
        ];
        continue;
      }

      if (
        value.some(
          (item) =>
            item !== null &&
            typeof item === "object",
        )
      ) {
        fieldErrors[fieldName] = [
          "Only selected IDs are allowed in the final submission.",
        ];
      }

      continue;
    }

    if (value !== null && typeof value === "object") {
      fieldErrors[fieldName] = [
        "Object data is not allowed in the final submission.",
      ];
      continue;
    }

    if (
      typeof value === "string" &&
      looksLikeSerializedOptionList(fieldName, value)
    ) {
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

function parseRegistrationPayload(payload: SubmitPayload):
  | {
      success: true;
      values: ParsedRegistrationSubmission;
    }
  | {
      success: false;
      state: ActionState;
    } {
  const result = vendorRegistrationSubmissionSchema.safeParse({
    companyName: readString(payload, "companyName"),
    legalName: readString(payload, "legalName"),
    companyEmail: readString(payload, "companyEmail"),
    companyPhone: readString(payload, "companyPhone"),
    website: readOptionalString(payload, "website"),
    crNumber: readString(payload, "crNumber"),
    vatNumber: readString(payload, "vatNumber"),
    countryCode: readString(payload, "countryCode"),
    coverageScope: readString(payload, "coverageScope"),
    cityIds: readStringArray(payload, "cityIds"),
    categoryId: readString(payload, "categoryId"),
    subcategoryIds: readStringArray(payload, "subcategoryIds"),
    addressLine1: readString(payload, "addressLine1"),
    addressLine2: readOptionalString(payload, "addressLine2"),
    district: readString(payload, "district"),
    region: readOptionalString(payload, "region"),
    postalCode: readString(payload, "postalCode"),
    poBox: readOptionalString(payload, "poBox"),
    businessDescription: readString(payload, "businessDescription"),
    servicesOverview: readString(payload, "servicesOverview"),
    yearsInBusiness: readString(payload, "yearsInBusiness"),
    employeeCount: readString(payload, "employeeCount"),
    reference1: {
      name: readString(payload, "reference1Name"),
      companyName: readString(payload, "reference1CompanyName"),
      email: readString(payload, "reference1Email"),
      phone: readString(payload, "reference1Phone"),
      title: readString(payload, "reference1Title"),
    },
    reference2: {
      name: readString(payload, "reference2Name"),
      companyName: readString(payload, "reference2CompanyName"),
      email: readString(payload, "reference2Email"),
      phone: readString(payload, "reference2Phone"),
      title: readString(payload, "reference2Title"),
    },
    reference3: {
      name: readString(payload, "reference3Name"),
      companyName: readString(payload, "reference3CompanyName"),
      email: readString(payload, "reference3Email"),
      phone: readString(payload, "reference3Phone"),
      title: readString(payload, "reference3Title"),
    },
    bankName: readString(payload, "bankName"),
    accountName: readString(payload, "accountName"),
    iban: readString(payload, "iban"),
    swiftCode: readString(payload, "swiftCode"),
    bankAccountNumber: readOptionalString(payload, "bankAccountNumber"),
    additionalInformation: readOptionalString(payload, "additionalInformation"),
    declarationName: readString(payload, "declarationName"),
    declarationTitle: readString(payload, "declarationTitle"),
    declarationAccepted: readString(payload, "declarationAccepted"),
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

    const payload = (await request.json().catch(() => null)) as
      | SubmitPayload
      | null;

    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      return jsonActionState(
        {
          error: "Invalid registration payload. Please refresh and submit again.",
        },
        400,
      );
    }

    const keys = Object.keys(payload).sort();

    console.info("[supplier-registration-submit-api] JSON payload received", {
      keys,
      selectedCities: readStringArray(payload, "cityIds").length,
      selectedSubcategories: readStringArray(payload, "subcategoryIds").length,
      files: 0,
    });

    const payloadShapeState = validatePayloadShape(payload);

    if (payloadShapeState) {
      return jsonActionState(payloadShapeState, 400);
    }

    const parsedRegistration = parseRegistrationPayload(payload);

    if (!parsedRegistration.success) {
      return jsonActionState(parsedRegistration.state, 400);
    }

    const createdRequest = await submitVendorRegistrationRequest({
      values: parsedRegistration.values,
    });

    revalidatePath("/admin/vendor-registrations");

    console.info("[supplier-registration] final submit success", {
      requestNumber: createdRequest.requestNumber,
      emailWarning: createdRequest.emailWarning ?? null,
      documents: "pending-by-email",
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
