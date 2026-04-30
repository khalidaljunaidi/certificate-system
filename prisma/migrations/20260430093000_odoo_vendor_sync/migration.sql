-- Add Odoo vendor sync tracking without changing existing procurement data.
CREATE TYPE "OdooSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

ALTER TABLE "Vendor"
ADD COLUMN "odooSyncStatus" "OdooSyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "odooPartnerId" INTEGER,
ADD COLUMN "odooSyncError" TEXT,
ADD COLUMN "odooSyncedAt" TIMESTAMP(3);

ALTER TABLE "VendorRegistrationRequest"
ADD COLUMN "odooSyncStatus" "OdooSyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "odooPartnerId" INTEGER,
ADD COLUMN "odooSyncError" TEXT,
ADD COLUMN "odooSyncedAt" TIMESTAMP(3);

CREATE INDEX "Vendor_odooSyncStatus_idx" ON "Vendor"("odooSyncStatus");
CREATE INDEX "Vendor_odooPartnerId_idx" ON "Vendor"("odooPartnerId");
CREATE INDEX "VendorRegistrationRequest_odooSyncStatus_idx" ON "VendorRegistrationRequest"("odooSyncStatus");
CREATE INDEX "VendorRegistrationRequest_odooPartnerId_idx" ON "VendorRegistrationRequest"("odooPartnerId");
