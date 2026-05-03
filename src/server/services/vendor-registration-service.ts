import crypto from "node:crypto";
import { createElement } from "react";
import { Prisma, VendorRegistrationStatus } from "@prisma/client";
import { z } from "zod";

import {
  PROCUREMENT_TEAM_EMAILS,
} from "@/lib/constants";
import { buildVendorRegistrationVerificationUrl, compactText } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { formatSupplierCertificateCode } from "@/lib/vendor-registration-certificate";
import {
  vendorRegistrationReviewSchema,
  vendorRegistrationSubmissionSchema,
} from "@/lib/validation";
import { createAuditLog } from "@/server/services/audit-service";
import { createWorkflowNotification } from "@/server/services/notification-service";
import { sendDirectWorkflowEmail } from "@/server/services/email-service";
import {
  uploadVendorRegistrationAttachment,
  uploadVendorRegistrationCertificatePdf,
} from "@/server/services/storage-service";
import { logSystemError } from "@/server/services/system-error-service";
import { generateVendorRegistrationCertificatePdfBuffer } from "@/server/services/vendor-registration-pdf-service";
import { ensureVendorCatalogData } from "@/server/services/vendor-catalog-service";
import { syncVendorToOdoo } from "@/server/services/vendor-odoo-sync-service";

type ParsedRegistrationSubmission = z.infer<typeof vendorRegistrationSubmissionSchema>;
type ParsedRegistrationReview = z.infer<typeof vendorRegistrationReviewSchema>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function randomRequestNumber() {
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `VR-${stamp}-${suffix}`;
}

function buildSupplierId(countryCode: string, categoryCode: string, serial: number) {
  return `${countryCode.trim().toUpperCase()}-${categoryCode
    .trim()
    .toUpperCase()}-${String(serial).padStart(6, "0")}`;
}

async function reserveVendorRegistrationCertificateCode(
  tx: Prisma.TransactionClient,
  issuedAt: Date,
) {
  const year = issuedAt.getFullYear();
  const sequenceState = await tx.vendorRegistrationCertificateSequence.upsert({
    where: {
      year,
    },
    create: {
      year,
      nextSerial: 2,
    },
    update: {
      nextSerial: {
        increment: 1,
      },
    },
    select: {
      nextSerial: true,
    },
  });
  const sequence = sequenceState.nextSerial - 1;

  return {
    certificateCode: formatSupplierCertificateCode(year, sequence),
    certificateYear: year,
    certificateSequence: sequence,
  };
}

export async function ensureVendorRegistrationCertificateCode(requestId: string) {
  return prisma.$transaction(
    async (tx) => {
      const request = await tx.vendorRegistrationRequest.findUnique({
        where: {
          id: requestId,
        },
        select: {
          id: true,
          status: true,
          certificateCode: true,
          certificateYear: true,
          certificateSequence: true,
          reviewedAt: true,
          submittedAt: true,
        },
      });

      if (!request) {
        throw new Error("Vendor registration request not found.");
      }

      if (request.certificateCode) {
        return {
          certificateCode: request.certificateCode,
          certificateYear: request.certificateYear,
          certificateSequence: request.certificateSequence,
        };
      }

      if (request.status !== VendorRegistrationStatus.APPROVED) {
        throw new Error(
          "Certificate code can only be generated for approved vendor registrations.",
        );
      }

      const reservedCode = await reserveVendorRegistrationCertificateCode(
        tx,
        request.reviewedAt ?? request.submittedAt ?? new Date(),
      );

      await tx.vendorRegistrationRequest.update({
        where: {
          id: request.id,
        },
        data: reservedCode,
      });

      return reservedCode;
    },
    {
      timeout: 15000,
    },
  );
}

function buildLockKeys(countryCode: string, categoryCode: string) {
  const digest = crypto
    .createHash("sha256")
    .update(
      `${countryCode.trim().toUpperCase()}:${categoryCode.trim().toUpperCase()}`,
    )
    .digest();

  return {
    left: digest.readInt32BE(0),
    right: digest.readInt32BE(4),
  };
}

