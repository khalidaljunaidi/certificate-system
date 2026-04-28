-- CreateEnum
CREATE TYPE "PaymentAmountSource" AS ENUM ('PO_CONTRACT', 'APPROVED_CERTIFICATE');

-- AlterTable
ALTER TABLE "ProjectVendor"
ADD COLUMN "paymentAmount" DECIMAL(12,2),
ADD COLUMN "paymentAmountSource" "PaymentAmountSource",
ADD COLUMN "paymentSourceCertificateId" TEXT,
ADD COLUMN "paymentAmountSyncedAt" TIMESTAMP(3);

-- Backfill current payment amounts from existing PO / contract amounts
UPDATE "ProjectVendor"
SET
  "paymentAmount" = "poAmount",
  "paymentAmountSource" = CASE
    WHEN "poAmount" IS NOT NULL THEN 'PO_CONTRACT'::"PaymentAmountSource"
    ELSE NULL
  END,
  "paymentAmountSyncedAt" = CASE
    WHEN "poAmount" IS NOT NULL THEN NOW()
    ELSE NULL
  END
WHERE "paymentAmount" IS NULL;

-- CreateIndex
CREATE INDEX "ProjectVendor_paymentAmountSource_idx" ON "ProjectVendor"("paymentAmountSource");

-- CreateIndex
CREATE INDEX "ProjectVendor_paymentSourceCertificateId_idx" ON "ProjectVendor"("paymentSourceCertificateId");

-- AddForeignKey
ALTER TABLE "ProjectVendor"
ADD CONSTRAINT "ProjectVendor_paymentSourceCertificateId_fkey"
FOREIGN KEY ("paymentSourceCertificateId") REFERENCES "Certificate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
