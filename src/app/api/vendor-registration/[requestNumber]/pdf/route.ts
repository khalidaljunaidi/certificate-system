import { NextResponse } from "next/server";

import { getVendorRegistrationRequestByNumber } from "@/server/queries/vendor-registration-queries";
import { downloadCertificatePdf } from "@/server/services/storage-service";
import {
  generateVendorRegistrationCertificatePdfBuffer,
} from "@/server/services/vendor-registration-pdf-service";

type VendorRegistrationPdfRouteProps = {
  params: Promise<{
    requestNumber: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: VendorRegistrationPdfRouteProps,
) {
  const { requestNumber } = await params;
  const request = await getVendorRegistrationRequestByNumber(requestNumber);

  if (!request) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (request.status !== "APPROVED") {
    return new NextResponse("PDF is only available for approved registrations.", {
      status: 400,
    });
  }

  const pdfBuffer = request.certificatePdfStoragePath
    ? await downloadCertificatePdf(request.certificatePdfStoragePath)
    : null;

  const buffer =
    pdfBuffer ??
    (await generateVendorRegistrationCertificatePdfBuffer({
      certificateId: request.id,
      requestNumber: request.requestNumber,
      supplierId: request.supplierId ?? "-",
      companyName: request.companyName,
      legalName: request.legalName,
      crNumber: request.crNumber,
      vatNumber: request.vatNumber,
      categoryName: request.categoryName,
      approvedAt: request.reviewedAt ?? request.submittedAt,
    }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${request.requestNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
