ALTER TYPE "PermissionCategory" ADD VALUE IF NOT EXISTS 'PAYMENTS';

ALTER TABLE "ProjectVendor"
ADD COLUMN "paymentFinanceOwnerUserId" TEXT,
ADD COLUMN "paymentNotes" TEXT,
ADD COLUMN "paymentClosedAt" TIMESTAMP(3),
ADD COLUMN "paymentClosedByUserId" TEXT;

ALTER TABLE "ProjectVendorPaymentInstallment"
ADD COLUMN "invoiceReceivedDate" TIMESTAMP(3);

ALTER TABLE "ProjectVendor"
ADD CONSTRAINT "ProjectVendor_paymentFinanceOwnerUserId_fkey"
FOREIGN KEY ("paymentFinanceOwnerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectVendor"
ADD CONSTRAINT "ProjectVendor_paymentClosedByUserId_fkey"
FOREIGN KEY ("paymentClosedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectVendor_paymentFinanceOwnerUserId_idx"
ON "ProjectVendor"("paymentFinanceOwnerUserId");

CREATE INDEX "ProjectVendor_paymentClosedAt_idx"
ON "ProjectVendor"("paymentClosedAt");

CREATE INDEX "ProjectVendorPaymentInstallment_invoiceReceivedDate_idx"
ON "ProjectVendorPaymentInstallment"("invoiceReceivedDate");
