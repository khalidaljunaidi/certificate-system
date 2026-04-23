-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkflowEmailEvent" AS ENUM (
    'PM_APPROVAL_REQUEST',
    'PM_DECISION_NOTIFICATION',
    'VENDOR_EVALUATION_REQUEST',
    'FINAL_CERTIFICATE_ISSUED',
    'CERTIFICATE_REOPENED',
    'ANNUAL_EVALUATION_REMINDER'
);

-- AlterTable
ALTER TABLE "Vendor"
ADD COLUMN "vendorPhone" TEXT,
ADD COLUMN "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "classification" TEXT,
ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "VendorEvaluationCycle"
ADD COLUMN "finalScorePercent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "VendorEvaluationSubmission"
ADD COLUMN "totalScorePercent" DECIMAL(5,2),
ADD COLUMN "criteriaSnapshot" JSONB,
ADD COLUMN "recommendation" TEXT,
ADD COLUMN "correctiveActions" TEXT;

-- CreateTable
CREATE TABLE "WorkflowEmailSetting" (
    "id" TEXT NOT NULL,
    "event" "WorkflowEmailEvent" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "includeDefaultTo" BOOLEAN NOT NULL DEFAULT true,
    "includeDefaultCc" BOOLEAN NOT NULL DEFAULT true,
    "toEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowEmailSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowEmailSetting_event_key" ON "WorkflowEmailSetting"("event");

-- CreateIndex
CREATE INDEX "WorkflowEmailSetting_updatedByUserId_idx" ON "WorkflowEmailSetting"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "WorkflowEmailSetting"
ADD CONSTRAINT "WorkflowEmailSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
