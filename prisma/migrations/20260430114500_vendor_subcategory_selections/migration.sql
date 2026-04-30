-- Preserve all vendor master subcategory selections without removing the
-- existing primary subcategory field used by older workflows.
CREATE TABLE "VendorSubcategorySelection" (
  "vendorId" TEXT NOT NULL,
  "subcategoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VendorSubcategorySelection_pkey" PRIMARY KEY ("vendorId", "subcategoryId")
);

CREATE INDEX "VendorSubcategorySelection_subcategoryId_idx"
  ON "VendorSubcategorySelection"("subcategoryId");

INSERT INTO "VendorSubcategorySelection" ("vendorId", "subcategoryId")
SELECT "id", "subcategoryId"
FROM "Vendor"
WHERE "subcategoryId" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "VendorSubcategorySelection"
  ADD CONSTRAINT "VendorSubcategorySelection_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorSubcategorySelection"
  ADD CONSTRAINT "VendorSubcategorySelection_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "VendorSubcategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
