import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";

import { buildVerifyUrl, compactText, formatDate, formatSarAmount } from "@/lib/utils";
import {
  CertificateDocument,
  type CertificatePdfModel,
} from "@/pdf/certificate-document";

type CertificateForPdf = {
  id: string;
  certificateCode: string;
  issueDate: Date;
  completionDate: Date;
  totalAmount: { toString(): string };
  executedScopeSummary: string;
  poNumber: string;
  contractNumber: string | null;
  issuedAt: Date | null;
  clientName: string;
  clientTitle: string;
  approverName: string;
  approverTitle: string;
  pmName: string | null;
  pmTitle: string | null;
  project: {
    projectName: string;
    projectCode: string;
    projectLocation: string;
  };
  vendor: {
    vendorName: string;
  };
};

export async function buildCertificatePdfModel(
  certificate: CertificateForPdf,
): Promise<CertificatePdfModel> {
  const verificationUrl = buildVerifyUrl(certificate.certificateCode);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 0,
    width: 260,
    color: {
      dark: "#311347",
      light: "#FFFFFF",
    },
  });

  const vendorFontSize =
    certificate.vendor.vendorName.length > 48
      ? 16
      : certificate.vendor.vendorName.length > 34
        ? 18
        : 21;

  const summary = compactText(certificate.executedScopeSummary, 420);
  const summaryFontSize =
    summary.length > 340 ? 8.5 : summary.length > 250 ? 9 : 9.8;

  return {
    certificateCode: certificate.certificateCode,
    projectName: certificate.project.projectName,
    projectCode: certificate.project.projectCode,
    projectLocation: certificate.project.projectLocation,
    vendorName: compactText(certificate.vendor.vendorName, 72),
    poNumber: certificate.poNumber,
    contractNumber: certificate.contractNumber,
    completionDate: formatDate(certificate.completionDate),
    issueDate: formatDate(certificate.issueDate),
    totalAmount: formatSarAmount(certificate.totalAmount.toString()),
    executedScopeSummary: summary,
    clientName: certificate.clientName,
    clientTitle: certificate.clientTitle,
    approverName: certificate.approverName,
    approverTitle: certificate.approverTitle,
    pmName: certificate.pmName ?? "Pending PM Approval",
    pmTitle: certificate.pmTitle ?? "Project Manager",
    issuedAt: formatDate(certificate.issuedAt ?? certificate.issueDate),
    verificationUrl,
    qrDataUrl,
    summaryFontSize,
    vendorFontSize,
  };
}

export async function generateCertificatePdfBuffer(
  certificate: CertificateForPdf,
) {
  const model = await buildCertificatePdfModel(certificate);
  return renderToBuffer(<CertificateDocument model={model} />);
}
