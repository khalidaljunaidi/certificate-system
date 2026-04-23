-- CreateEnum
CREATE TYPE "OperationalTaskType" AS ENUM ('VENDOR', 'PROCUREMENT', 'FINANCE', 'OPERATIONS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OperationalTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "OperationalTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaskSlaStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'ACTION_REQUIRED', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationEventKey" AS ENUM ('CERT_CREATED', 'CERT_SUBMITTED_PM', 'CERT_PM_APPROVED', 'CERT_PM_REJECTED', 'CERT_ISSUED', 'CERT_REOPENED', 'CERT_REVOKED', 'TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_COMPLETED', 'VENDOR_CREATED', 'SYSTEM_ALERT', 'PERFORMANCE_REVIEW_FINALIZED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('NOT_REQUESTED', 'SKIPPED', 'SENT', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PerformanceGrade" AS ENUM ('A', 'B', 'C', 'D');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_ESCALATED';
ALTER TYPE "AuditAction" ADD VALUE 'PERFORMANCE_REVIEW_DRAFTED';
ALTER TYPE "AuditAction" ADD VALUE 'PERFORMANCE_REVIEW_FINALIZED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_DISPATCHED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'VENDOR_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ALERT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowEmailEvent" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "WorkflowEmailEvent" ADD VALUE 'TASK_DUE_SOON';
ALTER TYPE "WorkflowEmailEvent" ADD VALUE 'TASK_OVERDUE';
ALTER TYPE "WorkflowEmailEvent" ADD VALUE 'TASK_COMPLETED';
ALTER TYPE "WorkflowEmailEvent" ADD VALUE 'SYSTEM_ALERT';
ALTER TYPE "WorkflowEmailEvent" ADD VALUE 'PERFORMANCE_REVIEW_FINALIZED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actionedAt" TIMESTAMP(3),
ADD COLUMN     "dispatchLogId" TEXT,
ADD COLUMN     "eventKey" "NotificationEventKey",
ADD COLUMN     "href" TEXT,
ADD COLUMN     "relatedProjectVendorId" TEXT,
ADD COLUMN     "relatedTaskId" TEXT,
ADD COLUMN     "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO';

-- CreateTable
CREATE TABLE "OperationalTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "OperationalTaskType" NOT NULL,
    "assignedToUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "priority" "OperationalTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "OperationalTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "linkedProjectId" TEXT,
    "linkedVendorId" TEXT,
    "linkedProjectVendorId" TEXT,
    "linkedCertificateId" TEXT,
    "requiresChecklistCompletion" BOOLEAN NOT NULL DEFAULT true,
    "reopenedCount" INTEGER NOT NULL DEFAULT 0,
    "dueSoonNotifiedAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "lastStatusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDispatchLog" (
    "id" TEXT NOT NULL,
    "eventKey" "NotificationEventKey" NOT NULL,
    "type" "NotificationType",
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "dedupeKey" TEXT,
    "cooldownUntil" TIMESTAMP(3),
    "inAppCreatedCount" INTEGER NOT NULL DEFAULT 0,
    "emailSentCount" INTEGER NOT NULL DEFAULT 0,
    "emailDeliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "relatedProjectId" TEXT,
    "relatedVendorId" TEXT,
    "relatedProjectVendorId" TEXT,
    "relatedCertificateId" TEXT,
    "relatedTaskId" TEXT,
    "linkHref" TEXT,
    "recipientSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlyPerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeUserId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "roleSnapshot" "UserRole" NOT NULL,
    "systemMetrics" JSONB NOT NULL,
    "managerScorecard" JSONB NOT NULL,
    "managerComments" TEXT,
    "recommendation" TEXT,
    "systemScorePercent" DECIMAL(5,2) NOT NULL,
    "managerScorePercent" DECIMAL(5,2) NOT NULL,
    "finalScorePercent" DECIMAL(5,2) NOT NULL,
    "grade" "PerformanceGrade" NOT NULL,
    "executionCapability" DECIMAL(5,2),
    "accuracyIndex" DECIMAL(5,2),
    "ownershipIndex" DECIMAL(5,2),
    "followUpDiscipline" DECIMAL(5,2),
    "responseAgility" DECIMAL(5,2),
    "procurementEffectiveness" DECIMAL(5,2),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterlyPerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalTask_assignedToUserId_status_idx" ON "OperationalTask"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "OperationalTask_assignedByUserId_createdAt_idx" ON "OperationalTask"("assignedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalTask_dueDate_status_idx" ON "OperationalTask"("dueDate", "status");

-- CreateIndex
CREATE INDEX "OperationalTask_linkedProjectId_idx" ON "OperationalTask"("linkedProjectId");

-- CreateIndex
CREATE INDEX "OperationalTask_linkedVendorId_idx" ON "OperationalTask"("linkedVendorId");

-- CreateIndex
CREATE INDEX "OperationalTask_linkedProjectVendorId_idx" ON "OperationalTask"("linkedProjectVendorId");

-- CreateIndex
CREATE INDEX "OperationalTask_linkedCertificateId_idx" ON "OperationalTask"("linkedCertificateId");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_taskId_orderIndex_idx" ON "TaskChecklistItem"("taskId", "orderIndex");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_eventKey_createdAt_idx" ON "NotificationDispatchLog"("eventKey", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_dedupeKey_createdAt_idx" ON "NotificationDispatchLog"("dedupeKey", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_relatedProjectId_idx" ON "NotificationDispatchLog"("relatedProjectId");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_relatedVendorId_idx" ON "NotificationDispatchLog"("relatedVendorId");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_relatedProjectVendorId_idx" ON "NotificationDispatchLog"("relatedProjectVendorId");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_relatedCertificateId_idx" ON "NotificationDispatchLog"("relatedCertificateId");

-- CreateIndex
CREATE INDEX "NotificationDispatchLog_relatedTaskId_idx" ON "NotificationDispatchLog"("relatedTaskId");

-- CreateIndex
CREATE INDEX "QuarterlyPerformanceReview_status_year_quarter_idx" ON "QuarterlyPerformanceReview"("status", "year", "quarter");

-- CreateIndex
CREATE INDEX "QuarterlyPerformanceReview_evaluatorUserId_year_quarter_idx" ON "QuarterlyPerformanceReview"("evaluatorUserId", "year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyPerformanceReview_employeeUserId_year_quarter_key" ON "QuarterlyPerformanceReview"("employeeUserId", "year", "quarter");

-- CreateIndex
CREATE INDEX "Notification_relatedProjectVendorId_idx" ON "Notification"("relatedProjectVendorId");

-- CreateIndex
CREATE INDEX "Notification_relatedTaskId_idx" ON "Notification"("relatedTaskId");

-- CreateIndex
CREATE INDEX "Notification_eventKey_createdAt_idx" ON "Notification"("eventKey", "createdAt");

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_linkedVendorId_fkey" FOREIGN KEY ("linkedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_linkedProjectVendorId_fkey" FOREIGN KEY ("linkedProjectVendorId") REFERENCES "ProjectVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_linkedCertificateId_fkey" FOREIGN KEY ("linkedCertificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OperationalTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedProjectVendorId_fkey" FOREIGN KEY ("relatedProjectVendorId") REFERENCES "ProjectVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedTaskId_fkey" FOREIGN KEY ("relatedTaskId") REFERENCES "OperationalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dispatchLogId_fkey" FOREIGN KEY ("dispatchLogId") REFERENCES "NotificationDispatchLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatchLog" ADD CONSTRAINT "NotificationDispatchLog_relatedProjectId_fkey" FOREIGN KEY ("relatedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatchLog" ADD CONSTRAINT "NotificationDispatchLog_relatedVendorId_fkey" FOREIGN KEY ("relatedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatchLog" ADD CONSTRAINT "NotificationDispatchLog_relatedProjectVendorId_fkey" FOREIGN KEY ("relatedProjectVendorId") REFERENCES "ProjectVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatchLog" ADD CONSTRAINT "NotificationDispatchLog_relatedCertificateId_fkey" FOREIGN KEY ("relatedCertificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDispatchLog" ADD CONSTRAINT "NotificationDispatchLog_relatedTaskId_fkey" FOREIGN KEY ("relatedTaskId") REFERENCES "OperationalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyPerformanceReview" ADD CONSTRAINT "QuarterlyPerformanceReview_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyPerformanceReview" ADD CONSTRAINT "QuarterlyPerformanceReview_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