async function acquireSupplierIdSequence(
  tx: Prisma.TransactionClient,
  countryCode: string,
  categoryCode: string,
) {
  const lock = buildLockKeys(countryCode, categoryCode);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lock.left}, ${lock.right})`;

  await tx.supplierIdSequence.upsert({
    where: {
      countryCode_categoryCode: {
        countryCode,
        categoryCode,
      },
    },
    create: {
      countryCode,
      categoryCode,
    },
    update: {},
  });

  const nextSequence = await tx.supplierIdSequence.update({
    where: {
      countryCode_categoryCode: {
        countryCode,
        categoryCode,
      },
    },
    data: {
      nextSerial: {
        increment: 1,
      },
    },
    select: {
      nextSerial: true,
    },
  });

  return nextSequence.nextSerial - 1;
}

function isUniqueConstraintError(error: unknown, fieldName: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes(fieldName)
  );
}

function getCategoryCode(category: { externalKey: string | null }) {
  const categoryCode = category.externalKey?.trim();

  if (!categoryCode) {
    throw new Error("The selected vendor category must have a supplier code.");
  }

  return categoryCode;
}

async function getRegistrationLookupData() {
  await ensureVendorCatalogData();

  const [countries, categories] = await Promise.all([
    prisma.country.findMany({
      where: {
        isActive: true,
      },
      select: {
        code: true,
        name: true,
        regionGroup: true,
        cities: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    }),
    prisma.vendorCategory.findMany({
      select: {
        id: true,
        externalKey: true,
        subcategories: {
          select: {
            id: true,
            externalKey: true,
            categoryId: true,
          },
        },
      },
    }),
  ]);

  return {
    countries,
    categories,
  };
}

function expandCoverageCities(input: {
  countries: Awaited<ReturnType<typeof getRegistrationLookupData>>["countries"];
  countryCode: string;
  coverageScope: ParsedRegistrationSubmission["coverageScope"];
  cityIds: string[];
}) {
  const selectedCountry = input.countries.find(
    (country) => country.code === input.countryCode,
  );

  if (!selectedCountry) {
    throw new Error("The selected country is not available.");
  }

  if (input.coverageScope === "SPECIFIC_CITIES") {
    return input.cityIds;
  }

  if (input.coverageScope === "ALL_COUNTRY") {
    return selectedCountry.cities.map((city) => city.id);
  }

  const regionGroup = input.coverageScope;
  const countryCities = input.countries
    .filter((country) => country.regionGroup === regionGroup)
    .flatMap((country) => country.cities.map((city) => city.id));

  if (input.coverageScope === "GLOBAL") {
    return input.countries.flatMap((country) =>
      country.cities.map((city) => city.id),
    );
  }

  return countryCities;
}

async function validateDuplicateRegistration(values: ParsedRegistrationSubmission) {
  const normalizedEmail = normalizeEmail(values.companyEmail);
  const duplicateRegistration = await prisma.vendorRegistrationRequest.findFirst({
    where: {
      OR: [
        {
          companyEmail: normalizedEmail,
        },
        {
          crNumber: values.crNumber,
        },
        {
          vatNumber: values.vatNumber,
        },
      ],
      status: {
        in: ["PENDING_REVIEW", "APPROVED"],
      },
    },
    select: {
      id: true,
      requestNumber: true,
      companyName: true,
    },
  });

  if (duplicateRegistration) {
    throw new Error(
      "A vendor registration already exists with the same CR, VAT, or email address.",
    );
  }

  const duplicateVendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        {
          vendorEmail: normalizedEmail,
        },
        {
          vendorId: values.crNumber,
        },
      ],
    },
    select: {
      id: true,
      vendorName: true,
    },
  });

  if (duplicateVendor) {
    throw new Error(
      "A vendor already exists in the master registry with the same CR or email address.",
    );
  }
}

async function createUniqueRequestNumber() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const requestNumber = randomRequestNumber();
    const existingRequest = await prisma.vendorRegistrationRequest.findUnique({
      where: {
        requestNumber,
      },
      select: {
        id: true,
      },
    });

    if (!existingRequest) {
      return requestNumber;
    }
  }

  throw new Error("Could not create supplier number. Please try again.");
}

async function validateRegistrationCatalog(values: ParsedRegistrationSubmission) {
  const lookup = await getRegistrationLookupData();
  const selectedCategory = lookup.categories.find(
    (category) => category.id === values.categoryId,
  );

  if (!selectedCategory) {
    throw new Error("The selected vendor category was not found.");
  }

  const primarySubcategory = selectedCategory.subcategories.find(
    (subcategory) => subcategory.id === values.subcategoryIds[0],
  );

  if (!primarySubcategory) {
    throw new Error("The selected primary subcategory was not found.");
  }

  if (primarySubcategory.categoryId !== selectedCategory.id) {
    throw new Error("The selected subcategory does not belong to this category.");
  }

  const invalidSubcategory = values.subcategoryIds.find(
    (subcategoryId) =>
      !selectedCategory.subcategories.some(
        (subcategory) => subcategory.id === subcategoryId,
      ),
  );

  if (invalidSubcategory) {
    throw new Error("All selected subcategories must belong to the selected category.");
  }

  const selectedCountry = lookup.countries.find(
    (country) => country.code === values.countryCode,
  );

  if (!selectedCountry) {
    throw new Error("The selected country was not found.");
  }

  return {
    lookup,
    selectedCategory,
    primarySubcategory,
    selectedCountry,
  };
}

async function buildAttachmentRecord(input: {
  requestNumber: string;
  attachmentId?: string;
  type: "CR" | "VAT" | "COMPANY_PROFILE" | "FINANCIALS" | "BANK_CERTIFICATE" | "SIGNATURE" | "STAMP";
  file: File;
}) {
  const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

  if (!allowedMimeTypes.has(input.file.type)) {
    throw new Error(
      `${input.type} must be a PDF, JPG, or PNG file.`,
    );
  }

  const maxSizeBytes = 10 * 1024 * 1024;
  if (input.file.size > maxSizeBytes) {
    throw new Error(`${input.type} exceeds the 10 MB file size limit.`);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const attachmentId = input.attachmentId ?? crypto.randomUUID();
  const uploadResult = await uploadVendorRegistrationAttachment({
    requestNumber: input.requestNumber,
    attachmentId,
    attachmentType: input.type,
    originalFileName: input.file.name || `${input.type}.pdf`,
    buffer,
    mimeType: input.file.type,
  });

  const storagePath =
    uploadResult.path ??
    `vendor-registrations/${input.requestNumber}/${input.type}/${Date.now()}-${input.file.name}`;

  return {
    id: attachmentId,
    fileName: input.file.name || `${input.type}.pdf`,
    mimeType: input.file.type,
    storagePath,
    sizeBytes: input.file.size,
  };
}

async function notifyVendorRegistrationSubmitted(input: {
  requestId: string;
  companyName: string;
}) {
  try {
    await prisma.$transaction(
      async (tx) => {
        await createWorkflowNotification(tx, {
          type: "SYSTEM_ALERT",
          title: "Vendor registration submitted",
          message: `${input.companyName} submitted a new supplier registration request.`,
          vendorId: null,
          href: `/admin/vendor-registrations/${input.requestId}`,
          routingStrategies: ["procurement_chain"],
          routingContext: {
            procurementChainEmails: Array.from(PROCUREMENT_TEAM_EMAILS),
          },
          eventKey: "SYSTEM_ALERT",
          severity: "ACTION_REQUIRED",
          dedupeKey: `vendor-registration:${input.requestId}:submitted`,
          cooldownMinutes: 60,
        });
      },
      {
        timeout: 15000,
      },
    );
  } catch (error) {
    console.warn("[vendor-registration] submitted notification failed", {
      requestId: input.requestId,
      companyName: input.companyName,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    await logSystemError({
      action: "VendorRegistrationSubmittedNotification",
      error,
      severity: "WARNING",
      context: {
        requestId: input.requestId,
        companyName: input.companyName,
      },
    }).catch(() => undefined);
  }
}

export async function submitVendorRegistrationRequest(input: {
  values: ParsedRegistrationSubmission;
  files: Partial<
    Record<
      | "CR"
      | "VAT"
      | "COMPANY_PROFILE"
      | "FINANCIALS"
      | "BANK_CERTIFICATE",
      File | undefined
    >
  >;
}) {
  const { lookup, selectedCategory, primarySubcategory, selectedCountry } =
    await validateRegistrationCatalog(input.values);
  await validateDuplicateRegistration(input.values);

  const expandedCityIds = expandCoverageCities({
    countries: lookup.countries,
    countryCode: input.values.countryCode,
    coverageScope: input.values.coverageScope,
    cityIds: input.values.cityIds,
  });
  const requestNumber = await createUniqueRequestNumber();
  const formSnapshot = {
    ...input.values,
    cityIds: expandedCityIds,
    selectedSubcategoryCodes: input.values.subcategoryIds,
    attachments: Object.fromEntries(
      Object.entries(input.files)
        .filter((entry): entry is [string, File] => Boolean(entry[1]))
        .map(([type, file]) => [
          type,
          {
            name: file.name,
            type: file.type,
            size: file.size,
          },
        ]),
    ),
  };
  const attachmentEntries = await Promise.all(
    (Object.entries(input.files) as Array<
      [
        "CR" | "VAT" | "COMPANY_PROFILE" | "FINANCIALS" | "BANK_CERTIFICATE",
        File | undefined,
      ]
    >)
      .filter((entry): entry is [
        "CR" | "VAT" | "COMPANY_PROFILE" | "FINANCIALS" | "BANK_CERTIFICATE",
        File,
      ] => Boolean(entry[1]))
      .map(async ([type, file]) => ({
      type,
      attachment: await buildAttachmentRecord({
        requestNumber,
        type,
        file,
      }),
    })),
  );

  const request = await prisma
    .$transaction(
      async (tx) => {
        const created = await tx.vendorRegistrationRequest.create({
          data: {
            requestNumber,
            companyName: input.values.companyName,
            legalName: input.values.legalName,
            companyEmail: normalizeEmail(input.values.companyEmail),
            companyPhone: input.values.companyPhone,
            website: input.values.website || null,
            crNumber: input.values.crNumber,
            vatNumber: input.values.vatNumber,
            categoryId: selectedCategory.id,
            primarySubcategoryId: primarySubcategory.id,
            countryCode: selectedCountry.code,
            coverageScope: input.values.coverageScope,
            addressLine1: input.values.addressLine1,
            addressLine2: input.values.addressLine2 || null,
            district: input.values.district,
            region: input.values.region || null,
            postalCode: input.values.postalCode,
            poBox: input.values.poBox || null,
            businessDescription: input.values.businessDescription,
            yearsInBusiness: input.values.yearsInBusiness,
            employeeCount: input.values.employeeCount,
            productsServicesSummary: input.values.servicesOverview,
            bankName: input.values.bankName,
            accountName: input.values.accountName,
            iban: input.values.iban,
            swiftCode: input.values.swiftCode,
            bankAccountNumber: input.values.bankAccountNumber || null,
            additionalInformation: input.values.additionalInformation ?? "",
            declarationName: input.values.declarationName,
            declarationTitle: input.values.declarationTitle,
            declarationAccepted: true,
            declarationSignedAt: new Date(),
            formSnapshot: formSnapshot as Prisma.InputJsonValue,
            status: VendorRegistrationStatus.PENDING_REVIEW,
            submittedAt: new Date(),
          },
          select: {
            id: true,
            requestNumber: true,
          },
        });

        await tx.vendorRegistrationRequestSubcategory.createMany({
          data: input.values.subcategoryIds.map((subcategoryId) => ({
            requestId: created.id,
            subcategoryId,
          })),
          skipDuplicates: true,
        });

        await tx.vendorRegistrationRequestCity.createMany({
          data: expandedCityIds.map((cityId) => ({
            requestId: created.id,
            cityId,
          })),
          skipDuplicates: true,
        });

        await tx.vendorRegistrationReference.createMany({
          data: [
            input.values.reference1,
            input.values.reference2,
            input.values.reference3,
          ].map((reference) => ({
            requestId: created.id,
            name: reference.name,
            companyName: reference.companyName,
            email: normalizeEmail(reference.email),
            phone: reference.phone,
            title: reference.title,
          })),
        });

        await tx.vendorRegistrationAttachment.createMany({
          data: attachmentEntries.map(({ type, attachment }) => ({
            id: attachment.id,
            requestId: created.id,
            type,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            storagePath: attachment.storagePath,
            sizeBytes: attachment.sizeBytes,
          })),
        });

        await createAuditLog(tx, {
          action: "CREATED",
          entityType: "VendorRegistrationRequest",
          entityId: created.id,
          details: {
            requestNumber,
            companyName: input.values.companyName,
            countryCode: selectedCountry.code,
            categoryId: selectedCategory.id,
            primarySubcategoryId: primarySubcategory.id,
          },
        });

        return created;
      },
      {
        timeout: 15000,
      },
    )
    .catch(async (error) => {
      if (isUniqueConstraintError(error, "requestNumber")) {
        console.warn("[vendor-registration] request number collision detected", {
          requestNumber,
        });
        return null;
      }

      throw error;
    });

  if (!request) {
    // Retry the full submission once when a rare request-number collision occurs.
    return submitVendorRegistrationRequest(input);
  }

  const verificationUrl = buildVendorRegistrationVerificationUrl(request.requestNumber);

  await notifyVendorRegistrationSubmitted({
    requestId: request.id,
    companyName: input.values.companyName,
  });

  await sendDirectWorkflowEmail({
    label: "vendor-registration-submitted",
    to: Array.from(PROCUREMENT_TEAM_EMAILS),
    subject: `Vendor Registration Submitted - ${input.values.companyName}`,
    react: createElement("div", null, "Vendor registration request submitted."),
    fallback: {
      heading: "Vendor Registration Submitted",
      intro: `${input.values.companyName} has submitted a new vendor registration request for review.`,
      rows: [
        { label: "Request Number", value: request.requestNumber },
        { label: "Company", value: input.values.companyName },
        { label: "Country", value: selectedCountry.name },
      ],
      actionLabel: "Review Request",
      actionUrl: verificationUrl,
    },
    logContext: {
      requestNumber: request.requestNumber,
      companyName: input.values.companyName,
    },
  }).catch(async (error) => {
    console.warn("[vendor-registration] submitted email failed", {
      requestNumber: request.requestNumber,
      companyName: input.values.companyName,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    await logSystemError({
      action: "VendorRegistrationSubmittedEmail",
      error,
      severity: "WARNING",
      context: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        companyName: input.values.companyName,
      },
    }).catch(() => undefined);
  });

  return request;
}

export async function replaceVendorRegistrationAttachment(input: {
  attachmentId: string;
  file: File;
  userId: string;
}) {
  const current = await prisma.vendorRegistrationAttachment.findUnique({
    where: {
      id: input.attachmentId,
    },
    select: {
      id: true,
      type: true,
      fileName: true,
      storagePath: true,
      requestId: true,
      request: {
        select: {
          requestNumber: true,
        },
      },
    },
  });

  if (!current) {
    throw new Error("Attachment record was not found.");
  }

  const nextAttachment = await buildAttachmentRecord({
    requestNumber: current.request.requestNumber,
    attachmentId: current.id,
    type: current.type,
    file: input.file,
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.vendorRegistrationAttachment.update({
        where: {
          id: current.id,
        },
        data: {
          fileName: nextAttachment.fileName,
          mimeType: nextAttachment.mimeType,
          storagePath: nextAttachment.storagePath,
          sizeBytes: nextAttachment.sizeBytes,
        },
      });

      await createAuditLog(tx, {
        action: "UPDATED",
        entityType: "VendorRegistrationAttachment",
        entityId: current.id,
        userId: input.userId,
        details: {
          requestId: current.requestId,
          requestNumber: current.request.requestNumber,
          type: current.type,
          previousFileName: current.fileName,
          previousStoragePath: current.storagePath,
          nextFileName: nextAttachment.fileName,
          nextStoragePath: nextAttachment.storagePath,
        },
      });
    },
    {
      timeout: 15000,
    },
  );

  return {
    requestId: current.requestId,
  };
}

export async function approveVendorRegistrationRequest(input: {
  userId: string;
  userName: string;
  userEmail: string;
  values: ParsedRegistrationReview;
}) {
  const request = await prisma.vendorRegistrationRequest.findUnique({
    where: {
      id: input.values.requestId,
    },
    include: {
      country: true,
      primaryCategory: true,
      primarySubcategory: true,
      references: true,
      attachments: true,
      selectedCities: {
        include: {
          city: true,
        },
      },
      selectedSubcategories: {
        include: {
          subcategory: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("Vendor registration request not found.");
  }

  if (request.status !== VendorRegistrationStatus.PENDING_REVIEW) {
    throw new Error("This vendor registration has already been processed.");
  }

  const selectedSubcategories = request.selectedSubcategories.map((entry) => ({
    id: entry.subcategory.id,
    name: entry.subcategory.name,
    externalKey: entry.subcategory.externalKey,
  }));
  const selectedSubcategoryIds = Array.from(
    new Set(
      request.selectedSubcategories.length > 0
        ? request.selectedSubcategories.map((entry) => entry.subcategoryId)
        : [request.primarySubcategoryId],
    ),
  );
  const approvedAt = new Date();

  const vendor = await prisma.$transaction(async (tx) => {
    const categoryCode = getCategoryCode(request.primaryCategory);
    const serial = await acquireSupplierIdSequence(tx, request.countryCode, categoryCode);
    const nextSupplierId = buildSupplierId(
      request.countryCode,
      categoryCode,
      serial,
    );
    const certificate = await reserveVendorRegistrationCertificateCode(
      tx,
      approvedAt,
    );

    const vendor = await tx.vendor.create({
      data: {
        vendorName: request.companyName,
        vendorEmail: normalizeEmail(request.companyEmail),
        vendorId: request.crNumber,
        vendorPhone: request.companyPhone,
        status: "ACTIVE",
        classification: null,
        notes: compactText(
          `Registered from supplier application ${request.requestNumber}. VAT: ${request.vatNumber}.`,
          500,
        ),
        categoryId: request.categoryId,
        subcategoryId: request.primarySubcategoryId,
        supplierId: nextSupplierId,
      },
      select: {
        id: true,
        supplierId: true,
      },
    });

    await tx.vendorSubcategorySelection.createMany({
      data: selectedSubcategoryIds.map((subcategoryId) => ({
        vendorId: vendor.id,
        subcategoryId,
      })),
      skipDuplicates: true,
    });

    await tx.vendorRegistrationRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: VendorRegistrationStatus.APPROVED,
        reviewedByUserId: input.userId,
        reviewedAt: approvedAt,
        rejectionReason: null,
        supplierId: nextSupplierId,
        approvedVendorId: vendor.id,
        certificateCode: certificate.certificateCode,
        certificateYear: certificate.certificateYear,
        certificateSequence: certificate.certificateSequence,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "VendorRegistrationRequest",
      entityId: request.id,
      userId: input.userId,
      details: {
        requestNumber: request.requestNumber,
        previousStatus: request.status,
        nextStatus: VendorRegistrationStatus.APPROVED,
        supplierId: nextSupplierId,
        approvedVendorId: vendor.id,
        certificateCode: certificate.certificateCode,
        selectedSubcategories: selectedSubcategories.map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          code: subcategory.externalKey,
        })),
      },
    });

    await createWorkflowNotification(tx, {
      type: "VENDOR_CREATED",
      title: "Vendor registration approved",
      message: `${request.companyName} was approved and added to the vendor master registry.`,
      vendorId: vendor.id,
      href: `/admin/vendors/${vendor.id}`,
      routingStrategies: ["procurement_chain"],
      routingContext: {
        procurementChainEmails: Array.from(PROCUREMENT_TEAM_EMAILS),
      },
      eventKey: "VENDOR_CREATED",
      severity: "INFO",
      dedupeKey: `vendor-registration:${request.id}:approved`,
      cooldownMinutes: 60,
    });

    return {
      ...vendor,
      certificateCode: certificate.certificateCode,
    };
  });

  const odooSyncResult = await syncVendorToOdoo({
    vendorId: vendor.id,
    registrationRequestId: request.id,
    userId: input.userId,
  });

  const pdfBuffer = await generateVendorRegistrationCertificatePdfBuffer({
    certificateCode: vendor.certificateCode,
    requestNumber: request.requestNumber,
    supplierId: vendor.supplierId ?? "-",
    companyName: request.companyName,
    legalName: request.legalName,
    crNumber: request.crNumber,
    vatNumber: request.vatNumber,
    categoryName: request.primaryCategory.name,
    categoryCode: request.primaryCategory.externalKey,
    subcategories: selectedSubcategories,
    countryName: request.country.name,
    countryCode: request.countryCode,
    selectedCities: request.selectedCities.map((entry) => ({
      name: entry.city.name,
      region: entry.city.region,
    })),
    coverageScope: request.coverageScope,
    approvedAt,
  });

  const pdfVerificationUrl = buildVendorRegistrationVerificationUrl(
    request.requestNumber,
  );

  await sendDirectWorkflowEmail({
    label: "vendor-registration-approved",
    to: [normalizeEmail(request.companyEmail)],
    cc: Array.from(PROCUREMENT_TEAM_EMAILS),
    subject: `Vendor Registration Approved - ${request.companyName}`,
    react: createElement("div", null, "Your supplier registration has been approved."),
    attachments: [
      {
        filename: `vendor-registration-${request.requestNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
    fallback: {
      heading: "Vendor Registration Approved",
      intro: `Your supplier registration for ${request.companyName} has been approved.`,
      rows: [
        { label: "Supplier ID", value: vendor.supplierId },
        { label: "Request Number", value: request.requestNumber },
        { label: "Category", value: request.primaryCategory.name },
      ],
      actionLabel: "Verify Registration",
      actionUrl: pdfVerificationUrl,
    },
    logContext: {
      requestNumber: request.requestNumber,
      supplierId: vendor.supplierId,
      companyName: request.companyName,
    },
  });

  await prisma.vendorRegistrationRequest.update({
    where: {
      id: request.id,
    },
    data: {
      certificatePdfStoragePath:
        (await uploadVendorRegistrationCertificatePdf(
          request.requestNumber,
          pdfBuffer,
        )).path ??
        `vendor-registration-certificates/${request.requestNumber}.pdf`,
    },
  });

  return {
    requestNumber: request.requestNumber,
    supplierId: vendor.supplierId,
    vendorId: vendor.id,
    odooSyncStatus: odooSyncResult.status,
    odooPartnerId:
      odooSyncResult.status === "SYNCED" ? odooSyncResult.partnerId : null,
    odooSyncError:
      odooSyncResult.status === "FAILED" ? odooSyncResult.error : null,
  };
}

