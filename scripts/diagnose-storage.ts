import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const BUCKET_ENV_KEYS = [
  "SUPABASE_STORAGE_BUCKET_VENDOR_REGISTRATION",
  "SUPABASE_STORAGE_BUCKET_CERTIFICATES",
  "SUPABASE_STORAGE_BUCKET_PAYMENT_INVOICES",
  "SUPABASE_STORAGE_BUCKET_REPORTS",
] as const;

function printStatus(label: string, status: "PASS" | "FAIL" | "INFO", detail: string) {
  console.log(`${status.padEnd(4)} ${label} - ${detail}`);
}

function requireCoreEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required storage env vars: ${missing.join(", ")}`);
  }

  for (const key of REQUIRED_ENV_KEYS) {
    printStatus("env", "PASS", `${key} is configured`);
  }

  for (const key of BUCKET_ENV_KEYS) {
    printStatus(
      "bucket env",
      process.env[key] ? "PASS" : "INFO",
      process.env[key]
        ? `${key}=${process.env[key]}`
        : `${key} not set; using service default`,
    );
  }
}

async function diagnoseBucket(
  storage: Awaited<typeof import("../src/server/services/storage-service")>,
  label: string,
  bucket: string,
) {
  const timestamp = Date.now();
  const objectPath = `diagnostics/${label}-${timestamp}.txt`;
  const expected = Buffer.from(`storage diagnostic ${label} ${timestamp}`, "utf8");

  await storage.uploadFile({
    bucket,
    path: objectPath,
    buffer: expected,
    contentType: "text/plain; charset=utf-8",
  });

  const downloaded = await storage.downloadFile({
    bucket,
    path: objectPath,
  });

  if (!downloaded || !downloaded.equals(expected)) {
    throw new Error(`Downloaded diagnostic payload did not match for bucket ${bucket}`);
  }

  await storage.deleteFile({
    bucket,
    path: objectPath,
  });

  const afterDelete = await storage.downloadFile({
    bucket,
    path: objectPath,
  });

  if (afterDelete) {
    throw new Error(`Diagnostic object still exists after delete in bucket ${bucket}`);
  }

  printStatus(label, "PASS", `bucket ${bucket} upload/download/delete succeeded`);
}

async function main() {
  requireCoreEnv();

  const storage = await import("../src/server/services/storage-service");

  const buckets = [
    ["vendor-registration-attachments", storage.STORAGE_BUCKETS.vendorRegistration],
    ["certificate-pdfs", storage.STORAGE_BUCKETS.certificates],
    ["payment-invoices", storage.STORAGE_BUCKETS.paymentInvoices],
    ["report-exports", storage.STORAGE_BUCKETS.reports],
  ] as const;

  for (const [label, bucket] of buckets) {
    await diagnoseBucket(storage, label, bucket);
  }

  console.log("Storage diagnostics completed successfully.");
}

main().catch((error) => {
  console.error(
    `Storage diagnostics failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exitCode = 1;
});
