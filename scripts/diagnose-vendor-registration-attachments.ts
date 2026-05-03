import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const DEFAULT_REQUEST_ID = "cmopo7nyh000b04jp89n2jfv5";

function getRequestId() {
  const requestIdArg = process.argv.find((arg) => arg.startsWith("--requestId="));
  return requestIdArg?.split("=")[1]?.trim() || DEFAULT_REQUEST_ID;
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const requestId = getRequestId();
  const [{ prisma }, storage] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/server/services/storage-service"),
  ]);
  const bucket = storage.STORAGE_BUCKETS.vendorRegistration;

  try {
    const request = await prisma.vendorRegistrationRequest.findUnique({
      where: {
        id: requestId,
      },
      select: {
        id: true,
        requestNumber: true,
        companyName: true,
        attachments: {
          orderBy: [
            {
              type: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          select: {
            id: true,
            type: true,
            fileName: true,
            mimeType: true,
            storagePath: true,
            sizeBytes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error(`Vendor registration request not found: ${requestId}`);
    }

    printSection("Request");
    console.log(
      JSON.stringify(
        {
          id: request.id,
          requestNumber: request.requestNumber,
          companyName: request.companyName,
          attachmentCount: request.attachments.length,
        },
        null,
        2,
      ),
    );

    const rows = [];

    for (const attachment of request.attachments) {
      let objectExists: boolean | string = false;

      try {
        objectExists = await storage.fileExists({
          bucket,
          path: attachment.storagePath,
        });
      } catch (error) {
        objectExists =
          error instanceof Error
            ? `ERROR: ${error.message}`
            : "ERROR: Unknown storage error";
      }

      rows.push({
        id: attachment.id,
        documentType: attachment.type,
        fileName: attachment.fileName,
        fileSize: attachment.sizeBytes,
        mimeType: attachment.mimeType,
        storageBucket: bucket,
        storagePath: attachment.storagePath,
        objectExists,
        createdAt: attachment.createdAt.toISOString(),
        updatedAt: attachment.updatedAt.toISOString(),
      });
    }

    printSection("Attachments");
    console.table(rows);

    const cr = request.attachments.find((attachment) => attachment.type === "CR");
    const companyProfile = request.attachments.find(
      (attachment) => attachment.type === "COMPANY_PROFILE",
    );

    printSection("CR vs COMPANY_PROFILE");
    console.log(
      JSON.stringify(
        {
          crAttachmentId: cr?.id ?? null,
          companyProfileAttachmentId: companyProfile?.id ?? null,
          companyProfileStoragePathEqualsCrStoragePath:
            Boolean(cr && companyProfile) &&
            companyProfile?.storagePath === cr?.storagePath,
          companyProfileFileNameEqualsCrFileName:
            Boolean(cr && companyProfile) &&
            companyProfile?.fileName === cr?.fileName,
          crStoragePath: cr?.storagePath ?? null,
          companyProfileStoragePath: companyProfile?.storagePath ?? null,
          crFileName: cr?.fileName ?? null,
          companyProfileFileName: companyProfile?.fileName ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    `Vendor registration attachment diagnostics failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`,
  );
  process.exitCode = 1;
});
