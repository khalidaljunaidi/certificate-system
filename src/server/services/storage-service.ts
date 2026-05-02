import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseBucket,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";

function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function sanitizeStorageSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
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

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return path.join("/tmp", "tg-certificate-system");
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage");
}

function resolveLocalStoragePath(storagePath: string) {
  const root = getWritableStorageRoot();
  const resolvedPath = path.resolve(
    /*turbopackIgnore: true*/ root,
    /*turbopackIgnore: true*/ storagePath,
  );

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage path.");
  }

  return resolvedPath;
}

async function uploadLocalStorageObject(input: {
  storagePath: string;
  pdfBuffer: Buffer;
}) {
  const targetPath = resolveLocalStoragePath(input.storagePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, input.pdfBuffer);

  return {
    path: input.storagePath,
  };
}

async function uploadStorageObject(input: {
  storagePath: string;
  pdfBuffer: Buffer;
  contentType: string;
  upsert?: boolean;
}) {
  if (!isStorageConfigured()) {
    return uploadLocalStorageObject(input);
  }

  const client = getSupabaseAdminClient();

  const { error } = await client.storage
    .from(getSupabaseBucket())
    .upload(input.storagePath, input.pdfBuffer, {
      contentType: input.contentType,
      upsert: input.upsert ?? true,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return {
    path: input.storagePath,
  };
}

export async function uploadCertificatePdf(
  certificateCode: string,
  pdfBuffer: Buffer,
) {
  return uploadStorageObject({
    storagePath: `certificates/${sanitizeStorageSegment(certificateCode)}.pdf`,
    pdfBuffer,
    contentType: "application/pdf",
  });
}

export async function uploadVendorRegistrationAttachment(input: {
  requestNumber: string;
  attachmentType: string;
  originalFileName: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const safeName = sanitizeStorageSegment(input.originalFileName) || "document";
  return uploadStorageObject({
    storagePath: `vendor-registrations/${sanitizeStorageSegment(
      input.requestNumber,
    )}/${sanitizeStorageSegment(input.attachmentType)}/${Date.now()}-${safeName}`,
    pdfBuffer: input.buffer,
    contentType: input.mimeType,
  });
}

export async function uploadVendorRegistrationCertificatePdf(
  requestNumber: string,
  pdfBuffer: Buffer,
) {
  return uploadStorageObject({
    storagePath: `vendor-registration-certificates/${sanitizeStorageSegment(
      requestNumber,
    )}.pdf`,
    pdfBuffer,
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
  const safeName = sanitizeStorageSegment(input.originalFileName) || "invoice";

  return uploadStorageObject({
    storagePath: `project-vendor-payments/${sanitizeStorageSegment(
      input.projectVendorId,
    )}/${sanitizeStorageSegment(input.installmentId)}/${Date.now()}-${safeName}`,
    pdfBuffer: input.buffer,
    contentType: input.mimeType,
  });
}

export async function downloadStorageObject(storagePath: string) {
  if (!isStorageConfigured()) {
    try {
      return await fs.readFile(resolveLocalStoragePath(storagePath));
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

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(getSupabaseBucket())
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download certificate PDF: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadCertificatePdf(storagePath: string) {
  try {
    return await downloadStorageObject(storagePath);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download certificate PDF: ${error.message}`);
    }

    throw error;
  }
}
