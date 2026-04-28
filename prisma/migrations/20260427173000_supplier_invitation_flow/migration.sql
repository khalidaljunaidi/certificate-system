-- CreateTable
CREATE TABLE "SupplierInvitation" (
    "id" TEXT NOT NULL,
    "supplierCompanyName" TEXT,
    "supplierContactName" TEXT,
    "supplierContactEmail" TEXT NOT NULL,
    "suggestedCategoryId" TEXT,
    "internalNote" TEXT,
    "customMessage" TEXT,
    "registrationUrl" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "emailDeliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "emailDeliveryError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierInvitation_supplierContactEmail_idx" ON "SupplierInvitation"("supplierContactEmail");

-- CreateIndex
CREATE INDEX "SupplierInvitation_suggestedCategoryId_idx" ON "SupplierInvitation"("suggestedCategoryId");

-- CreateIndex
CREATE INDEX "SupplierInvitation_invitedByUserId_invitedAt_idx" ON "SupplierInvitation"("invitedByUserId", "invitedAt");

-- CreateIndex
CREATE INDEX "SupplierInvitation_emailDeliveryStatus_invitedAt_idx" ON "SupplierInvitation"("emailDeliveryStatus", "invitedAt");

-- AddForeignKey
ALTER TABLE "SupplierInvitation" ADD CONSTRAINT "SupplierInvitation_suggestedCategoryId_fkey" FOREIGN KEY ("suggestedCategoryId") REFERENCES "VendorCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvitation" ADD CONSTRAINT "SupplierInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
