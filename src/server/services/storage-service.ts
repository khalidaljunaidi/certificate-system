import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";

export const STORAGE_BUCKETS = {
  vendorRegistration:
    process.env.SUPABASE_STORAGE_BUCKET_VENDOR_REGISTRATION ??
    process.env.SUPABASE_VENDOR_REGISTRATION_ATTACHMENTS_BUCKET ??
    "vendor-registration-attachments",
  certificates:
    process.env.SUPABASE_STORAGE_BUCKET_CERTIFICATES ?? "certificate-pdfs",
  paymentInvoices:
    process.env.SUPABASE_STORAGE_BUCKET_PAYMENT_INVOICES ?? "payment-invoices",
  reports: process.env.SUPABASE_STORAGE_BUCKET_REPORTS ?? "report-exports",
  general: process.env.SUPABASE_STORAGE_BUCKET_GENERAL ?? "general-attachments",
} as const;

type StorageBucket = string;

type UploadFileInput = {
  bucket: StorageBucket;
  path: string;
  buffer: Buffer;
  contentType: string;
  upsert?: boolean;
};

type StorageObjectInput = {
  bucket: StorageBucket;
  path: string;
};

function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function shouldUseSupabaseStorage() {
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production" || isStorageConfigured());
}

function assertSupabaseStorageConfigured() {
  if (!isStorageConfigured()) {
    throw new Error(
      "Supabase Storage is required for persistent file storage. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

function normalizeSupabaseUrl() {
  const rawUrl = getSupabaseUrl()
    .trim()
    .replace(/^["']+|["']+$/g, "");

  const parsed = new URL(rawUrl);
  const normalized = `${parsed.protocol}//${parsed.host}`;

  if (parsed.protocol !== "https:") {
    throw new Error(
      "SUPABASE_URL must start with https://.",
    );
  }

  if (
    !parsed.hostname.endsWith(".supabase.co") &&
    parsed.hostname !== "supabase.co"
  ) {
    throw new Error(
      `SUPABASE_URL must be a valid Supabase project domain. Current host: ${parsed.hostname}`,
    );
  }

  return normalized;
}

function getSupabaseAdminClient() {
  return createClient(normalizeSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeBucketName(bucket: string) {
  const normalized = bucket.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    throw new Error("Storage bucket name is required.");
  }

  if (/^https?:\/\//i.test(normalized) || normalized.includes("/")) {
    throw new Error(
      `Storage bucket name must be plain, not a URL or path: ${bucket}`,
    );
  }

  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error(
      `Storage bucket name contains unsupported characters: ${bucket}`,
    );
  }

  return normalized;
}

function normalizeObjectPath(objectPath: string) {
  const normalized = objectPath
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");

  if (!normalized) {
    throw new Error("Storage object path is required.");
  }

  if (/^https?:\/\//i.test(normalized)) {
    throw new Error("Storage object path must not be a URL.");
  }

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error("Storage object path must not include parent traversal.");
  }

  return normalized;
}

export function sanitizeStorageFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return normalized || "file";
}

function sanitizeStorageSegment(value: string) {
  return sanitizeStorageFileName(value).replaceAll(".", "-");
}

function isSupabaseNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    statusCode?: string | number;
    status?: string | number;
    message?: string;
  };
  const status = Number(candidate.statusCode ?? candidate.status);
  const message = candidate.message?.toLowerCase() ?? "";

  return (
    status === 404 ||
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("object not found")
  );
}

export function getWritableStorageRoot() {
  const configuredStorageDir = process.env.FILE_STORAGE_DIR?.trim();

  if (configuredStorageDir) {
    return path.isAbsolute(configuredStorageDir)
      ? configuredStorageDir
      : path.join(
          /*turbopackIgnore: true*/ process.cwd(),
          configuredStorageDir,
        );
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage");
}

function resolveLocalStoragePath(bucket: string, objectPath: string) {
  const root = getWritableStorageRoot();
  const resolvedPath = path.resolve(
    /*turbopackIgnore: true*/ root,
    /*turbopackIgnore: true*/ bucket,
    /*turbopackIgnore: true*/ objectPath,
  );

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage path.");
  }

  return resolvedPath;
}

async function uploadLocalFile(input: UploadFileInput) {
  const bucket = normalizeBucketName(input.bucket);
  const objectPath = normalizeObjectPath(input.path);
  const targetPath = resolveLocalStoragePath(bucket, objectPath);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, input.buffer);

  return {
    bucket,
    path: objectPath,
  };
}