export async function rejectVendorRegistrationRequest(input: {
  userId: string;
  values: ParsedRegistrationReview;
}) {
  const request = await prisma.vendorRegistrationRequest.findUnique({
    where: {
      id: input.values.requestId,
    },
    select: {
      id: true,
      requestNumber: true,
      companyName: true,
      companyEmail: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("Vendor registration request not found.");
  }

  if (request.status !== VendorRegistrationStatus.PENDING_REVIEW) {
    throw new Error("This vendor registration has already been processed.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.vendorRegistrationRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: VendorRegistrationStatus.REJECTED,
        rejectionReason: input.values.rejectionReason ?? null,
        reviewedByUserId: input.userId,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "VendorRegistrationRequest",
      entityId: request.id,
      userId: input.userId,
      details: {
        requestNumber: request.requestNumber,
        previousStatus: request.status,
        nextStatus: VendorRegistrationStatus.REJECTED,
        rejectionReason: input.values.rejectionReason ?? null,
      },
    });

    await createWorkflowNotification(tx, {
      type: "SYSTEM_ALERT",
      title: "Vendor registration rejected",
      message: `${request.companyName} was rejected during supplier registration review.`,
      vendorId: null,
      href: `/admin/vendor-registrations/${request.id}`,
      routingStrategies: ["procurement_chain"],
      routingContext: {
        procurementChainEmails: PROCUREMENT_TEAM_EMAILS as unknown as string[],
      },
      eventKey: "SYSTEM_ALERT",
      severity: "WARNING",
      dedupeKey: `vendor-registration:${request.id}:rejected`,
      cooldownMinutes: 60,
    });

    return next;
  });

  await sendDirectWorkflowEmail({
    label: "vendor-registration-rejected",
    to: [normalizeEmail(request.companyEmail)],
    cc: Array.from(PROCUREMENT_TEAM_EMAILS),
    subject: `Vendor Registration Update - ${request.companyName}`,
    react: createElement("div", null, "Your supplier registration has been reviewed."),
    fallback: {
      heading: "Vendor Registration Rejected",
      intro: `Your supplier registration for ${request.companyName} was not approved.`,
      rows: [
        { label: "Reason", value: input.values.rejectionReason },
        { label: "Request Number", value: request.requestNumber },
      ],
      actionLabel: "View Status",
      actionUrl: buildVendorRegistrationVerificationUrl(request.requestNumber),
    },
    logContext: {
      requestNumber: request.requestNumber,
      companyName: request.companyName,
    },
  });

  return updated;
}

export async function ensureVendorRegistrationRequestConsistency() {
  return getRegistrationLookupData();
}
