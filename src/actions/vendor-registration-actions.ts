"use server";

import { revalidatePath } from "next/cache";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { vendorRegistrationReviewSchema, vendorRegistrationSubmissionSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";
import {
  approveVendorRegistrationRequest,
  rejectVendorRegistrationRequest,
  submitVendorRegistrationRequest,
} from "@/server/services/vendor-registration-service";
import { logSystemError } from "@/server/services/system-error-service";

function getRequiredFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value;
}

function getOptionalFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  return value;
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

      return {
        success: "Vendor registration approved successfully.",
        noticeKey: "vendor-registration-approved",
        redirectTo: `/admin/vendor-registrations/${values.requestId}?notice=vendor-registration-approved`,
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
