import type { Prisma } from "@prisma/client";

import type {
  VendorRegistrationFormOptions,
  VendorRegistrationRequestView,
} from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { ensureVendorCatalogData } from "@/server/services/vendor-catalog-service";

type VendorRegistrationFilters = {
  search?: string;
  status?: string;
  countryCode?: string;
  categoryId?: string;
};

type VendorRegistrationQueryOptions = {
  limit?: number;
};

type VendorRegistrationRequestRecord = Prisma.VendorRegistrationRequestGetPayload<{
  select: ReturnType<typeof getRequestSelect>;
}>;

function buildWhere(
  filters: VendorRegistrationFilters = {},
): Prisma.VendorRegistrationRequestWhereInput {
  return {
    ...(filters.search
      ? {
          OR: [
            {
              companyName: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              legalName: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              companyEmail: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              crNumber: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              vatNumber: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
            {
              requestNumber: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };
}

function mapRequest(
  request: VendorRegistrationRequestRecord,
): VendorRegistrationRequestView {
  return {
    id: request.id,
    requestNumber: request.requestNumber,
    companyName: request.companyName,
    legalName: request.legalName,
    companyEmail: request.companyEmail,
    companyPhone: request.companyPhone,
    website: request.website,
    crNumber: request.crNumber,
    vatNumber: request.vatNumber,
    status: request.status,
    rejectionReason: request.rejectionReason,
    coverageScope: request.coverageScope,
    countryCode: request.countryCode,
    countryName: request.country.name,
    categoryId: request.categoryId,
    categoryName: request.primaryCategory.name,
    categoryCode: request.primaryCategory.externalKey,
    primarySubcategoryId: request.primarySubcategoryId,
    primarySubcategoryName: request.primarySubcategory.name,
    primarySubcategoryCode: request.primarySubcategory.externalKey,
    selectedSubcategories: request.selectedSubcategories.map((entry) => ({
      id: entry.subcategory.id,
      name: entry.subcategory.name,
      externalKey: entry.subcategory.externalKey,
    })),
    selectedCities: request.selectedCities.map((entry) => ({
      id: entry.city.id,
      name: entry.city.name,
      region: entry.city.region,
    })),
    addressLine1: request.addressLine1,
    addressLine2: request.addressLine2,
    district: request.district,
    region: request.region,
    postalCode: request.postalCode,
    poBox: request.poBox,
    businessDescription: request.businessDescription,
    yearsInBusiness: request.yearsInBusiness,
    employeeCount: request.employeeCount,
    productsServicesSummary: request.productsServicesSummary,
    bankName: request.bankName,
    accountName: request.accountName,
    iban: request.iban,
    swiftCode: request.swiftCode,
    bankAccountNumber: request.bankAccountNumber,
    additionalInformation: request.additionalInformation,
    declarationName: request.declarationName,
    declarationTitle: request.declarationTitle,
    declarationAccepted: request.declarationAccepted,
    declarationSignedAt: request.declarationSignedAt,
    supplierId: request.supplierId,
    approvedVendorId: request.approvedVendorId,
    certificatePdfStoragePath: request.certificatePdfStoragePath,
    submittedAt: request.submittedAt,
    reviewedAt: request.reviewedAt,
    reviewedByName: request.reviewedBy?.name ?? null,
    references: request.references.map((reference) => ({
      id: reference.id,
      name: reference.name,
      companyName: reference.companyName,
      email: reference.email,
      phone: reference.phone,
      title: reference.title,
    })),
    attachments: request.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      storagePath: attachment.storagePath,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
    })),
  };
}

function getRequestSelect() {
  return {
    id: true,
    requestNumber: true,
    companyName: true,
    legalName: true,
    companyEmail: true,
    companyPhone: true,
    website: true,
    crNumber: true,
    vatNumber: true,
    status: true,
    rejectionReason: true,
    coverageScope: true,
    countryCode: true,
    categoryId: true,
    primarySubcategoryId: true,
    addressLine1: true,
    addressLine2: true,
    district: true,
    region: true,
    postalCode: true,
    poBox: true,
    businessDescription: true,
    yearsInBusiness: true,
    employeeCount: true,
    productsServicesSummary: true,
    bankName: true,
    accountName: true,
    iban: true,
    swiftCode: true,
    bankAccountNumber: true,
    additionalInformation: true,
    declarationName: true,
    declarationTitle: true,
    declarationAccepted: true,
    declarationSignedAt: true,
    supplierId: true,
    approvedVendorId: true,
    certificatePdfStoragePath: true,
    submittedAt: true,
    reviewedAt: true,
    reviewedBy: {
      select: {
        name: true,
      },
    },
    country: {
      select: {
        name: true,
      },
    },
    primaryCategory: {
      select: {
        name: true,
        externalKey: true,
      },
    },
    primarySubcategory: {
      select: {
        name: true,
        externalKey: true,
      },
    },
    selectedSubcategories: {
      orderBy: {
        createdAt: "asc",
      },
      select: {
        subcategory: {
          select: {
            id: true,
            name: true,
            externalKey: true,
          },
        },
      },
    },
    selectedCities: {
      orderBy: {
        createdAt: "asc",
      },
      select: {
        city: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    },
    references: {
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        title: true,
      },
    },
    attachments: {
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        type: true,
        fileName: true,
        mimeType: true,
        storagePath: true,
        sizeBytes: true,
        createdAt: true,
      },
    },
  } satisfies Prisma.VendorRegistrationRequestSelect;
}

export async function getVendorRegistrationFormOptions(): Promise<VendorRegistrationFormOptions> {
  await ensureVendorCatalogData();

  const [countries, categories] = await Promise.all([
    prisma.country.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          regionGroup: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        code: true,
        name: true,
        regionGroup: true,
        cities: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              region: "asc",
            },
            {
              name: "asc",
            },
          ],
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    }),
    prisma.vendorCategory.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        externalKey: true,
        subcategories: {
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            externalKey: true,
            categoryId: true,
          },
        },
      },
    }),
  ]);

  return {
    countries: countries.map((country) => ({
      code: country.code,
      name: country.name,
      regionGroup: country.regionGroup ?? "UNASSIGNED",
      cities: country.cities.map((city) => ({
        id: city.id,
        name: city.name,
        region: city.region ?? "Unassigned",
      })),
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      code: category.externalKey,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        code: subcategory.externalKey,
        categoryId: subcategory.categoryId,
      })),
    })),
  };
}

export async function getVendorRegistrationRequests(
  filters: VendorRegistrationFilters = {},
  options: VendorRegistrationQueryOptions = {},
): Promise<VendorRegistrationRequestView[]> {
  const requests = await prisma.vendorRegistrationRequest.findMany({
    where: buildWhere(filters),
    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    take: options.limit ?? 50,
    select: getRequestSelect(),
  });

  return requests.map(mapRequest);
}

export async function getVendorRegistrationRequestById(
  requestId: string,
): Promise<VendorRegistrationRequestView | null> {
  const request = await prisma.vendorRegistrationRequest.findUnique({
    where: {
      id: requestId,
    },
    select: getRequestSelect(),
  });

  return request ? mapRequest(request) : null;
}

export async function getVendorRegistrationRequestByNumber(
  requestNumber: string,
): Promise<VendorRegistrationRequestView | null> {
  const request = await prisma.vendorRegistrationRequest.findUnique({
    where: {
      requestNumber,
    },
    select: getRequestSelect(),
  });

  return request ? mapRequest(request) : null;
}
