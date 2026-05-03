import type { Prisma } from "@prisma/client";

import type {
  CountryCatalogOption,
  VendorRegistrationCategoryOption,
  VendorRegistrationFormOptions,
  VendorRegistrationRequestView,
} from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { withServerTiming } from "@/lib/server-performance";
import { ensureVendorCatalogData } from "@/server/services/vendor-catalog-service";

type VendorRegistrationFilters = {
  search?: string;
  status?: string;
  countryCode?: string;
  categoryId?: string;
};

type VendorRegistrationQueryOptions = {
  limit?: number;
  page?: number;
};

type VendorRegistrationRequestRecord = Prisma.VendorRegistrationRequestGetPayload<{
  select: ReturnType<typeof getRequestSelect>;
}>;
type VendorRegistrationRequestListRecord =
  Prisma.VendorRegistrationRequestGetPayload<{
    select: ReturnType<typeof getRequestListSelect>;
  }>;

const VENDOR_REGISTRATION_OPTIONS_CACHE_MS = 60_000;
let vendorRegistrationOptionsCache:
  | {
      expiresAt: number;
      value: VendorRegistrationFormOptions;
    }
  | null = null;
let vendorRegistrationCountriesCache:
  | {
      expiresAt: number;
      value: CountryCatalogOption[];
    }
  | null = null;
let vendorRegistrationCategoriesCache:
  | {
      expiresAt: number;
      value: VendorRegistrationCategoryOption[];
    }
  | null = null;

function logOptionsPayloadSize(label: string, value: unknown) {
  const payloadBytes = Buffer.byteLength(JSON.stringify(value), "utf8");

  console.info("[vendor-registration-options]", {
    label,
    payloadBytes,
  });
}

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
    categorySubcategoryCount: request.primaryCategory._count.subcategories,
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
    certificateCode: request.certificateCode,
    certificateYear: request.certificateYear,
    certificateSequence: request.certificateSequence,
    certificatePdfStoragePath: request.certificatePdfStoragePath,
    odooSyncStatus: request.odooSyncStatus,
    odooPartnerId: request.odooPartnerId,
    odooSyncError: request.odooSyncError,
    odooSyncedAt: request.odooSyncedAt,
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
    certificateCode: true,
    certificateYear: true,
    certificateSequence: true,
    certificatePdfStoragePath: true,
    odooSyncStatus: true,
    odooPartnerId: true,
    odooSyncError: true,
    odooSyncedAt: true,
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
        _count: {
          select: {
            subcategories: true,
          },
        },
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

function getRequestListSelect() {
  return {
    id: true,
    requestNumber: true,
    companyName: true,
    legalName: true,
    companyEmail: true,
    crNumber: true,
    vatNumber: true,
    status: true,
    supplierId: true,
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
      },
    },
    primarySubcategory: {
      select: {
        name: true,
      },
    },
  } satisfies Prisma.VendorRegistrationRequestSelect;
}

function mapRequestListItem(request: VendorRegistrationRequestListRecord) {
  return {
    id: request.id,
    requestNumber: request.requestNumber,
    companyName: request.companyName,
    legalName: request.legalName,
    companyEmail: request.companyEmail,
    crNumber: request.crNumber,
    vatNumber: request.vatNumber,
    status: request.status,
    supplierId: request.supplierId,
    submittedAt: request.submittedAt,
    reviewedAt: request.reviewedAt,
    reviewedByName: request.reviewedBy?.name ?? null,
    countryName: request.country.name,
    categoryName: request.primaryCategory.name,
    primarySubcategoryName: request.primarySubcategory.name,
  };
}

