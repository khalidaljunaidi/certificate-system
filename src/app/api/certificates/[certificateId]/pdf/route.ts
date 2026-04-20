import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { getCertificateForPdf } from "@/server/queries/certificate-queries";
import { downloadCertificatePdf } from "@/server/services/storage-service";
import { generateCertificatePdfBuffer } from "@/server/services/pdf-service";

type CertificatePdfRouteProps = {
  params: Promise<{
    certificateId: string;
  }>;
};

export async function GET(_request: Request, { params }: CertificatePdfRouteProps) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { certificateId } = await params;
  const certificate = await getCertificateForPdf(certificateId);

  if (!certificate) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!["ISSUED", "REVOKED"].includes(certificate.status)) {
    return new NextResponse("PDF is only available for issued certificates.", {
      status: 400,
    });
  }

  const pdfBuffer =
    certificate.pdfStoragePath
      ? await downloadCertificatePdf(certificate.pdfStoragePath)
      : null;

  const buffer = pdfBuffer ?? (await generateCertificatePdfBuffer(certificate));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${certificate.certificateCode}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
