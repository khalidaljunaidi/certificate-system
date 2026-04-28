import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";

import {
  buildVendorRegistrationVerificationUrl,
  formatDate,
} from "@/lib/utils";
import {
  VendorRegistrationCertificateDocument,
  type VendorRegistrationCertificateModel,
} from "@/pdf/vendor-registration-certificate";

export type VendorRegistrationCertificateSource = {
  certificateId: string;
  requestNumber: string;
  supplierId: string;
  companyName: string;
  legalName: string;
  crNumber: string;
  vatNumber: string;
  categoryName: string;
  approvedAt: Date;
};

export async function buildVendorRegistrationCertificateModel(
  input: VendorRegistrationCertificateSource,
): Promise<VendorRegistrationCertificateModel> {
  const verificationUrl = buildVendorRegistrationVerificationUrl(
    input.requestNumber,
  );
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 0,
    width: 260,
    color: {
      dark: "#311347",
      light: "#FFFFFF",
    },
  });

  return {
    certificateId: input.certificateId,
    requestNumber: input.requestNumber,
    supplierId: input.supplierId,
    companyName: input.companyName,
    legalName: input.legalName,
    crNumber: input.crNumber,
    vatNumber: input.vatNumber,
    categoryName: input.categoryName,
    approvedAt: formatDate(input.approvedAt),
    verificationUrl,
    qrDataUrl,
    note: "This certificate confirms vendor registration only and does not constitute a purchase order, contract, or guarantee of future business.",
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
