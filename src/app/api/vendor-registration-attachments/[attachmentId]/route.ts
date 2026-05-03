import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  STORAGE_BUCKETS,
  downloadVendorRegistrationAttachment,
  getSignedUrl,
} from "@/server/services/storage-service";

type VendorRegistrationAttachmentRouteProps = {
  params: Promise<{
    attachmentId: string;
  }>;
};

function safeFileName(fileName: string) {
  return fileName.replaceAll(/[\r\n"]/g, "").trim() || "attachment";
}

export async function GET(
  request: Request,
  { params }: VendorRegistrationAttachmentRouteProps,
) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!canManageVendorGovernance(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { attachmentId } = await params;
  const attachment = await prisma.vendorRegistrationAttachment.findUnique({
    where: {
      id: attachmentId,
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      storagePath: true,
    },
  });

  if (!attachment) {
    return new NextResponse("Attachment not found", { status: 404 });
  }

  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET_VENDOR_REGISTRATION ??
    STORAGE_BUCKETS.vendorRegistration;
  const objectPath = attachment.storagePath.replace(/^\/+/, "");
  const shouldDownload = new URL(request.url).searchParams.has("download");

  console.log({ bucket, objectPath });

  try {
    const signedUrl = await getSignedUrl({
      bucket,
      path: objectPath,
      expiresIn: 60,
      download: shouldDownload ? safeFileName(attachment.fileName) : undefined,
    });

    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }
  } catch (error) {
    console.warn("[vendor-registration-attachment] signed url failed", {
      attachmentId: attachment.id,
      bucket,
      objectPath,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new NextResponse("File must be re-uploaded", { status: 404 });
  }

  const buffer = await downloadVendorRegistrationAttachment(objectPath);

  if (!buffer) {
    return new NextResponse("File must be re-uploaded", { status: 404 });
  }

  const dispositionType = shouldDownload ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Disposition": `${dispositionType}; filename="${safeFileName(
        attachment.fileName,
      )}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
