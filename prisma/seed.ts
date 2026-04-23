import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

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

const vendorTaxonomy = [
  {
    code: "EV-BLD",
    name: "Build & Infrastructure",
    subcategories: [
      { code: "EV-BLD-01", name: "Structures / Gates / Tunnels" },
      { code: "EV-BLD-02", name: "Booths / Kiosks / Pavilions" },
      { code: "EV-BLD-03", name: "Scenic / Decor / Backdrops" },
      { code: "EV-BLD-04", name: "Finishes / Flooring / Painting" },
      { code: "EV-BLD-05", name: "Signage Fabrication & Install" },
      { code: "EV-BLD-06", name: "MEP / Temporary Civil Works" },
    ],
  },
  {
    code: "EV-PRD",
    name: "Production & Show",
    subcategories: [
      { code: "EV-PRD-01", name: "Production Management / PMO" },
      { code: "EV-PRD-02", name: "Stage / Platforms / Backstage" },
      { code: "EV-PRD-03", name: "Rigging / Engineering" },
      { code: "EV-PRD-04", name: "Run of Show / Rehearsals" },
      { code: "EV-PRD-05", name: "Production Office / Comms" },
      { code: "EV-PRD-06", name: "Consultants / Advisory" },
      { code: "EV-PRD-07", name: "Engineering Certification / TUV" },
      { code: "EV-PRD-08", name: "Submittals / Documentation" },
      { code: "EV-PRD-09", name: "Testing / Commissioning" },
    ],
  },
  {
    code: "EV-AVL",
    name: "Audio Video Lighting",
    subcategories: [
      { code: "EV-AVL-01", name: "Audio Systems" },
      { code: "EV-AVL-02", name: "LED / Screens / Projection" },
      { code: "EV-AVL-03", name: "Lighting Systems" },
      { code: "EV-AVL-04", name: "Camera / Broadcast" },
      { code: "EV-AVL-05", name: "Special Effects / Lasers" },
      { code: "EV-AVL-06", name: "AV Control / Cabling" },
    ],
  },
  {
    code: "EV-EXP",
    name: "Experiences & Activations",
    subcategories: [
      { code: "EV-EXP-01", name: "Immersive Experiences" },
      { code: "EV-EXP-02", name: "Interactive Activities" },
      { code: "EV-EXP-03", name: "Gaming / VR" },
      { code: "EV-EXP-04", name: "Workshops / Education" },
      { code: "EV-EXP-05", name: "Brand Activations" },
      { code: "EV-EXP-06", name: "Talent / Performers" },
    ],
  },
  {
    code: "EV-FNB",
    name: "Food & Beverage",
    subcategories: [
      { code: "EV-FNB-01", name: "Catering" },
      { code: "EV-FNB-02", name: "Food Booths" },
      { code: "EV-FNB-03", name: "Beverage / Bars" },
      { code: "EV-FNB-04", name: "Kitchen / Hygiene" },
      { code: "EV-FNB-05", name: "F&B Payments" },
      { code: "EV-FNB-06", name: "F&B Consumables" },
    ],
  },
  {
    code: "EV-OPS",
    name: "Operations & Logistics",
    subcategories: [
      { code: "EV-OPS-01", name: "Site Operations" },
      { code: "EV-OPS-02", name: "Logistics / Freight" },
      { code: "EV-OPS-03", name: "Transportation / Fleet" },
      { code: "EV-OPS-04", name: "Electrical Works & Power" },
      { code: "EV-OPS-05", name: "Utilities (Water/HVAC)" },
      { code: "EV-OPS-06", name: "Cleaning / Waste / Toilets" },
      { code: "EV-OPS-07", name: "IT Connectivity" },
      { code: "EV-OPS-08", name: "Venue Rental / Site Lease" },
      { code: "EV-OPS-09", name: "Equipment / Furniture Rental" },
      { code: "EV-OPS-10", name: "Standby / Emergency Services" },
    ],
  },
  {
    code: "EV-STA",
    name: "Staffing & Workforce",
    subcategories: [
      { code: "EV-STA-01", name: "Crew / Technicians" },
      { code: "EV-STA-02", name: "FOH Staff" },
      { code: "EV-STA-03", name: "Security Manpower" },
      { code: "EV-STA-04", name: "HR / Scheduling" },
      { code: "EV-STA-05", name: "Uniforms / IDs" },
      { code: "EV-STA-06", name: "Freelancers / Specialists" },
    ],
  },
  {
    code: "EV-HSE",
    name: "Security, Safety & Compliance",
    subcategories: [
      { code: "EV-HSE-01", name: "Security Systems" },
      { code: "EV-HSE-02", name: "Safety Compliance" },
      { code: "EV-HSE-03", name: "Medical Services" },
      { code: "EV-HSE-04", name: "Permits / Civil Defense" },
      { code: "EV-HSE-05", name: "Risk / Insurance" },
      { code: "EV-HSE-06", name: "Government Fees" },
      { code: "EV-HSE-07", name: "Event Insurance" },
      { code: "EV-HSE-08", name: "Equipment Insurance" },
      { code: "EV-HSE-09", name: "Sustainability / ESG" },
    ],
  },
  {
    code: "EV-GST",
    name: "Guest & Hospitality",
    subcategories: [
      { code: "EV-GST-01", name: "VIP Services" },
      { code: "EV-GST-02", name: "Access / Ticketing" },
      { code: "EV-GST-03", name: "Travel / Accommodation" },
      { code: "EV-GST-04", name: "Backstage Hospitality" },
      { code: "EV-GST-05", name: "Guest Services" },
      { code: "EV-GST-06", name: "Staff Accreditation" },
    ],
  },
  {
    code: "EV-COM",
    name: "Commercial & Business",
    subcategories: [
      { code: "EV-COM-01", name: "Marketing / PR" },
      { code: "EV-COM-02", name: "Sponsorship" },
      { code: "EV-COM-03", name: "Merchandise" },
      { code: "EV-COM-04", name: "Procurement / Contracts" },
      { code: "EV-COM-05", name: "Finance / Cost Control" },
      { code: "EV-COM-06", name: "Talent Contracts" },
    ],
  },
] as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function upsertVendorTaxonomy() {
  let subcategoryCount = 0;

  for (const categoryInput of vendorTaxonomy) {
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
    categories: vendorTaxonomy.length,
    subcategories: subcategoryCount,
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
  await upsertVendorTaxonomy();
  console.info("[seed:users] Default seed completed", {
    scope: "core-auth-users-and-vendor-taxonomy",
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
