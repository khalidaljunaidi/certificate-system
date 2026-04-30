-- Additive indexes for hot admin filters, sorts, auth/session lookups, and payment/audit detail paths.

CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_updatedAt_idx" ON "User"("updatedAt");

CREATE INDEX IF NOT EXISTS "ProjectVendor_createdAt_idx" ON "ProjectVendor"("createdAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_updatedAt_idx" ON "ProjectVendor"("updatedAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_projectId_updatedAt_idx" ON "ProjectVendor"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_vendorId_updatedAt_idx" ON "ProjectVendor"("vendorId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_paymentFinanceOwnerUserId_updatedAt_idx" ON "ProjectVendor"("paymentFinanceOwnerUserId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_isActive_updatedAt_idx" ON "ProjectVendor"("isActive", "updatedAt");

CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_projectVendorId_updatedAt_idx" ON "ProjectVendorPaymentInstallment"("projectVendorId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_createdByUserId_idx" ON "ProjectVendorPaymentInstallment"("createdByUserId");
CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_financeReviewedByUserId_idx" ON "ProjectVendorPaymentInstallment"("financeReviewedByUserId");
CREATE INDEX IF NOT EXISTS "ProjectVendorPaymentInstallment_updatedAt_idx" ON "ProjectVendorPaymentInstallment"("updatedAt");

CREATE INDEX IF NOT EXISTS "VendorRegistrationRequest_submittedAt_idx" ON "VendorRegistrationRequest"("submittedAt");
CREATE INDEX IF NOT EXISTS "VendorRegistrationRequest_createdAt_idx" ON "VendorRegistrationRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "VendorRegistrationRequest_updatedAt_idx" ON "VendorRegistrationRequest"("updatedAt");
CREATE INDEX IF NOT EXISTS "VendorRegistrationRequest_reviewedByUserId_idx" ON "VendorRegistrationRequest"("reviewedByUserId");
CREATE INDEX IF NOT EXISTS "VendorRegistrationRequest_approvedVendorId_idx" ON "VendorRegistrationRequest"("approvedVendorId");

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expires_idx" ON "Session"("expires");
