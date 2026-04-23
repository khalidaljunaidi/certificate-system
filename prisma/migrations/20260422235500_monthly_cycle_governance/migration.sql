-- CreateEnum
CREATE TYPE "MonthlyCycleStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "OperationalTask"
ADD COLUMN "monthlyCycleId" TEXT;

-- CreateTable
CREATE TABLE "MonthlyCycle" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "MonthlyCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPerformanceReview" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeUserId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "systemMetrics" JSONB NOT NULL,
    "managerNotes" TEXT,
    "recommendation" TEXT,
    "systemScorePercent" DECIMAL(5,2) NOT NULL,
    "managerScorePercent" DECIMAL(5,2) NOT NULL,
    "finalScorePercent" DECIMAL(5,2) NOT NULL,
    "grade" "PerformanceGrade" NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCycle_month_year_key" ON "MonthlyCycle"("month", "year");

-- CreateIndex
CREATE INDEX "MonthlyCycle_status_isActive_idx" ON "MonthlyCycle"("status", "isActive");

-- CreateIndex
CREATE INDEX "MonthlyCycle_year_month_idx" ON "MonthlyCycle"("year", "month");

-- CreateIndex
CREATE INDEX "OperationalTask_monthlyCycleId_idx" ON "OperationalTask"("monthlyCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPerformanceReview_cycleId_employeeUserId_key" ON "MonthlyPerformanceReview"("cycleId", "employeeUserId");

-- CreateIndex
CREATE INDEX "MonthlyPerformanceReview_cycleId_status_idx" ON "MonthlyPerformanceReview"("cycleId", "status");

-- CreateIndex
CREATE INDEX "MonthlyPerformanceReview_evaluatorUserId_createdAt_idx" ON "MonthlyPerformanceReview"("evaluatorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "OperationalTask"
ADD CONSTRAINT "OperationalTask_monthlyCycleId_fkey"
FOREIGN KEY ("monthlyCycleId") REFERENCES "MonthlyCycle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCycle"
ADD CONSTRAINT "MonthlyCycle_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceReview"
ADD CONSTRAINT "MonthlyPerformanceReview_cycleId_fkey"
FOREIGN KEY ("cycleId") REFERENCES "MonthlyCycle"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceReview"
ADD CONSTRAINT "MonthlyPerformanceReview_employeeUserId_fkey"
FOREIGN KEY ("employeeUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceReview"
ADD CONSTRAINT "MonthlyPerformanceReview_evaluatorUserId_fkey"
FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
