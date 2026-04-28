import { loadEnvConfig } from "@next/env";

import { prisma } from "../src/lib/prisma";

loadEnvConfig(process.cwd());

function parseArgs(argv: string[]) {
  const emailArg = argv.find((entry) => entry.startsWith("--email="));
  const all = argv.includes("--all");

  return {
    all,
    email: emailArg ? emailArg.slice("--email=".length).trim().toLowerCase() : null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.all && !args.email) {
    console.error(
      "No cleanup scope provided. Use --all to remove all supplier invitations or --email=<address> to remove a specific invitation record.",
    );
    process.exitCode = 1;
    return;
  }

  const where = args.all
    ? {}
    : {
        supplierContactEmail: args.email!,
      };

  const existing = await prisma.supplierInvitation.findMany({
    where,
    select: {
      id: true,
      supplierContactEmail: true,
      supplierCompanyName: true,
      invitedAt: true,
    },
    orderBy: {
      invitedAt: "desc",
    },
  });

  if (existing.length === 0) {
    console.log("No supplier invitation records matched the cleanup scope.");
    return;
  }

  console.log(`Matched ${existing.length} supplier invitation record(s):`);
  for (const invitation of existing) {
    console.log(
      `- ${invitation.supplierContactEmail} | ${invitation.supplierCompanyName ?? "No company"} | ${invitation.invitedAt.toISOString()}`,
    );
  }

  const result = await prisma.supplierInvitation.deleteMany({
    where,
  });

  const remainingCount = await prisma.supplierInvitation.count();

  console.log(`Deleted ${result.count} supplier invitation record(s).`);
  console.log(`Remaining supplier invitations: ${remainingCount}`);
}

main()
  .catch((error) => {
    console.error("Supplier invitation cleanup failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
