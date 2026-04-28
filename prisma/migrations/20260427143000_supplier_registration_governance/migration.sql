-- CreateEnum
CREATE TYPE "VendorRegistrationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VendorRegistrationAttachmentType" AS ENUM ('CR', 'VAT', 'COMPANY_PROFILE', 'FINANCIALS', 'BANK_CERTIFICATE', 'SIGNATURE', 'STAMP');

-- CreateEnum
CREATE TYPE "VendorRegistrationCityScope" AS ENUM ('SPECIFIC_CITIES', 'ALL_COUNTRY', 'GCC', 'MENA', 'EU', 'GLOBAL');

-- CreateEnum
CREATE TYPE "PaymentInstallmentStatus" AS ENUM ('PLANNED', 'AWAITING_INVOICE', 'UNDER_REVIEW', 'SCHEDULED', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "SystemErrorSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Country" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionGroup" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierIdSequence" (
    "countryCode" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "nextSerial" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierIdSequence_pkey" PRIMARY KEY ("countryCode","categoryCode")
);

-- CreateTable
CREATE TABLE "VendorRegistrationRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "companyPhone" TEXT NOT NULL,
    "website" TEXT,
    "crNumber" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "primarySubcategoryId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "coverageScope" "VendorRegistrationCityScope" NOT NULL DEFAULT 'SPECIFIC_CITIES',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "district" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT NOT NULL,
    "poBox" TEXT,
    "businessDescription" TEXT NOT NULL,
    "yearsInBusiness" INTEGER NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "productsServicesSummary" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swiftCode" TEXT NOT NULL,
    "bankAccountNumber" TEXT,
    "additionalInformation" TEXT NOT NULL,
    "declarationName" TEXT NOT NULL,
    "declarationTitle" TEXT NOT NULL,
    "declarationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "declarationSignedAt" TIMESTAMP(3),
    "formSnapshot" JSONB NOT NULL,
    "status" "VendorRegistrationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "supplierId" TEXT,
    "approvedVendorId" TEXT,
    "certificatePdfStoragePath" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRegistrationRequestSubcategory" (
    "requestId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorRegistrationRequestSubcategory_pkey" PRIMARY KEY ("requestId","subcategoryId")
);

-- CreateTable
CREATE TABLE "VendorRegistrationRequestCity" (
    "requestId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorRegistrationRequestCity_pkey" PRIMARY KEY ("requestId","cityId")
);

