DO $$
BEGIN
  ALTER TYPE "PaymentInvoiceStatus" ADD VALUE IF NOT EXISTS 'VALIDATED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentOdooInvoiceStatus" AS ENUM (
    'UPLOADED_TO_ODOO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ProjectVendorPaymentInstallment"
ADD COLUMN IF NOT EXISTS "invoiceExistsInOdoo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "odooInvoiceStatus" "PaymentOdooInvoiceStatus",
ADD COLUMN IF NOT EXISTS "odooInvoiceReference" TEXT,
ADD COLUMN IF NOT EXISTS "odooInvoiceUploadedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "odooInvoiceNotes" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_odooInvoiceStatus_idx"
ON "ProjectVendorPaymentInstallment"("odooInvoiceStatus");

CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_odooInvoiceReference_idx"
ON "ProjectVendorPaymentInstallment"("odooInvoiceReference");
