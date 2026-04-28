import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canExportPayments, canViewPayments } from "@/lib/permissions";
import { getPaymentRecordDetail } from "@/server/queries/payment-queries";
import { generatePaymentRecordPdfBuffer } from "@/server/services/payment-report-service";

type PaymentRecordReportRouteProps = {
  params: Promise<{
    projectVendorId: string;
  }>;
};

export async function GET(_: Request, { params }: PaymentRecordReportRouteProps) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("You must be signed in to export payment reports.", {
      status: 401,
    });
  }

  if (!canViewPayments(user) || !canExportPayments(user)) {
    return new NextResponse("You do not have permission to export payment reports.", {
      status: 403,
    });
  }

  const { projectVendorId } = await params;
  const detail = await getPaymentRecordDetail({
    viewer: user,
    projectVendorId,
  });

  if (!detail) {
    return new NextResponse("Payment record not found.", { status: 404 });
  }

  const pdfBuffer = await generatePaymentRecordPdfBuffer(detail);

  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${detail.record.projectCode}-${detail.record.vendorId}-payment-report.pdf"`,
    },
  });
}
