CREATE INDEX IF NOT EXISTS "Project_createdAt_idx" ON "Project"("createdAt");
CREATE INDEX IF NOT EXISTS "Project_updatedAt_idx" ON "Project"("updatedAt");

CREATE INDEX IF NOT EXISTS "Vendor_status_vendorName_idx" ON "Vendor"("status", "vendorName");
CREATE INDEX IF NOT EXISTS "Vendor_vendorName_idx" ON "Vendor"("vendorName");
CREATE INDEX IF NOT EXISTS "Vendor_createdAt_idx" ON "Vendor"("createdAt");
CREATE INDEX IF NOT EXISTS "Vendor_updatedAt_idx" ON "Vendor"("updatedAt");

CREATE INDEX IF NOT EXISTS "ProjectVendor_projectId_createdAt_idx" ON "ProjectVendor"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_vendorId_createdAt_idx" ON "ProjectVendor"("vendorId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProjectVendor_isActive_idx" ON "ProjectVendor"("isActive");

CREATE INDEX IF NOT EXISTS "Certificate_projectId_updatedAt_idx" ON "Certificate"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Certificate_vendorId_updatedAt_idx" ON "Certificate"("vendorId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Certificate_projectVendorId_updatedAt_idx" ON "Certificate"("projectVendorId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Certificate_createdAt_idx" ON "Certificate"("createdAt");
CREATE INDEX IF NOT EXISTS "Certificate_updatedAt_idx" ON "Certificate"("updatedAt");

CREATE INDEX IF NOT EXISTS "VendorEvaluationCycle_vendorId_createdAt_idx" ON "VendorEvaluationCycle"("vendorId", "createdAt");
CREATE INDEX IF NOT EXISTS "VendorEvaluationCycle_status_createdAt_idx" ON "VendorEvaluationCycle"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "VendorEvaluationSubmission_cycleId_submittedAt_idx" ON "VendorEvaluationSubmission"("cycleId", "submittedAt");
CREATE INDEX IF NOT EXISTS "VendorEvaluationSubmission_submittedByUserId_submittedAt_idx" ON "VendorEvaluationSubmission"("submittedByUserId", "submittedAt");

CREATE INDEX IF NOT EXISTS "WorkflowEmailGroupMember_groupId_isActive_idx" ON "WorkflowEmailGroupMember"("groupId", "isActive");

CREATE INDEX IF NOT EXISTS "OperationalTask_assignedToUserId_createdAt_idx" ON "OperationalTask"("assignedToUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "OperationalTask_status_idx" ON "OperationalTask"("status");
CREATE INDEX IF NOT EXISTS "OperationalTask_monthlyCycleId_dueDate_idx" ON "OperationalTask"("monthlyCycleId", "dueDate");
CREATE INDEX IF NOT EXISTS "OperationalTask_monthlyCycleId_status_idx" ON "OperationalTask"("monthlyCycleId", "status");
CREATE INDEX IF NOT EXISTS "OperationalTask_createdAt_idx" ON "OperationalTask"("createdAt");
CREATE INDEX IF NOT EXISTS "OperationalTask_updatedAt_idx" ON "OperationalTask"("updatedAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
