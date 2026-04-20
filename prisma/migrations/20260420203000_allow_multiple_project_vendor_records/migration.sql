DROP INDEX IF EXISTS "ProjectVendor_projectId_vendorId_key";

CREATE INDEX IF NOT EXISTS "ProjectVendor_projectId_vendorId_idx"
ON "ProjectVendor"("projectId", "vendorId");
