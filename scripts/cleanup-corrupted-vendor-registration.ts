import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../src/lib/prisma";
import { STORAGE_BUCKETS } from "../src/server/services/storage-service";

loadEnvConfig(process.cwd());

const TARGET = {
  requestId: "cmopo7nyh000b04jp89n2jfv5",
  requestNumber: "VR-20260503-A5C909",
  companyName: "شركة المهارة",
};

type CleanupAction = "delete" | "skip" | "delete storage object";

type SummaryRow = {
  model: string;
  action: CleanupAction;
  count: number;
  note?: string;
};

type SupabaseListedItem = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
    storageOnly: argv.includes("--storage-only"),
  };
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function sanitizeStorageSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .replaceAll(".", "-");

  return normalized || "unknown";
}

function buildTargetStoragePrefixes() {
  const exact = TARGET.requestNumber;
  const sanitized = sanitizeStorageSegment(TARGET.requestNumber);

  return unique([
    `vendor-registration/${exact}`,
    `vendor-registration/${sanitized}`,
    `vendor-registrations/${exact}`,
    `vendor-registrations/${sanitized}`,
    `vendor-registration/vendor-registration/${exact}`,
    `vendor-registration/vendor-registration/${sanitized}`,
  ]);
}

function normalizeStoragePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

function jsonIncludesAny(value: unknown, needles: string[]) {
  const serialized = JSON.stringify(value ?? "");
  return needles.some((needle) => serialized.includes(needle));
}

function printSummary(rows: SummaryRow[]) {
  console.log("\nCleanup summary:");
  for (const row of rows) {
    const note = row.note ? ` | ${row.note}` : "";
    console.log(`- ${row.model}: ${row.count} to ${row.action}${note}`);
  }
}

