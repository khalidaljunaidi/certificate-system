-- Backfill full vendor master subcategory selections from approved supplier
-- registration requests that already captured multiple subcategories.
INSERT INTO "VendorSubcategorySelection" ("vendorId", "subcategoryId")
SELECT request."approvedVendorId", selection."subcategoryId"
FROM "VendorRegistrationRequestSubcategory" selection
JOIN "VendorRegistrationRequest" request
  ON request."id" = selection."requestId"
WHERE request."approvedVendorId" IS NOT NULL
ON CONFLICT DO NOTHING;