-- CreateTable
CREATE TABLE "VendorRegistrationReference" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRegistrationReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRegistrationAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "VendorRegistrationAttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRegistrationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectVendorPaymentInstallment" (
    "id" TEXT NOT NULL,
    "projectVendorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "condition" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceStoragePath" TEXT,
    "paymentDate" TIMESTAMP(3),
    "status" "PaymentInstallmentStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectVendorPaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemErrorLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "errorName" TEXT,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "severity" "SystemErrorSeverity" NOT NULL DEFAULT 'ERROR',
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE INDEX "Country_regionGroup_idx" ON "Country"("regionGroup");

-- CreateIndex
CREATE INDEX "Country_isActive_idx" ON "Country"("isActive");

-- CreateIndex
CREATE INDEX "City_countryCode_idx" ON "City"("countryCode");

-- CreateIndex
CREATE INDEX "City_countryCode_region_idx" ON "City"("countryCode", "region");

-- CreateIndex
CREATE INDEX "City_isActive_idx" ON "City"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "City_countryCode_name_key" ON "City"("countryCode", "name");

-- CreateIndex
CREATE INDEX "SupplierIdSequence_categoryCode_idx" ON "SupplierIdSequence"("categoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRegistrationRequest_requestNumber_key" ON "VendorRegistrationRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRegistrationRequest_supplierId_key" ON "VendorRegistrationRequest"("supplierId");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_status_submittedAt_idx" ON "VendorRegistrationRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_companyEmail_idx" ON "VendorRegistrationRequest"("companyEmail");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_crNumber_idx" ON "VendorRegistrationRequest"("crNumber");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_vatNumber_idx" ON "VendorRegistrationRequest"("vatNumber");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_countryCode_idx" ON "VendorRegistrationRequest"("countryCode");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_categoryId_idx" ON "VendorRegistrationRequest"("categoryId");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequest_supplierId_idx" ON "VendorRegistrationRequest"("supplierId");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequestSubcategory_subcategoryId_idx" ON "VendorRegistrationRequestSubcategory"("subcategoryId");

-- CreateIndex
CREATE INDEX "VendorRegistrationRequestCity_cityId_idx" ON "VendorRegistrationRequestCity"("cityId");

-- CreateIndex
CREATE INDEX "VendorRegistrationReference_requestId_idx" ON "VendorRegistrationReference"("requestId");

-- CreateIndex
CREATE INDEX "VendorRegistrationReference_email_idx" ON "VendorRegistrationReference"("email");

-- CreateIndex
CREATE INDEX "VendorRegistrationAttachment_requestId_type_idx" ON "VendorRegistrationAttachment"("requestId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRegistrationAttachment_requestId_type_key" ON "VendorRegistrationAttachment"("requestId", "type");

-- CreateIndex
CREATE INDEX "ProjectVendorPaymentInstallment_projectVendorId_status_idx" ON "ProjectVendorPaymentInstallment"("projectVendorId", "status");

-- CreateIndex
CREATE INDEX "ProjectVendorPaymentInstallment_projectVendorId_dueDate_idx" ON "ProjectVendorPaymentInstallment"("projectVendorId", "dueDate");

-- CreateIndex
CREATE INDEX "ProjectVendorPaymentInstallment_status_dueDate_idx" ON "ProjectVendorPaymentInstallment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "ProjectVendorPaymentInstallment_createdAt_idx" ON "ProjectVendorPaymentInstallment"("createdAt");

-- CreateIndex
CREATE INDEX "SystemErrorLog_userId_createdAt_idx" ON "SystemErrorLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemErrorLog_severity_createdAt_idx" ON "SystemErrorLog"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "SystemErrorLog_createdAt_idx" ON "SystemErrorLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_supplierId_key" ON "Vendor"("supplierId");

-- CreateIndex
CREATE INDEX "Vendor_supplierId_idx" ON "Vendor"("supplierId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierIdSequence" ADD CONSTRAINT "SupplierIdSequence_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequest" ADD CONSTRAINT "VendorRegistrationRequest_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequest" ADD CONSTRAINT "VendorRegistrationRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VendorCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequest" ADD CONSTRAINT "VendorRegistrationRequest_primarySubcategoryId_fkey" FOREIGN KEY ("primarySubcategoryId") REFERENCES "VendorSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequest" ADD CONSTRAINT "VendorRegistrationRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequest" ADD CONSTRAINT "VendorRegistrationRequest_approvedVendorId_fkey" FOREIGN KEY ("approvedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequestSubcategory" ADD CONSTRAINT "VendorRegistrationRequestSubcategory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VendorRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequestSubcategory" ADD CONSTRAINT "VendorRegistrationRequestSubcategory_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "VendorSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequestCity" ADD CONSTRAINT "VendorRegistrationRequestCity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VendorRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationRequestCity" ADD CONSTRAINT "VendorRegistrationRequestCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationReference" ADD CONSTRAINT "VendorRegistrationReference_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VendorRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRegistrationAttachment" ADD CONSTRAINT "VendorRegistrationAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VendorRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVendorPaymentInstallment" ADD CONSTRAINT "ProjectVendorPaymentInstallment_projectVendorId_fkey" FOREIGN KEY ("projectVendorId") REFERENCES "ProjectVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVendorPaymentInstallment" ADD CONSTRAINT "ProjectVendorPaymentInstallment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemErrorLog" ADD CONSTRAINT "SystemErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