function printList(title: string, values: string[]) {
  console.log(`\n${title} (${values.length}):`);

  if (values.length === 0) {
    console.log("  - none");
    return;
  }

  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

function normalizeSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL?.trim().replace(/^["']+|["']+$/g, "");

  if (!rawUrl) {
    return null;
  }

  const parsed = new URL(rawUrl);
  return `${parsed.protocol}//${parsed.host}`;
}

function getSupabaseAdminClient() {
  const url = normalizeSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isSupabaseFileItem(item: SupabaseListedItem) {
  const metadata = item.metadata ?? {};
  const metadataKeys = Object.keys(metadata);
  const hasFileMetadata =
    metadataKeys.length > 0 &&
    (metadataKeys.includes("mimetype") ||
      metadataKeys.includes("size") ||
      metadataKeys.includes("cacheControl") ||
      metadataKeys.includes("lastModified"));

  return Boolean(item.id || hasFileMetadata);
}

async function listSupabaseObjectsRecursively(input: {
  bucket: string;
  prefix: string;
}) {
  const client = getSupabaseAdminClient();

  if (!client) {
    console.warn(
      "Supabase storage scan skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return [];
  }

  const storageClient = client;
  const objectPaths: string[] = [];
  const visitedPrefixes = new Set<string>();
  const normalizedStartPrefix = normalizeStoragePath(input.prefix).replace(/\/+$/g, "");

  async function walk(prefix: string) {
    if (visitedPrefixes.has(prefix)) {
      return;
    }
    visitedPrefixes.add(prefix);

    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const { data, error } = await storageClient.storage
        .from(input.bucket)
        .list(prefix, {
          limit: pageSize,
          offset,
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

      if (error) {
        throw new Error(
          `Failed to list Supabase objects under ${input.bucket}/${prefix}: ${error.message}`,
        );
      }

      const items = (data ?? []) as SupabaseListedItem[];

      for (const item of items) {
        const objectPath = normalizeStoragePath(`${prefix}/${item.name}`);

        if (isSupabaseFileItem(item)) {
          objectPaths.push(objectPath);
          continue;
        }

        await walk(objectPath);
      }

      if (items.length < pageSize) {
        break;
      }

      offset += pageSize;
    }
  }

  await walk(normalizedStartPrefix);
  return unique(objectPaths);
}

async function scanStoragePrefixes(prefixes: string[]) {
  const bucket = STORAGE_BUCKETS.vendorRegistration;
  const objectPaths = unique(
    (
      await Promise.all(
        prefixes.map((prefix) =>
          listSupabaseObjectsRecursively({
            bucket,
            prefix,
          }).catch((error) => {
            console.warn(
              `Storage prefix scan skipped for ${bucket}/${prefix}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return [];
          }),
        ),
      )
    ).flat(),
  );

  return {
    bucket,
    objectPaths,
  };
}

async function deleteSupabaseObjects(input: {
  bucket: string;
  objectPaths: string[];
}) {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error(
      "Cannot delete Supabase objects because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  if (input.objectPaths.length === 0) {
    return;
  }

  const batchSize = 100;
  for (let index = 0; index < input.objectPaths.length; index += batchSize) {
    const batch = input.objectPaths.slice(index, index + batchSize);
    const { error } = await client.storage.from(input.bucket).remove(batch);

    if (error) {
      throw new Error(
        `Failed to delete Supabase objects from ${input.bucket}: ${error.message}`,
      );
    }
  }
}

async function loadRequestById() {
  return prisma.vendorRegistrationRequest.findUnique({
    where: {
      id: TARGET.requestId,
    },
    include: {
      attachments: {
        select: {
          id: true,
          type: true,
          fileName: true,
          storagePath: true,
        },
      },
      references: {
        select: {
          id: true,
        },
      },
      selectedCities: {
        select: {
          cityId: true,
        },
      },
      selectedSubcategories: {
        select: {
          subcategoryId: true,
        },
      },
      approvedVendor: {
        select: {
          id: true,
          vendorName: true,
          vendorEmail: true,
          vendorId: true,
          supplierId: true,
          _count: {
            select: {
              registrationRequests: true,
              projectLinks: true,
              certificates: true,
              evaluationCycles: true,
              operationalTasks: true,
            },
          },
        },
      },
    },
  });
}

async function assertNoMismatchedRequestNumber() {
  const requestByNumber = await prisma.vendorRegistrationRequest.findUnique({
    where: {
      requestNumber: TARGET.requestNumber,
    },
    select: {
      id: true,
      companyName: true,
    },
  });

  if (requestByNumber && requestByNumber.id !== TARGET.requestId) {
    throw new Error(
      `Safety stop: request number ${TARGET.requestNumber} exists on ${requestByNumber.id}, not ${TARGET.requestId}.`,
    );
  }
}

function assertSafeTarget(request: NonNullable<Awaited<ReturnType<typeof loadRequestById>>>) {
  if (request.id !== TARGET.requestId) {
    throw new Error(
      `Safety stop: expected request ID ${TARGET.requestId}, found ${request.id}.`,
    );
  }

  if (request.requestNumber !== TARGET.requestNumber) {
    throw new Error(
      `Safety stop: expected request number ${TARGET.requestNumber}, found ${request.requestNumber}.`,
    );
  }

  if (request.companyName !== TARGET.companyName) {
    throw new Error(
      `Safety stop: expected company name ${TARGET.companyName}, found ${request.companyName}.`,
    );
  }
}

function shouldDeleteApprovedVendor(
  request: NonNullable<Awaited<ReturnType<typeof loadRequestById>>>,
) {
  const vendor = request.approvedVendor;

  if (!vendor || request.approvedVendorId !== vendor.id) {
    return false;
  }

  return (
    vendor._count.registrationRequests === 1 &&
    vendor._count.projectLinks === 0 &&
    vendor._count.certificates === 0 &&
    vendor._count.evaluationCycles === 0 &&
    vendor._count.operationalTasks === 0
  );
}

async function collectCleanupScope(
  request: NonNullable<Awaited<ReturnType<typeof loadRequestById>>>,
  storagePrefixObjects: string[],
) {
  const deleteApprovedVendor = shouldDeleteApprovedVendor(request);
  const vendorIds =
    deleteApprovedVendor && request.approvedVendorId ? [request.approvedVendorId] : [];
  const attachmentIds = request.attachments.map((attachment) => attachment.id);
  const referenceIds = request.references.map((reference) => reference.id);
  const selectedCityIds = request.selectedCities.map((selection) => selection.cityId);
  const selectedSubcategoryIds = request.selectedSubcategories.map(
    (selection) => selection.subcategoryId,
  );

  const needles = unique([
    request.id,
    request.requestNumber,
    request.companyName,
    request.legalName,
    request.companyEmail,
    request.crNumber,
    request.vatNumber,
    request.supplierId,
    request.certificateCode,
    request.certificatePdfStoragePath,
    request.approvedVendorId,
    ...attachmentIds,
    ...request.attachments.map((attachment) => attachment.storagePath),
  ]);

  const auditCandidates = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityId: {
            in: unique([request.id, request.requestNumber, ...attachmentIds]),
          },
        },
        {
          entityType: {
            contains: "VendorRegistration",
          },
        },
      ],
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      details: true,
    },
  });
  const auditLogIds = auditCandidates
    .filter((auditLog) => jsonIncludesAny(auditLog, needles))
    .map((auditLog) => auditLog.id);

  const systemErrorCandidates = await prisma.systemErrorLog.findMany({
    where: {
      OR: [
        {
          action: {
            contains: "VendorRegistration",
          },
        },
        {
          action: {
            contains: "Vendor",
          },
        },
        {
          errorMessage: {
            contains: TARGET.requestNumber,
          },
        },
        {
          errorMessage: {
            contains: TARGET.companyName,
          },
        },
      ],
    },
    select: {
      id: true,
      action: true,
      errorMessage: true,
      context: true,
    },
  });
  const systemErrorLogIds = systemErrorCandidates
    .filter((systemErrorLog) => jsonIncludesAny(systemErrorLog, needles))
    .map((systemErrorLog) => systemErrorLog.id);

  const notificationWhere = {
    OR: [
      {
        href: {
          contains: request.id,
        },
      },
      {
        href: {
          contains: request.requestNumber,
        },
      },
      {
        title: {
          contains: request.requestNumber,
        },
      },
      {
        title: {
          contains: request.companyName,
        },
      },
      {
        message: {
          contains: request.requestNumber,
        },
      },
      {
        message: {
          contains: request.companyName,
        },
      },
      ...(vendorIds.length
        ? [
            {
              relatedVendorId: {
                in: vendorIds,
              },
            },
          ]
        : []),
    ],
  };

  const notifications = await prisma.notification.findMany({
    where: notificationWhere,
    select: {
      id: true,
    },
  });
  const notificationIds = notifications.map((notification) => notification.id);

  const dispatchLogCandidates = await prisma.notificationDispatchLog.findMany({
    where: {
      OR: [
        {
          linkHref: {
            contains: request.id,
          },
        },
        {
          linkHref: {
            contains: request.requestNumber,
          },
        },
        ...(vendorIds.length
          ? [
              {
                relatedVendorId: {
                  in: vendorIds,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      linkHref: true,
      recipientSnapshot: true,
    },
  });
  const dispatchLogIds = dispatchLogCandidates
    .filter((dispatchLog) => jsonIncludesAny(dispatchLog, needles))
    .map((dispatchLog) => dispatchLog.id);

  const vendorRegistrationStoragePaths = unique([
    ...request.attachments.map((attachment) => attachment.storagePath),
    ...storagePrefixObjects,
  ]).map(normalizeStoragePath);
  const certificateStoragePaths = unique([request.certificatePdfStoragePath]).map(
    normalizeStoragePath,
  );

  return {
    request,
    deleteApprovedVendor,
    vendorIds,
    attachmentIds,
    referenceIds,
    selectedCityIds,
    selectedSubcategoryIds,
    auditLogIds,
    systemErrorLogIds,
    notificationWhere,
    notificationIds,
    dispatchLogIds,
    vendorRegistrationStoragePaths,
    certificateStoragePaths,
  };
}

function buildSummary(
  scope: Awaited<ReturnType<typeof collectCleanupScope>>,
  storagePrefixes: string[],
) {
  return [
    {
      model: "Notification",
      action: "delete",
      count: scope.notificationIds.length,
    },
    {
      model: "NotificationDispatchLog",
      action: "delete",
      count: scope.dispatchLogIds.length,
      note: "email/outbox dispatch records linked to this request",
    },
    {
      model: "AuditLog",
      action: "delete",
      count: scope.auditLogIds.length,
    },
    {
      model: "SystemErrorLog",
      action: "delete",
      count: scope.systemErrorLogIds.length,
    },
    {
      model: "VendorRegistrationRequestSubcategory",
      action: "delete",
      count: scope.selectedSubcategoryIds.length,
    },
    {
      model: "VendorRegistrationRequestCity",
      action: "delete",
      count: scope.selectedCityIds.length,
    },
    {
      model: "VendorRegistrationReference",
      action: "delete",
      count: scope.referenceIds.length,
    },
    {
      model: "VendorRegistrationAttachment",
      action: "delete",
      count: scope.attachmentIds.length,
    },
    {
      model: "VendorRegistrationRequest",
      action: "delete",
      count: 1,
    },
    {
      model: "Approved Vendor",
      action: scope.deleteApprovedVendor ? "delete" : "skip",
      count: scope.vendorIds.length,
      note: scope.deleteApprovedVendor
        ? "vendor has no other registrations, assignments/POs/contracts, certificates, evaluations, or tasks"
        : "not deleted unless proven created only from this request",
    },
    {
      model: "Supabase vendor-registration objects",
      action: "delete storage object",
      count: scope.vendorRegistrationStoragePaths.length,
      note: `bucket=${STORAGE_BUCKETS.vendorRegistration}; prefixes=${storagePrefixes.join(", ")}`,
    },
    {
      model: "Supabase certificate objects",
      action: "delete storage object",
      count: scope.certificateStoragePaths.length,
      note: `bucket=${STORAGE_BUCKETS.certificates}`,
    },
  ] satisfies SummaryRow[];
}

function printDetailedScope(input: {
  storageOnly: boolean;
  storagePrefixes: string[];
  request?: NonNullable<Awaited<ReturnType<typeof loadRequestById>>>;
  scope?: Awaited<ReturnType<typeof collectCleanupScope>>;
  storageObjectPaths: string[];
}) {
  console.log("\nExact cleanup scope:");
  printList("Storage prefixes scanned", input.storagePrefixes);
  printList("Storage object paths found by prefix scan", input.storageObjectPaths);

  if (!input.scope) {
    return;
  }

  if (!input.storageOnly) {
    printList("VendorRegistrationRequest IDs", [input.scope.request.id]);
    printList("VendorRegistrationAttachment IDs", input.scope.attachmentIds);
    printList("VendorRegistrationReference IDs", input.scope.referenceIds);
    printList("VendorRegistrationRequestCity city IDs", input.scope.selectedCityIds);
    printList(
      "VendorRegistrationRequestSubcategory subcategory IDs",
      input.scope.selectedSubcategoryIds,
    );
    printList("Notification IDs", input.scope.notificationIds);
    printList("NotificationDispatchLog IDs", input.scope.dispatchLogIds);
    printList("AuditLog IDs", input.scope.auditLogIds);
    printList("SystemErrorLog IDs", input.scope.systemErrorLogIds);
    printList("Approved Vendor IDs safe to delete", input.scope.vendorIds);
  }

  printList(
    "Vendor registration storage object paths to delete",
    input.scope.vendorRegistrationStoragePaths,
  );
  printList("Certificate storage object paths to delete", input.scope.certificateStoragePaths);
}

async function executeStorageCleanup(input: {
  vendorRegistrationStoragePaths: string[];
  certificateStoragePaths: string[];
}) {
  await deleteSupabaseObjects({
    bucket: STORAGE_BUCKETS.vendorRegistration,
    objectPaths: input.vendorRegistrationStoragePaths,
  });

  await deleteSupabaseObjects({
    bucket: STORAGE_BUCKETS.certificates,
    objectPaths: input.certificateStoragePaths,
  });
}

async function executeDatabaseCleanup(
  scope: Awaited<ReturnType<typeof collectCleanupScope>>,
) {
  await prisma.$transaction(
    async (tx) => {
      await tx.notification.deleteMany({
        where: scope.notificationWhere,
      });

      if (scope.dispatchLogIds.length > 0) {
        await tx.notificationDispatchLog.deleteMany({
          where: {
            id: {
              in: scope.dispatchLogIds,
            },
          },
        });
      }

      if (scope.auditLogIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: {
            id: {
              in: scope.auditLogIds,
            },
          },
        });
      }

      if (scope.systemErrorLogIds.length > 0) {
        await tx.systemErrorLog.deleteMany({
          where: {
            id: {
              in: scope.systemErrorLogIds,
            },
          },
        });
      }

      await tx.vendorRegistrationRequest.delete({
        where: {
          id: scope.request.id,
        },
      });

      if (scope.deleteApprovedVendor && scope.vendorIds.length > 0) {
        await tx.vendorSubcategorySelection.deleteMany({
          where: {
            vendorId: {
              in: scope.vendorIds,
            },
          },
        });

        await tx.vendor.deleteMany({
          where: {
            id: {
              in: scope.vendorIds,
            },
          },
        });
      }
    },
    {
      timeout: 15000,
    },
  );
}

async function printPostChecks(storagePrefixes: string[]) {
  const [requestCount, attachmentCount, notificationCount, storageScan] =
    await Promise.all([
      prisma.vendorRegistrationRequest.count({
        where: {
          id: TARGET.requestId,
          requestNumber: TARGET.requestNumber,
        },
      }),
      prisma.vendorRegistrationAttachment.count({
        where: {
          requestId: TARGET.requestId,
        },
      }),
      prisma.notification.count({
        where: {
          OR: [
            {
              href: {
                contains: TARGET.requestId,
              },
            },
            {
              href: {
                contains: TARGET.requestNumber,
              },
            },
            {
              title: {
                contains: TARGET.requestNumber,
              },
            },
            {
              message: {
                contains: TARGET.requestNumber,
              },
            },
            {
              title: {
                contains: TARGET.companyName,
              },
            },
            {
              message: {
                contains: TARGET.companyName,
              },
            },
          ],
        },
      }),
      scanStoragePrefixes(storagePrefixes),
    ]);

  console.log("\nPost-cleanup checks:");
  console.log(
    `- Request ${TARGET.requestNumber}: ${requestCount === 0 ? "not found" : "still present"}`,
  );
  console.log(
    `- Attachments for ${TARGET.requestNumber}: ${
      attachmentCount === 0 ? "not found" : "still present"
    }`,
  );
  console.log(
    `- Notifications referencing ${TARGET.requestNumber}: ${
      notificationCount === 0 ? "not found" : "still present"
    }`,
  );
  console.log(
    `- Storage objects under target prefixes: ${
      storageScan.objectPaths.length === 0
        ? "not found"
        : `${storageScan.objectPaths.length} still present`
    }`,
  );

  for (const objectPath of storageScan.objectPaths) {
    console.log(`  - ${objectPath}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const storagePrefixes = buildTargetStoragePrefixes();
  const storageScan = await scanStoragePrefixes(storagePrefixes);

  await assertNoMismatchedRequestNumber();
  const request = await loadRequestById();

  if (!request) {
    console.log(
      `No vendor registration request found for ${TARGET.requestId} / ${TARGET.requestNumber}.`,
    );
    console.log("Continuing with orphan storage cleanup scope.");
    console.log(`- Bucket: ${storageScan.bucket}`);
    printDetailedScope({
      storageOnly: true,
      storagePrefixes,
      storageObjectPaths: storageScan.objectPaths,
    });

    printSummary([
      {
        model: "Supabase vendor-registration objects",
        action: "delete storage object",
        count: storageScan.objectPaths.length,
        note: `bucket=${storageScan.bucket}`,
      },
    ]);

    if (!args.confirm) {
      console.log("\nDry run only. Re-run with --confirm to delete orphan storage objects.");
      return;
    }

    await deleteSupabaseObjects({
      bucket: storageScan.bucket,
      objectPaths: storageScan.objectPaths,
    });
    await printPostChecks(storagePrefixes);
    return;
  }

  assertSafeTarget(request);

  const scope = await collectCleanupScope(request, storageScan.objectPaths);
  const summary = buildSummary(scope, storagePrefixes);

  console.log("Target confirmed:");
  console.log(`- Request ID: ${request.id}`);
  console.log(`- Request number: ${request.requestNumber}`);
  console.log(`- Company name: ${request.companyName}`);
  console.log(`- Status: ${request.status}`);
  console.log(`- Supplier ID: ${request.supplierId ?? "not assigned"}`);
  console.log(`- Certificate code: ${request.certificateCode ?? "not issued"}`);
  console.log(
    `- Approved vendor cleanup: ${
      scope.deleteApprovedVendor
        ? scope.vendorIds.join(", ")
        : "skipped unless proven request-only"
    }`,
  );

  printSummary(
    args.storageOnly
      ? summary.filter((row) => row.action === "delete storage object")
      : summary,
  );
  printDetailedScope({
    storageOnly: args.storageOnly,
    storagePrefixes,
    request,
    scope,
    storageObjectPaths: storageScan.objectPaths,
  });

  if (!args.confirm) {
    console.log(
      `\nDry run only. Re-run with --confirm to execute ${
        args.storageOnly ? "storage cleanup" : "database and storage cleanup"
      }.`,
    );
    return;
  }

  if (!args.storageOnly) {
    console.log("\n--confirm received. Executing corrupted request database cleanup...");
    await executeDatabaseCleanup(scope);
  } else {
    console.log("\n--storage-only --confirm received. Skipping database cleanup.");
  }

  console.log("Executing storage cleanup...");
  await executeStorageCleanup({
    vendorRegistrationStoragePaths: scope.vendorRegistrationStoragePaths,
    certificateStoragePaths: args.storageOnly ? [] : scope.certificateStoragePaths,
  });

  await printPostChecks(storagePrefixes);
}

main()
  .catch((error) => {
    console.error("Corrupted vendor registration cleanup failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
