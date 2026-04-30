-- Add persistent official supplier registration certificate codes.
ALTER TABLE "VendorRegistrationRequest"
  ADD COLUMN "certificateCode" TEXT,
  ADD COLUMN "certificateYear" INTEGER,
  ADD COLUMN "certificateSequence" INTEGER;

CREATE TABLE "VendorRegistrationCertificateSequence" (
  "year" INTEGER NOT NULL,
  "nextSerial" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VendorRegistrationCertificateSequence_pkey" PRIMARY KEY ("year")
);

WITH approved_requests AS (
  SELECT
    "id",
    EXTRACT(YEAR FROM COALESCE("reviewedAt", "submittedAt"))::INTEGER AS "certificateYear",
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM COALESCE("reviewedAt", "submittedAt"))::INTEGER
      ORDER BY COALESCE("reviewedAt", "submittedAt"), "id"
    ) AS "certificateSequence"
  FROM "VendorRegistrationRequest"
  WHERE "status" = 'APPROVED'
)
UPDATE "VendorRegistrationRequest" request
SET
  "certificateYear" = approved_requests."certificateYear",
  "certificateSequence" = approved_requests."certificateSequence",
  "certificateCode" = CONCAT(
    'TG-SUP-CERT-',
    approved_requests."certificateYear",
    '-',
    LPAD(approved_requests."certificateSequence"::TEXT, 6, '0')
  )
FROM approved_requests
WHERE request."id" = approved_requests."id"
  AND request."certificateCode" IS NULL;

INSERT INTO "VendorRegistrationCertificateSequence" ("year", "nextSerial")
SELECT
  "certificateYear",
  COALESCE(MAX("certificateSequence"), 0) + 1
FROM "VendorRegistrationRequest"
WHERE "certificateYear" IS NOT NULL
GROUP BY "certificateYear"
ON CONFLICT ("year") DO UPDATE
SET "nextSerial" = GREATEST(
  "VendorRegistrationCertificateSequence"."nextSerial",
  EXCLUDED."nextSerial"
);

CREATE UNIQUE INDEX "VendorRegistrationRequest_certificateCode_key"
  ON "VendorRegistrationRequest"("certificateCode");

CREATE INDEX "VendorRegistrationRequest_certificateYear_idx"
  ON "VendorRegistrationRequest"("certificateYear");
