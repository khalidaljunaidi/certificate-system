-- Add execution result storage for task execution-only updates
ALTER TABLE "OperationalTask"
ADD COLUMN "executionResult" TEXT;
