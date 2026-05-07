import crypto from "node:crypto";

import {
  STORAGE_BUCKETS,
  createSignedUploadUrl,
  sanitizeStorageFileName,
} from "@/server/services/storage-service";

export const runtime = "nodejs";

const MAX_VENDOR_REGISTRATION_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "CR",
  "VAT",
  "COMPANY_PROFILE",
  "FINANCIALS",
  "BANK_CERTIFICATE",
]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function sanitizeStorageSegment(value: string) {
  return sanitizeStorageFileName(value).replaceAll(".", "-");
}

function isPlainString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const requestNumber = isPlainString(payload.requestNumber)
      ? payload.requestNumber
      : "";
    const documentType = isPlainString(payload.documentType)
      ? payload.documentType
      : "";
    const fileName = isPlainString(payload.fileName) ? payload.fileName : "";
    const mimeType = isPlainString(payload.mimeType) ? payload.mimeType : "";
    const sizeBytes = Number(payload.sizeBytes);

    console.info("[supplier-registration] signed upload url requested", {
      requestNumber: requestNumber ? sanitizeStorageSegment(requestNumber) : "",
      documentType,
      fileName,
      mimeType,
      sizeBytes,
    });

    if (!requestNumber) {
      return Response.json(
        { error: "Upload request number is required." },
        { status: 400 },
      );
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      return Response.json(
        { error: "Unsupported document type." },
        { status: 400 },
      );
    }

    if (!fileName) {
      return Response.json(
        { error: "File name is required." },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > MAX_VENDOR_REGISTRATION_UPLOAD_BYTES
    ) {
      return Response.json(
        { error: "File is too large. Maximum allowed size is 10MB." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      const lowerFileName = fileName.trim().toLowerCase();
      const hasAllowedExtension = [".pdf", ".jpg", ".jpeg", ".png"].some(
        (extension) => lowerFileName.endsWith(extension),
      );

      if (!hasAllowedExtension) {
        return Response.json(
          { error: "Only PDF, JPG, and PNG files are supported." },
          { status: 400 },
        );
      }
    }

    const safeRequestNumber = sanitizeStorageSegment(requestNumber);
    const safeDocumentType = sanitizeStorageSegment(documentType);
    const safeFileName = sanitizeStorageFileName(fileName);
    const objectId = crypto.randomUUID();
    const storagePath = `vendor-registration/${safeRequestNumber}/${safeDocumentType}/${sanitizeStorageSegment(
      objectId,
    )}-${safeFileName}`;
    const signedUpload = await createSignedUploadUrl({
      bucket: STORAGE_BUCKETS.vendorRegistration,
      path: storagePath,
    });

    return Response.json({
      storagePath: signedUpload.storagePath,
      token: signedUpload.token,
    });
  } catch (error) {
    console.warn("[supplier-registration] signed upload url failed", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        error:
          "Document upload could not be prepared. Please try again or contact procurement.",
      },
      { status: 500 },
    );
  }
}