async function downloadLocalFile(input: StorageObjectInput) {
  try {
    return await fs.readFile(
      resolveLocalStoragePath(
        normalizeBucketName(input.bucket),
        normalizeObjectPath(input.path),
      ),
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

async function deleteLocalFile(input: StorageObjectInput) {
  try {
    await fs.unlink(
      resolveLocalStoragePath(
        normalizeBucketName(input.bucket),
        normalizeObjectPath(input.path),
      ),
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
}

export async function assertStorageBucketExists(
  bucket: string,
) {
  const normalizedBucket = normalizeBucketName(bucket);
  assertSupabaseStorageConfigured();

  const client = getSupabaseAdminClient();

  const { data, error } = await client.storage.listBuckets();

  if (data?.some((item) => item.name === normalizedBucket)) {
    return normalizedBucket;
  }

  if (error) {
    throw new Error(
      `Failed to check storage bucket "${normalizedBucket}": ${error.message}`,
    );
  }

  throw new Error(`Storage bucket is missing: ${normalizedBucket}`);
}

function getSafeStorageUrlHost() {
  try {
    return new URL(normalizeSupabaseUrl()).hostname;
  } catch {
    return "invalid-supabase-url";
  }
}

function logStorageOperation(input: {
  provider: "supabase";
  bucketName: string;
  objectPath: string;
}) {
  console.info("[storage]", {
    provider: input.provider,
    urlHost: getSafeStorageUrlHost(),
    bucketName: input.bucketName,
    objectPath: input.objectPath,
  });
}

export async function uploadFile(input: UploadFileInput) {
  const bucket = normalizeBucketName(input.bucket);
  const objectPath = normalizeObjectPath(input.path);

  if (!shouldUseSupabaseStorage()) {
    return uploadLocalFile({
      ...input,
      bucket,
      path: objectPath,
    });
  }

  assertSupabaseStorageConfigured();

  const client = getSupabaseAdminClient();
  logStorageOperation({
    provider: "supabase",
    bucketName: bucket,
    objectPath,
  });

  const { error } = await client.storage.from(bucket).upload(objectPath, input.buffer, {
    contentType: input.contentType,
    upsert: input.upsert ?? true,
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return {
    bucket,
    path: objectPath,
  };
}

export async function downloadFile(input: StorageObjectInput) {
  const bucket = normalizeBucketName(input.bucket);
  const objectPath = normalizeObjectPath(input.path);

  if (!shouldUseSupabaseStorage()) {
    return downloadLocalFile({
      bucket,
      path: objectPath,
    });
  }

  assertSupabaseStorageConfigured();

  const client = getSupabaseAdminClient();

  const { data, error } = await client.storage.from(bucket).download(objectPath);

  if (error) {
    if (isSupabaseNotFoundError(error)) {
      return null;
    }

    throw new Error(`Failed to download file: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function fileExists(input: StorageObjectInput) {
  const buffer = await downloadFile(input);
  return Boolean(buffer);
}

export async function deleteFile(input: StorageObjectInput) {
  const bucket = normalizeBucketName(input.bucket);
  const objectPath = normalizeObjectPath(input.path);

  if (!shouldUseSupabaseStorage()) {
    await deleteLocalFile({
      bucket,
      path: objectPath,
    });
    return;
  }

  assertSupabaseStorageConfigured();

  const client = getSupabaseAdminClient();

  const { error } = await client.storage.from(bucket).remove([objectPath]);

  if (error && !isSupabaseNotFoundError(error)) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

export async function getSignedUrl(input: StorageObjectInput & { expiresIn: number }) {
  const bucket = normalizeBucketName(input.bucket);
  const objectPath = normalizeObjectPath(input.path);

  if (!shouldUseSupabaseStorage()) {
    return null;
  }

  assertSupabaseStorageConfigured();

  const client = getSupabaseAdminClient();

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(objectPath, input.expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

async function downloadWithLegacyFallback(input: {
  bucket: string;
  path: string;
  legacyBuckets?: string[];
}) {
  const primary = await downloadFile({
    bucket: input.bucket,
    path: input.path,
  });

  if (primary) {
    return primary;
  }

  for (const legacyBucket of input.legacyBuckets ?? []) {
    if (!legacyBucket || legacyBucket === input.bucket) {
      continue;
    }

    const fallback = await downloadFile({
      bucket: legacyBucket,
      path: input.path,
    });

    if (fallback) {
      return fallback;
    }
  }

  return null;
}

export async function uploadCertificatePdf(
  certificateId: string,
  certificateCode: string,
  pdfBuffer: Buffer,
) {
  return uploadFile({
    bucket: STORAGE_BUCKETS.certificates,
    path: `certificates/${sanitizeStorageSegment(certificateId)}/${sanitizeStorageFileName(
      certificateCode,
    )}.pdf`,
    buffer: pdfBuffer,
    contentType: "application/pdf",
  });
}

export async function uploadVendorRegistrationAttachment(input: {
  requestNumber: string;
  attachmentId: string;
  attachmentType: string;
  originalFileName: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const safeName = sanitizeStorageFileName(input.originalFileName) || "document";

  return uploadFile({
    bucket: STORAGE_BUCKETS.vendorRegistration,
    path: `vendor-registration/${sanitizeStorageSegment(
      input.requestNumber,
    )}/${sanitizeStorageSegment(input.attachmentId)}-${safeName}`,
    buffer: input.buffer,
    contentType: input.mimeType,
  });
}

export async function uploadVendorRegistrationCertificatePdf(
  requestNumber: string,
  pdfBuffer: Buffer,
) {
  return uploadFile({
    bucket: STORAGE_BUCKETS.certificates,
    path: `vendor-registration-certificates/${sanitizeStorageSegment(
      requestNumber,
    )}.pdf`,
    buffer: pdfBuffer,
    contentType: "application/pdf",
  });
}

export async function uploadProjectVendorPaymentInvoice(input: {
  projectVendorId: string;
  installmentId: string;
  originalFileName: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const safeName = sanitizeStorageFileName(input.originalFileName) || "invoice";

  return uploadFile({
    bucket: STORAGE_BUCKETS.paymentInvoices,
    path: `payments/${sanitizeStorageSegment(
      input.projectVendorId,
    )}/invoices/${sanitizeStorageSegment(input.installmentId)}-${safeName}`,
    buffer: input.buffer,
    contentType: input.mimeType,
  });
}

export async function uploadReportExport(input: {
  reportType: string;
  exportId: string;
  originalFileName: string;
  buffer: Buffer;
  mimeType: string;
}) {
  return uploadFile({
    bucket: STORAGE_BUCKETS.reports,
    path: `reports/${sanitizeStorageSegment(input.reportType)}/${sanitizeStorageSegment(
      input.exportId,
    )}-${sanitizeStorageFileName(input.originalFileName)}`,
    buffer: input.buffer,
    contentType: input.mimeType,
  });
}

export async function downloadStorageObject(storagePath: string) {
  return downloadWithLegacyFallback({
    bucket: STORAGE_BUCKETS.certificates,
    path: storagePath,
  });
}

export async function downloadVendorRegistrationAttachment(storagePath: string) {
  return downloadWithLegacyFallback({
    bucket: STORAGE_BUCKETS.vendorRegistration,
    path: storagePath,
    legacyBuckets: [
      process.env.SUPABASE_VENDOR_REGISTRATION_ATTACHMENTS_BUCKET,
    ].filter(Boolean) as string[],
  });
}

export async function downloadProjectVendorPaymentInvoice(storagePath: string) {
  return downloadWithLegacyFallback({
    bucket: STORAGE_BUCKETS.paymentInvoices,
    path: storagePath,
  });
}

export async function downloadCertificatePdf(storagePath: string) {
  return downloadWithLegacyFallback({
    bucket: STORAGE_BUCKETS.certificates,
    path: storagePath,
  });
}
