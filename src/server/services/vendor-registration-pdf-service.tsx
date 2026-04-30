import { renderToBuffer } from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

import { formatDate } from "@/lib/utils";
import {
  formatCountryLabel,
  formatCoverageScope,
  formatVerificationUrl,
} from "@/lib/vendor-registration-certificate";
import {
  VendorRegistrationCertificateDocument,
  type VendorRegistrationCertificateModel,
} from "@/pdf/vendor-registration-certificate";

export type VendorRegistrationCertificateSource = {
  baseUrl?: string | null;
  certificateCode: string;
  requestNumber: string;
  supplierId: string;
  companyName: string;
  legalName: string;
  crNumber: string;
  vatNumber: string;
  categoryName: string;
  categoryCode?: string | null;
  subcategories: Array<{
    id: string;
    name: string;
    externalKey: string | null;
  }>;
  countryName: string;
  countryCode: string;
  selectedCities: Array<{
    name: string;
    region: string | null;
  }>;
  coverageScope: string;
  approvedAt: Date;
};

let cachedLogoDataUrl: string | null | undefined;

async function getLogoDataUrl() {
  if (cachedLogoDataUrl !== undefined) {
    return cachedLogoDataUrl;
  }

  try {
    const logoBuffer = await readFile(path.join(process.cwd(), "public", "logo.png"));
    cachedLogoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    cachedLogoDataUrl = null;
  }

  return cachedLogoDataUrl;
}

function formatCategoryLabel(name: string, code?: string | null) {
  const trimmedCode = code?.trim();

  return trimmedCode ? `${name} (${trimmedCode})` : name;
}

export async function buildVendorRegistrationCertificateModel(
  input: VendorRegistrationCertificateSource,
): Promise<VendorRegistrationCertificateModel> {
  const verificationUrl = formatVerificationUrl(input.requestNumber, input.baseUrl);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 0,
    width: 220,
    color: {
      dark: "#1B1033",
      light: "#FFFFFF",
    },
  });
  const logoDataUrl = await getLogoDataUrl();
  const countryLabel = formatCountryLabel(input.countryCode, input.countryName);
  const coverage = formatCoverageScope({
    coverageScope: input.coverageScope,
    countryCode: input.countryCode,
    countryName: input.countryName,
    selectedCities: input.selectedCities,
  });
  const subcategoryLabels = input.subcategories.map((subcategory) =>
    subcategory.externalKey
      ? `${subcategory.name} (${subcategory.externalKey})`
      : subcategory.name,
  );

  return {
    logoDataUrl,
    certificateCode: input.certificateCode,
    requestNumber: input.requestNumber,
    supplierId: input.supplierId,
    companyName: input.companyName,
    legalName: input.legalName,
    crNumber: input.crNumber,
    vatNumber: input.vatNumber,
    categoryName: formatCategoryLabel(input.categoryName, input.categoryCode),
    subcategories: subcategoryLabels.slice(0, 8),
    additionalSubcategoryCount: Math.max(0, subcategoryLabels.length - 8),
    countryLabel,
    issueDate: formatDate(input.approvedAt),
    verificationStatus: "APPROVED",
    verificationUrl,
    qrDataUrl,
    coverageTitle: coverage.title,
    coverageLocations: coverage.locations,
    additionalCoverageLocationCount: coverage.additionalLocationCount,
    note:
      "This certificate confirms supplier registration approval only and does not constitute a contract, purchase order, work order, financial obligation, or payment commitment.",
  };
}

export async function generateVendorRegistrationCertificatePdfBuffer(
  input: VendorRegistrationCertificateSource,
) {
  const model = await buildVendorRegistrationCertificateModel(input);

  return renderToBuffer(
    <VendorRegistrationCertificateDocument model={model} />,
  );
}
