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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
          passwordHash,
          title: user.title,
          role: user.role,
          locale: "EN",
          isActive: true,
          passwordChanged: false,
          passwordUpdatedAt: null,
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
  console.info("[seed:users] Default seed completed", {
    scope: "core-auth-users-only",
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
