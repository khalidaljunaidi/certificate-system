import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

import { NOTIFICATION_EMAIL_GROUP_DEFINITIONS } from "../src/lib/constants";
import {
  COUNTRY_CATALOG,
  VENDOR_TAXONOMY,
} from "../src/lib/vendor-registration-catalog";
import {
  DEFAULT_ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
} from "../src/lib/rbac";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL before running `npm run db:seed`.");
}

const pool = new Pool({
  connectionString,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const TEMPORARY_PASSWORD = "12345678";

const seededUsers = [
  {
    id: "user-abdulmajeed-al-hussien",
    name: "Abdulmajeed Al Hussien",
    email: "abdulmajeed@thegatheringksa.com",
    title: "Procurement Lead",
    role: "PROCUREMENT_LEAD" as UserRole,
  },
  {
    id: "user-samia-houry",
    name: "Samia Houry",
    email: "samia@thegatheringksa.com",
    title: "Procurement Specialist",
    role: "PROCUREMENT_SPECIALIST" as UserRole,
  },
  {
    id: "user-khalid-al-junaidi",
    name: "Khalid Al Junaidi",
    email: "khaledeljenidy@thegatheringksa.com",
    title: "Procurement Director",
    role: "PROCUREMENT_DIRECTOR" as UserRole,
  },
] as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function upsertVendorTaxonomy() {
  let subcategoryCount = 0;

  for (const categoryInput of VENDOR_TAXONOMY) {
    const existingCategory = await prisma.vendorCategory.findFirst({
      where: {
        OR: [
          { externalKey: categoryInput.code },
          { name: categoryInput.name },
        ],
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
      } else {
        await prisma.vendorSubcategory.create({
          data: {
            categoryId: category.id,
            name: subcategoryInput.name,
            externalKey: subcategoryInput.code,
          },
        });
      }

      subcategoryCount += 1;
    }
  }

  console.info("[seed:taxonomy] Vendor taxonomy upserted", {
    categories: VENDOR_TAXONOMY.length,
    subcategories: subcategoryCount,
  });
}

async function upsertCountryCatalog() {
  let cityCount = 0;

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

      cityCount += 1;
    }
  }

  console.info("[seed:country-catalog] Countries and cities upserted", {
    countries: COUNTRY_CATALOG.length,
    cities: cityCount,
  });
}

async function upsertNotificationEmailGroups() {
  await Promise.all(
    NOTIFICATION_EMAIL_GROUP_DEFINITIONS.map((group) =>
      prisma.workflowEmailGroup.upsert({
        where: {
          key: group.value,
        },
        update: {
          name: group.label,
          description: group.description,
        },
        create: {
          key: group.value,
          name: group.label,
          description: group.description,
        },
      }),
    ),
  );

  console.info("[seed:notification-groups] Notification groups upserted", {
    groups: NOTIFICATION_EMAIL_GROUP_DEFINITIONS.map((group) => group.label),
  });
}

async function upsertAccessControlCatalog() {
  const permissionsByKey = new Map<string, string>();

  for (const permissionInput of PERMISSION_DEFINITIONS) {
    const permission = await prisma.permission.upsert({
      where: {
        key: permissionInput.key,
      },
      update: {
        name: permissionInput.label,
        category: permissionInput.category,
        description: permissionInput.description,
        sortOrder: permissionInput.sortOrder,
      },
      create: {
        key: permissionInput.key,
        name: permissionInput.label,
        category: permissionInput.category,
        description: permissionInput.description,
        sortOrder: permissionInput.sortOrder,
      },
    });

    permissionsByKey.set(permission.key, permission.id);
  }

  for (const roleInput of DEFAULT_ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: {
        key: roleInput.key,
      },
      update: {
        name: roleInput.name,
        description: roleInput.description,
        isSystem: roleInput.isSystem,
      },
      create: {
        key: roleInput.key,
        name: roleInput.name,
        description: roleInput.description,
        isSystem: roleInput.isSystem,
      },
    });

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    const rolePermissionIds = roleInput.permissions
      .map((permissionKey) => permissionsByKey.get(permissionKey))
      .filter((permissionId): permissionId is string => Boolean(permissionId));

    if (rolePermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
  }

  for (const user of seededUsers) {
    const persistedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!persistedUser) {
      continue;
    }

    const role = await prisma.role.findUnique({
      where: {
        key: user.role,
      },
      select: {
        id: true,
      },
    });

    if (!role) {
      continue;
    }

    await prisma.userRoleAssignment.upsert({
      where: {
        userId: persistedUser.id,
      },
      update: {
        roleId: role.id,
      },
      create: {
        userId: persistedUser.id,
        roleId: role.id,
      },
    });
  }

  console.info("[seed:rbac] Access control catalog upserted", {
    roles: DEFAULT_ROLE_DEFINITIONS.map((role) => role.name),
    permissions: PERMISSION_DEFINITIONS.length,
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(TEMPORARY_PASSWORD, 12);

  await Promise.all(
    seededUsers.map((user) =>
      prisma.user.upsert({
        where: {
          id: user.id,
        },
        update: {
          name: user.name,
          email: normalizeEmail(user.email),
          title: user.title,
          role: user.role,
          locale: "EN",
          isActive: true,
        },
        create: {
          id: user.id,
          name: user.name,
          email: normalizeEmail(user.email),
          passwordHash,
          title: user.title,
          role: user.role,
          locale: "EN",
          isActive: true,
          passwordChanged: false,
        },
      }),
    ),
  );

  console.info("[seed:users] Procurement users upserted", {
    users: seededUsers.map((user) => normalizeEmail(user.email)),
  });
  await upsertAccessControlCatalog();
  await upsertNotificationEmailGroups();
  await upsertVendorTaxonomy();
  await upsertCountryCatalog();
  console.info("[seed:users] Default seed completed", {
    scope: "core-auth-users-rbac-vendor-taxonomy-and-country-catalog",
    reminder: "Users must update their password after first login.",
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
