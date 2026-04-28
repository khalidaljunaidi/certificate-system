DO $$
BEGIN
  CREATE TYPE "PaymentInvoiceStatus" AS ENUM (
    'MISSING',
    'RECEIVED',
    'REJECTED',
    'APPROVED_FOR_PAYMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentWorkflowOverrideStatus" AS ENUM (
    'ON_HOLD',
    'DISPUTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentInstallmentStatus_new" AS ENUM (
    'PLANNED',
    'INVOICE_REQUIRED',
    'INVOICE_RECEIVED',
    'UNDER_REVIEW',
    'SCHEDULED',
    'PAID',
    'OVERDUE',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ProjectVendorPaymentInstallment"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ProjectVendorPaymentInstallment"
ALTER COLUMN "status"
TYPE "PaymentInstallmentStatus_new"
USING (
  CASE
    WHEN "status"::text = 'AWAITING_INVOICE'
      AND (
        "invoiceNumber" IS NOT NULL
        OR "invoiceReceivedDate" IS NOT NULL
        OR "invoiceStoragePath" IS NOT NULL
      )
      THEN 'INVOICE_RECEIVED'
    WHEN "status"::text = 'AWAITING_INVOICE' THEN 'INVOICE_REQUIRED'
    ELSE "status"::text
  END
)::"PaymentInstallmentStatus_new";

ALTER TYPE "PaymentInstallmentStatus" RENAME TO "PaymentInstallmentStatus_old";
ALTER TYPE "PaymentInstallmentStatus_new" RENAME TO "PaymentInstallmentStatus";
DROP TYPE "PaymentInstallmentStatus_old";

ALTER TABLE "ProjectVendorPaymentInstallment"
ALTER COLUMN "status" SET DEFAULT 'PLANNED';

ALTER TABLE "ProjectVendor"
ADD COLUMN IF NOT EXISTS "paymentWorkflowOverrideStatus" "PaymentWorkflowOverrideStatus",
ADD COLUMN IF NOT EXISTS "paymentWorkflowOverrideReason" TEXT,
ADD COLUMN IF NOT EXISTS "paymentWorkflowOverrideAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paymentWorkflowOverrideByUserId" TEXT;

ALTER TABLE "ProjectVendorPaymentInstallment"
ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "invoiceAmount" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "taxInvoiceValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "invoiceStatus" "PaymentInvoiceStatus" NOT NULL DEFAULT 'MISSING',
ADD COLUMN IF NOT EXISTS "financeReviewNotes" TEXT,
ADD COLUMN IF NOT EXISTS "financeReviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "financeReviewedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "scheduledPaymentDate" TIMESTAMP(3);

UPDATE "ProjectVendorPaymentInstallment"
SET
  "invoiceDate" = COALESCE("invoiceDate", "invoiceReceivedDate"),
  "invoiceAmount" = COALESCE("invoiceAmount", "amount"),
  "invoiceStatus" = CASE
    WHEN "status" IN ('SCHEDULED', 'PAID', 'OVERDUE')
      THEN 'APPROVED_FOR_PAYMENT'::"PaymentInvoiceStatus"
    WHEN "status" = 'UNDER_REVIEW'
      THEN 'RECEIVED'::"PaymentInvoiceStatus"
    WHEN
      "invoiceNumber" IS NOT NULL
      OR "invoiceReceivedDate" IS NOT NULL
      OR "invoiceStoragePath" IS NOT NULL
      THEN 'RECEIVED'::"PaymentInvoiceStatus"
    ELSE 'MISSING'::"PaymentInvoiceStatus"
  END,
  "scheduledPaymentDate" = COALESCE(
    "scheduledPaymentDate",
    CASE
      WHEN "status" IN ('SCHEDULED', 'PAID', 'OVERDUE')
        THEN COALESCE("paymentDate", "dueDate")
      ELSE NULL
    END
  );

DO $$
BEGIN
  ALTER TABLE "ProjectVendor"
  ADD CONSTRAINT "ProjectVendor_paymentWorkflowOverrideByUserId_fkey"
  FOREIGN KEY ("paymentWorkflowOverrideByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ProjectVendorPaymentInstallment"
  ADD CONSTRAINT "ProjectVendorPaymentInstallment_financeReviewedByUserId_fkey"
  FOREIGN KEY ("financeReviewedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectVendor_paymentWorkflowOverrideStatus_idx"
ON "ProjectVendor"("paymentWorkflowOverrideStatus");

CREATE INDEX IF NOT EXISTS "ProjectVendor_paymentWorkflowOverrideByUserId_idx"
ON "ProjectVendor"("paymentWorkflowOverrideByUserId");

CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_invoiceStatus_idx"
ON "ProjectVendorPaymentInstallment"("invoiceStatus");

CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_scheduledPaymentDate_idx"
ON "ProjectVendorPaymentInstallment"("scheduledPaymentDate");
