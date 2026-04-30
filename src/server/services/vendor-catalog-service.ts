import { prisma } from "@/lib/prisma";
import {
  COUNTRY_CATALOG,
  VENDOR_TAXONOMY,
} from "@/lib/vendor-registration-catalog";

const EXPECTED_COUNTRY_COUNT = COUNTRY_CATALOG.length;
const EXPECTED_CITY_COUNT = COUNTRY_CATALOG.reduce(
  (sum, country) => sum + country.cities.length,
  0,
);
const EXPECTED_SAUDI_CITY_COUNT =
  COUNTRY_CATALOG.find((country) => country.code === "SA")?.cities.length ?? 0;
const EXPECTED_CATEGORY_COUNT = VENDOR_TAXONOMY.length;
const EXPECTED_SUBCATEGORY_COUNT = VENDOR_TAXONOMY.reduce(
  (sum, category) => sum + category.subcategories.length,
  0,
);

let vendorCatalogSyncPromise: Promise<void> | null = null;
let vendorCatalogCheckedAt = 0;

const VENDOR_CATALOG_CHECK_CACHE_MS = 5 * 60 * 1000;

async function syncVendorTaxonomy() {
  for (const categoryInput of VENDOR_TAXONOMY) {
    const existingCategory = await prisma.vendorCategory.findFirst({
      where: {
        OR: [{ externalKey: categoryInput.code }, { name: categoryInput.name }],
      },
      select: {
        id: true,
      },
    });

    const category = existingCategory
      ? await prisma.vendorCategory.update({
          where: {
            id: existingCategory.id,
          },
          data: {
            name: categoryInput.name,
            externalKey: categoryInput.code,
          },
        })
      : await prisma.vendorCategory.create({
          data: {
            name: categoryInput.name,
            externalKey: categoryInput.code,
          },
        });

    for (const subcategoryInput of categoryInput.subcategories) {
      const existingSubcategory = await prisma.vendorSubcategory.findFirst({
        where: {
          OR: [
            { externalKey: subcategoryInput.code },
            {
              categoryId: category.id,
              name: subcategoryInput.name,
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (existingSubcategory) {
        await prisma.vendorSubcategory.update({
          where: {
            id: existingSubcategory.id,
          },
          data: {
            categoryId: category.id,
            name: subcategoryInput.name,
            externalKey: subcategoryInput.code,
          },
        });
        continue;
      }

      await prisma.vendorSubcategory.create({
        data: {
          categoryId: category.id,
          name: subcategoryInput.name,
          externalKey: subcategoryInput.code,
        },
      });
    }
  }
}

async function syncCountryCatalog() {
  for (const countryInput of COUNTRY_CATALOG) {
    await prisma.country.upsert({
      where: {
        code: countryInput.code,
      },
      update: {
        name: countryInput.name,
        regionGroup: countryInput.regionGroup,
        isActive: true,
      },
      create: {
        code: countryInput.code,
        name: countryInput.name,
        regionGroup: countryInput.regionGroup,
        isActive: true,
      },
    });

    for (const cityInput of countryInput.cities) {
      await prisma.city.upsert({
        where: {
          countryCode_name: {
            countryCode: countryInput.code,
            name: cityInput.name,
          },
        },
        update: {
          region: cityInput.region,
          isActive: true,
        },
        create: {
          countryCode: countryInput.code,
          name: cityInput.name,
          region: cityInput.region,
          isActive: true,
        },
      });
    }
  }
}

async function syncVendorCatalogData() {
  await syncVendorTaxonomy();
  await syncCountryCatalog();
}

export async function ensureVendorCatalogData() {
  if (Date.now() - vendorCatalogCheckedAt < VENDOR_CATALOG_CHECK_CACHE_MS) {
    return;
  }

  const [categoryCount, subcategoryCount, countryCount, cityCount, saudiCityCount] =
    await Promise.all([
      prisma.vendorCategory.count(),
      prisma.vendorSubcategory.count(),
      prisma.country.count(),
    prisma.city.count(),
    prisma.city.count({
      where: {
        countryCode: "SA",
      },
    }),
  ]);

  const needsSync =
    categoryCount < EXPECTED_CATEGORY_COUNT ||
    subcategoryCount < EXPECTED_SUBCATEGORY_COUNT ||
    countryCount < EXPECTED_COUNTRY_COUNT ||
    cityCount < EXPECTED_CITY_COUNT ||
    saudiCityCount < EXPECTED_SAUDI_CITY_COUNT;

  if (!needsSync) {
    vendorCatalogCheckedAt = Date.now();
    return;
  }

  if (!vendorCatalogSyncPromise) {
    vendorCatalogSyncPromise = syncVendorCatalogData().finally(() => {
      vendorCatalogSyncPromise = null;
    });
  }

  await vendorCatalogSyncPromise;
  vendorCatalogCheckedAt = Date.now();
}
