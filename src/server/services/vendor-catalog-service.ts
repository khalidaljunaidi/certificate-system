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
  const [
    categories,
    subcategories,
    countries,
    cityCount,
    saudiCityCount,
  ] = await Promise.all([
    prisma.vendorCategory.findMany({
      select: {
        externalKey: true,
      },
    }),
    prisma.vendorSubcategory.findMany({
      select: {
        externalKey: true,
      },
    }),
    prisma.country.findMany({
      select: {
        code: true,
      },
    }),
    prisma.city.count(),
    prisma.city.count({
      where: {
        countryCode: "SA",
      },
    }),
  ]);

  const categoryKeys = new Set(
    categories.map((category) => category.externalKey).filter(Boolean),
  );
  const subcategoryKeys = new Set(
    subcategories
      .map((subcategory) => subcategory.externalKey)
      .filter(Boolean),
  );
  const countryCodes = new Set(countries.map((country) => country.code));

  const needsSync =
    categories.length < EXPECTED_CATEGORY_COUNT ||
    subcategories.length < EXPECTED_SUBCATEGORY_COUNT ||
    countries.length < EXPECTED_COUNTRY_COUNT ||
    cityCount < EXPECTED_CITY_COUNT ||
    saudiCityCount < EXPECTED_SAUDI_CITY_COUNT ||
    VENDOR_TAXONOMY.some((category) => !categoryKeys.has(category.code)) ||
    VENDOR_TAXONOMY.some((category) =>
      category.subcategories.some(
        (subcategory) => !subcategoryKeys.has(subcategory.code),
      ),
    ) ||
    COUNTRY_CATALOG.some((country) => !countryCodes.has(country.code));

  if (!needsSync) {
    return;
  }

  if (!vendorCatalogSyncPromise) {
    vendorCatalogSyncPromise = syncVendorCatalogData().finally(() => {
      vendorCatalogSyncPromise = null;
    });
  }

  await vendorCatalogSyncPromise;
}
