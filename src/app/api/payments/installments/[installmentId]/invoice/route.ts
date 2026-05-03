import { NextResponse } from "next/server";

import { getCurrentAuthenticatedUser } from "@/lib/auth";
import { canViewPayments, shouldScopePaymentsToAssignedRecords } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { downloadProjectVendorPaymentInvoice } from "@/server/services/storage-service";

type PaymentInvoiceRouteProps = {
  params: Promise<{
    installmentId: string;
  }>;
};

export async function GET(_: Request, { params }: PaymentInvoiceRouteProps) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!canViewPayments(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { installmentId } = await params;
  const installment = await prisma.projectVendorPaymentInstallment.findUnique({
    where: {
      id: installmentId,
    },
    select: {
      id: true,
      invoiceStoragePath: true,
      invoiceNumber: true,
      projectVendor: {
        select: {
          paymentFinanceOwnerUserId: true,
        },
      },
    },
  });

  if (!installment?.invoiceStoragePath) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  if (
    shouldScopePaymentsToAssignedRecords(user) &&
    installment.projectVendor.paymentFinanceOwnerUserId !== user.id
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const buffer = await downloadProjectVendorPaymentInvoice(installment.invoiceStoragePath);

  if (!buffer) {
    return new NextResponse("File must be re-uploaded", { status: 404 });
  }

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `inline; filename="${installment.invoiceNumber ?? installment.id}"`,
    },
  });
}
