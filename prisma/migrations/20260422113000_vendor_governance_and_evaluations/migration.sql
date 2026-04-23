-- CreateEnum
CREATE TYPE "VendorEvaluationGrade" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "VendorEvaluationCycleStatus" AS ENUM ('REQUESTED', 'READY_FOR_PROCUREMENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VendorEvaluationEvaluatorRole" AS ENUM ('PROJECT_MANAGER', 'HEAD_OF_PROJECTS', 'PROCUREMENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VENDOR_EVALUATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VENDOR_EVALUATION_READY_FOR_PROCUREMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VENDOR_EVALUATION_COMPLETED';

-- AlterTable
ALTER TABLE "Vendor"
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "subcategoryId" TEXT;

-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "relatedVendorId" TEXT;

-- CreateTable
CREATE TABLE "VendorCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorEvaluationCycle" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "sourceProjectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "VendorEvaluationCycleStatus" NOT NULL DEFAULT 'REQUESTED',
    "projectManagerEmail" TEXT NOT NULL,
    "headOfProjectsEmail" TEXT NOT NULL,
    "finalGrade" "VendorEvaluationGrade",
    "createdByUserId" TEXT NOT NULL,
    "procurementFinalizedByUserId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorEvaluationCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorEvaluationSubmission" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "evaluatorRole" "VendorEvaluationEvaluatorRole" NOT NULL,
    "grade" "VendorEvaluationGrade" NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "concerns" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "evaluatorName" TEXT NOT NULL,
    "evaluatorEmail" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorEvaluationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorEvaluationRequestToken" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "evaluatorRole" "VendorEvaluationEvaluatorRole" NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorEvaluationRequestToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorCategory_name_key" ON "VendorCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VendorCategory_externalKey_key" ON "VendorCategory"("externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSubcategory_externalKey_key" ON "VendorSubcategory"("externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSubcategory_categoryId_name_key" ON "VendorSubcategory"("categoryId", "name");

-- CreateIndex
CREATE INDEX "VendorSubcategory_categoryId_idx" ON "VendorSubcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Vendor_categoryId_idx" ON "Vendor"("categoryId");

-- CreateIndex
CREATE INDEX "Vendor_subcategoryId_idx" ON "Vendor"("subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorEvaluationCycle_vendorId_year_key" ON "VendorEvaluationCycle"("vendorId", "year");

-- CreateIndex
CREATE INDEX "VendorEvaluationCycle_status_idx" ON "VendorEvaluationCycle"("status");

-- CreateIndex
CREATE INDEX "VendorEvaluationCycle_sourceProjectId_idx" ON "VendorEvaluationCycle"("sourceProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorEvaluationSubmission_cycleId_evaluatorRole_key" ON "VendorEvaluationSubmission"("cycleId", "evaluatorRole");

-- CreateIndex
CREATE INDEX "VendorEvaluationSubmission_submittedByUserId_idx" ON "VendorEvaluationSubmission"("submittedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorEvaluationRequestToken_tokenHash_key" ON "VendorEvaluationRequestToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VendorEvaluationRequestToken_cycleId_evaluatorRole_idx" ON "VendorEvaluationRequestToken"("cycleId", "evaluatorRole");

-- CreateIndex
CREATE INDEX "VendorEvaluationRequestToken_cycleId_expiresAt_idx" ON "VendorEvaluationRequestToken"("cycleId", "expiresAt");

-- CreateIndex
CREATE INDEX "Notification_relatedVendorId_idx" ON "Notification"("relatedVendorId");

-- AddForeignKey
ALTER TABLE "Vendor"
ADD CONSTRAINT "Vendor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VendorCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor"
ADD CONSTRAINT "Vendor_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "VendorSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSubcategory"
ADD CONSTRAINT "VendorSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VendorCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationCycle"
ADD CONSTRAINT "VendorEvaluationCycle_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationCycle"
ADD CONSTRAINT "VendorEvaluationCycle_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationCycle"
ADD CONSTRAINT "VendorEvaluationCycle_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationCycle"
ADD CONSTRAINT "VendorEvaluationCycle_procurementFinalizedByUserId_fkey" FOREIGN KEY ("procurementFinalizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationSubmission"
ADD CONSTRAINT "VendorEvaluationSubmission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "VendorEvaluationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationSubmission"
ADD CONSTRAINT "VendorEvaluationSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvaluationRequestToken"
ADD CONSTRAINT "VendorEvaluationRequestToken_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "VendorEvaluationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_relatedVendorId_fkey" FOREIGN KEY ("relatedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
