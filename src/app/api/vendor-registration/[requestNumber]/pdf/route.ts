import { NextResponse } from "next/server";

import { resolveBaseUrlFromRequestHeaders } from "@/lib/vendor-registration-certificate";
import { getVendorRegistrationRequestByNumber } from "@/server/queries/vendor-registration-queries";
import {
  generateVendorRegistrationCertificatePdfBuffer,
} from "@/server/services/vendor-registration-pdf-service";
import { ensureVendorRegistrationCertificateCode } from "@/server/services/vendor-registration-service";

type VendorRegistrationPdfRouteProps = {
  params: Promise<{
    requestNumber: string;
  }>;
};

export async function GET(
  pdfRequest: Request,
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

  const certificate = request.certificateCode
    ? {
        certificateCode: request.certificateCode,
      }
    : await ensureVendorRegistrationCertificateCode(request.id);

  const buffer = await generateVendorRegistrationCertificatePdfBuffer({
    baseUrl: resolveBaseUrlFromRequestHeaders(pdfRequest.headers),
    certificateCode: certificate.certificateCode,
    requestNumber: request.requestNumber,
    supplierId: request.supplierId ?? "-",
    companyName: request.companyName,
    legalName: request.legalName,
    crNumber: request.crNumber,
    vatNumber: request.vatNumber,
    categoryName: request.categoryName,
    categoryCode: request.categoryCode,
    subcategories: request.selectedSubcategories,
    countryName: request.countryName,
    countryCode: request.countryCode,
    selectedCities: request.selectedCities,
    coverageScope: request.coverageScope,
    approvedAt: request.reviewedAt ?? request.submittedAt,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vendor-registration-${request.requestNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