export async function getVendorRegistrationFormOptions(): Promise<VendorRegistrationFormOptions> {
  if (
    vendorRegistrationOptionsCache &&
    vendorRegistrationOptionsCache.expiresAt > Date.now()
  ) {
    return vendorRegistrationOptionsCache.value;
  }

  return withServerTiming("vendorRegistration.formOptions", async () => {
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
      take: 250,
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
          take: 500,
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
      take: 50,
      select: {
        id: true,
        name: true,
        externalKey: true,
        subcategories: {
          orderBy: {
            name: "asc",
          },
          take: 250,
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

  const value = {
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

  logOptionsPayloadSize("full-form-options", value);

  vendorRegistrationOptionsCache = {
    expiresAt: Date.now() + VENDOR_REGISTRATION_OPTIONS_CACHE_MS,
    value,
  };

  return value;
  });
}

export async function getVendorRegistrationCountryOptions(): Promise<
  CountryCatalogOption[]
> {
  if (
    vendorRegistrationCountriesCache &&
    vendorRegistrationCountriesCache.expiresAt > Date.now()
  ) {
    return vendorRegistrationCountriesCache.value;
  }

  return withServerTiming("vendorRegistration.countryOptions", async () => {
    await ensureVendorCatalogData();

    const countries = await prisma.country.findMany({
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
      take: 250,
      select: {
        code: true,
        name: true,
        regionGroup: true,
      },
    });

    const value = countries.map((country) => ({
      code: country.code,
      name: country.name,
      regionGroup: country.regionGroup ?? "UNASSIGNED",
      cities: [],
    }));

    logOptionsPayloadSize("countries", value);

    vendorRegistrationCountriesCache = {
      expiresAt: Date.now() + VENDOR_REGISTRATION_OPTIONS_CACHE_MS,
      value,
    };

    return value;
  });
}

export async function getVendorRegistrationCityOptions(input: {
  countryCode?: string;
  coverageScope?: string;
}) {
  return withServerTiming("vendorRegistration.cityOptions", async () => {
    await ensureVendorCatalogData();

    const coverageScope = input.coverageScope ?? "SPECIFIC_CITIES";
    const countryCode = input.countryCode?.trim();
    const countryWhere =
      coverageScope === "GLOBAL"
        ? {
            isActive: true,
          }
        : coverageScope === "GCC" ||
            coverageScope === "MENA" ||
            coverageScope === "EU"
          ? {
              isActive: true,
              regionGroup: coverageScope,
            }
          : countryCode
            ? {
                isActive: true,
                code: countryCode,
              }
            : {
                isActive: true,
                code: "__NO_COUNTRY__",
              };

    const cities = await prisma.city.findMany({
      where: {
        isActive: true,
        country: countryWhere,
      },
      orderBy: [
        {
          countryCode: "asc",
        },
        {
          region: "asc",
        },
        {
          name: "asc",
        },
      ],
      take: 2000,
      select: {
        id: true,
        countryCode: true,
        name: true,
        region: true,
      },
    });

    const value = cities.map((city) => ({
      id: city.id,
      countryCode: city.countryCode,
      name: city.name,
      region: city.region ?? "Unassigned",
    }));

    logOptionsPayloadSize("cities", value);

    return value;
  });
}

export async function getVendorRegistrationCategoryOptions(): Promise<
  VendorRegistrationCategoryOption[]
> {
  if (
    vendorRegistrationCategoriesCache &&
    vendorRegistrationCategoriesCache.expiresAt > Date.now()
  ) {
    return vendorRegistrationCategoriesCache.value;
  }

  return withServerTiming("vendorRegistration.categoryOptions", async () => {
    await ensureVendorCatalogData();

    const categories = await prisma.vendorCategory.findMany({
      orderBy: {
        name: "asc",
      },
      take: 50,
      select: {
        id: true,
        name: true,
        externalKey: true,
      },
    });

    const value = categories.map((category) => ({
      id: category.id,
      name: category.name,
      code: category.externalKey,
      subcategories: [],
    }));

    logOptionsPayloadSize("categories", value);

    vendorRegistrationCategoriesCache = {
      expiresAt: Date.now() + VENDOR_REGISTRATION_OPTIONS_CACHE_MS,
      value,
    };

    return value;
  });
}

export async function getVendorRegistrationSubcategoryOptions(categoryId: string) {
  return withServerTiming("vendorRegistration.subcategoryOptions", async () => {
    await ensureVendorCatalogData();

    const subcategories = await prisma.vendorSubcategory.findMany({
      where: {
        categoryId,
      },
      orderBy: {
        name: "asc",
      },
      take: 250,
      select: {
        id: true,
        name: true,
        externalKey: true,
        categoryId: true,
      },
    });

    const value = subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      code: subcategory.externalKey,
      categoryId: subcategory.categoryId,
    }));

    logOptionsPayloadSize("subcategories", value);

    return value;
  });
}

export async function getVendorRegistrationFilterOptions() {
  const [countries, categories] = await Promise.all([
    getVendorRegistrationCountryOptions(),
    getVendorRegistrationCategoryOptions(),
  ]);

  return {
    countries,
    categories,
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

export async function getVendorRegistrationRequestList(
  filters: VendorRegistrationFilters = {},
  options: VendorRegistrationQueryOptions = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);
  const page = Math.max(options.page ?? 1, 1);
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
    skip: (page - 1) * limit,
    take: limit + 1,
    select: getRequestListSelect(),
  });

  const hasNext = requests.length > limit;
  const visibleRequests = hasNext ? requests.slice(0, limit) : requests;

  return {
    requests: visibleRequests.map(mapRequestListItem),
    pagination: {
      page,
      limit,
      hasNext,
      hasPrevious: page > 1,
    },
  };
}

export async function getVendorRegistrationStatusCounts(
  filters: VendorRegistrationFilters = {},
) {
  const countFilters = {
    ...filters,
    status: undefined,
  };
  const grouped = await prisma.vendorRegistrationRequest.groupBy({
    by: ["status"],
    where: buildWhere(countFilters),
    _count: {
      _all: true,
    },
  });

  const counts = {
    PENDING_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  };

  for (const entry of grouped) {
    counts[entry.status] = entry._count._all;
  }

  return counts;
}

export async function getVendorRegistrationRequestSummaries(
  filters: VendorRegistrationFilters = {},
  options: VendorRegistrationQueryOptions = {},
) {
  return prisma.vendorRegistrationRequest.findMany({
    where: buildWhere(filters),
    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    take: options.limit ?? 10,
    select: {
      id: true,
      requestNumber: true,
      companyName: true,
      companyEmail: true,
      status: true,
      submittedAt: true,
      country: {
        select: {
          name: true,
        },
      },
      primaryCategory: {
        select: {
          name: true,
        },
      },
    },
  });
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
