import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import {
  buildVendorRegistrationCertificateModel,
  generateVendorRegistrationCertificatePdfBuffer,
} from "../src/server/services/vendor-registration-pdf-service";

const requestNumber = process.argv[2] ?? "VR-20260430-0A0FA2";
const baseUrl =
  process.argv[3] ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const outputDir = path.join(process.cwd(), "artifacts", "qa");

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };

    return replacements[character] ?? character;
  });
}

function countPdfPages(buffer: Buffer) {
  return (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
}

async function main() {
  const request = await prisma.vendorRegistrationRequest.findUniqueOrThrow({
    where: {
      requestNumber,
    },
    include: {
      country: true,
      primaryCategory: true,
      selectedSubcategories: {
        include: {
          subcategory: true,
        },
        orderBy: {
          subcategory: {
            name: "asc",
          },
        },
      },
      selectedCities: {
        include: {
          city: true,
        },
        orderBy: {
          city: {
            name: "asc",
          },
        },
      },
    },
  });

  const source = {
    baseUrl,
    certificateCode: request.certificateCode ?? "TG-SUP-CERT-2026-000001",
    requestNumber: request.requestNumber,
    supplierId: request.supplierId ?? "-",
    companyName: request.companyName,
    legalName: request.legalName,
    crNumber: request.crNumber,
    vatNumber: request.vatNumber,
    categoryName: request.primaryCategory.name,
    categoryCode: request.primaryCategory.externalKey,
    subcategories: request.selectedSubcategories.map((entry) => ({
      id: entry.subcategory.id,
      name: entry.subcategory.name,
      externalKey: entry.subcategory.externalKey,
    })),
    countryName: request.country.name,
    countryCode: request.countryCode,
    selectedCities: request.selectedCities.map((entry) => ({
      name: entry.city.name,
      region: entry.city.region,
    })),
    coverageScope: request.coverageScope,
    approvedAt: request.reviewedAt ?? request.submittedAt,
  };

  const [model, pdfBuffer] = await Promise.all([
    buildVendorRegistrationCertificateModel(source),
    generateVendorRegistrationCertificatePdfBuffer(source),
  ]);
  const pdfText = pdfBuffer.toString("latin1");
  const pdfPath = path.join(outputDir, "vendor-registration-certificate-sample.pdf");
  const previewPath = path.join(
    outputDir,
    "vendor-registration-certificate-sample-preview.html",
  );

  await mkdir(outputDir, { recursive: true });
  await writeFile(pdfPath, pdfBuffer);

  const chips = [
    ...model.subcategories.map(
      (subcategory) => `<span class="chip">${escapeHtml(subcategory)}</span>`,
    ),
    model.additionalSubcategoryCount > 0
      ? `<span class="chip more">+${model.additionalSubcategoryCount} additional approved subcategories</span>`
      : "",
  ].join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; hyphens: none; overflow-wrap: normal; word-break: normal; }
    body { margin: 0; background: #f7f4fa; font-family: Arial, Helvetica, sans-serif; color: #22161f; }
    .page { width: 1123px; height: 794px; margin: 0 auto; padding: 19px; background: #f7f4fa; }
    .outer { height: 100%; padding: 7px; border: 2px solid #c8a45c; background: #fff; }
    .inner { position: relative; height: 100%; overflow: hidden; border: 1px solid #d8c9e7; background: #fff; }
    .watermark { position: absolute; left: 430px; top: 246px; width: 300px; opacity: .03; }
    .header { height: 104px; display: grid; grid-template-columns: 235px 1fr 126px; align-items: center; padding: 0 28px; background: #1b1033; color: #fff; border-bottom: 4px solid #c8a45c; }
    .brand { display: flex; align-items: center; gap: 13px; min-width: 0; }
    .logo { width: 56px; height: 56px; object-fit: contain; }
    .brandName { color: #e5c98a; font-size: 12px; letter-spacing: .75px; font-weight: 800; white-space: nowrap; }
    .brandSub { margin-top: 5px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .titleWrap { text-align: center; min-width: 0; }
    .title { color: #fff; font-size: 18px; letter-spacing: .7px; font-weight: 800; white-space: nowrap; }
    .subtitle { margin-top: 8px; color: #e5c98a; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .verify { display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .qr { width: 54px; height: 54px; background: #fff; }
    .qrText { color: #fff; font-size: 9px; font-weight: 800; text-align: center; line-height: 1.1; }
    .qrSub { color: #e5c98a; font-size: 8px; text-align: center; }
    .body { padding: 21px 32px 54px; }
    .supplier { padding: 13px 36px 16px; text-align: center; border-bottom: 1px solid #e8dfec; }
    .certifies { color: #c8a45c; font-size: 11px; letter-spacing: .75px; text-transform: uppercase; font-weight: 800; }
    .supplierName { margin-top: 7px; color: #1b1033; font-size: 34px; line-height: 1; font-weight: 800; white-space: nowrap; }
    .legal { margin-top: 6px; color: #62566a; font-size: 12px; white-space: nowrap; }
    .details { display: grid; grid-template-columns: 320px 1fr; margin-top: 15px; border: 1px solid #ded6e5; background: #fcfbfd; }
    .detailsLeft { padding: 13px 16px; border-right: 1px solid #ded6e5; }
    .detailsRight { padding: 13px 16px; }
    .blockTitle { margin: 0 0 10px; color: #1b1033; font-size: 14px; font-weight: 800; }
    .identityGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 18px; }
    .field { margin-bottom: 8px; }
    .label { color: #62566a; font-size: 9px; letter-spacing: .55px; text-transform: uppercase; font-weight: 800; white-space: nowrap; }
    .value { margin-top: 4px; font-size: 12px; line-height: 1.15; font-weight: 800; white-space: nowrap; }
    .status { color: #1e6a3c; }
    .classification { display: grid; grid-template-columns: 320px 1fr; margin-top: 12px; border: 1px solid #e0d8e7; background: #fff; }
    .category { padding: 12px 16px; border-right: 1px solid #e0d8e7; }
    .subcats { padding: 12px 16px; }
    .categoryValue { margin-top: 6px; color: #1b1033; font-size: 14px; font-weight: 800; white-space: nowrap; }
    .chips { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 9px; margin-top: 7px; }
    .chip { display: block; padding: 5px 8px; border: 1px solid #ddcfb5; background: #fff9eb; color: #1b1033; font-size: 9px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip.more { background: #f3ecfa; border-color: #d9cae9; }
    .coverage { display: grid; grid-template-columns: 320px 1fr; margin-top: 12px; border: 1px solid #d8c796; background: #fffdf6; }
    .coverageLeft { padding: 12px 16px; border-right: 1px solid #e9ddbd; }
    .coverageRight { padding: 12px 16px; }
    .coverageValue { margin-top: 6px; color: #1b1033; font-size: 15px; font-weight: 800; white-space: nowrap; }
    .scopeValue { margin-top: 6px; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .legalBox { margin-top: 11px; padding: 8px 12px; border-top: 1px solid #e8e0ee; border-bottom: 1px solid #e8e0ee; color: #4b4252; font-size: 10.5px; text-align: center; white-space: nowrap; }
    .signature { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; margin-top: 18px; align-items: end; }
    .signatureUnit { text-align: center; }
    .sigLine { border-top: 1px solid #cfc5d8; padding-top: 7px; color: #1b1033; font-size: 11px; font-weight: 800; }
    .sigLine.gold { border-color: #c8a45c; color: #c8a45c; letter-spacing: .55px; }
    .footer { position: absolute; left: 32px; right: 32px; bottom: 17px; display: grid; grid-template-columns: 220px 1fr 170px; gap: 10px; align-items: center; padding-top: 8px; border-top: 1px solid #e3dce9; font-size: 9.5px; }
    .footerCode { color: #1b1033; font-weight: 800; white-space: nowrap; }
    .footerUrl { color: #62566a; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .footerBrand { color: #c8a45c; text-align: right; font-weight: 800; letter-spacing: .65px; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="page">
    <div class="outer">
      <div class="inner">
        ${model.logoDataUrl ? `<img class="watermark" src="${model.logoDataUrl}" />` : ""}
        <div class="header">
          <div class="brand">
            ${model.logoDataUrl ? `<img class="logo" src="${model.logoDataUrl}" />` : ""}
            <div>
              <div class="brandName">THE GATHERING KSA</div>
              <div class="brandSub">Procurement Operations</div>
            </div>
          </div>
          <div class="titleWrap">
            <div class="title">AUTHORIZED SUPPLIER REGISTRATION CERTIFICATE</div>
            <div class="subtitle">Authorized by THE GATHERING KSA</div>
          </div>
          <div class="verify">
            <img class="qr" src="${model.qrDataUrl}" />
            <div class="qrText">Scan to verify</div>
            <div class="qrSub">authenticity</div>
          </div>
        </div>
        <div class="body">
          <div class="supplier">
            <div class="certifies">This certifies that</div>
            <div class="supplierName">${escapeHtml(model.companyName)}</div>
            <div class="legal">${escapeHtml(model.legalName)}</div>
          </div>
          <div class="details">
            <div class="detailsLeft">
              <h2 class="blockTitle">Certificate Details</h2>
              <div class="field"><div class="label">Certificate Code</div><div class="value">${escapeHtml(model.certificateCode)}</div></div>
              <div class="field"><div class="label">Issue Date</div><div class="value">${escapeHtml(model.issueDate)}</div></div>
              <div class="field"><div class="label">Request Number</div><div class="value">${escapeHtml(model.requestNumber)}</div></div>
              <div class="field"><div class="label">Supplier ID</div><div class="value">${escapeHtml(model.supplierId)}</div></div>
            </div>
            <div class="detailsRight">
              <h2 class="blockTitle">Supplier Identity</h2>
              <div class="identityGrid">
                <div class="field"><div class="label">Commercial Registration</div><div class="value">${escapeHtml(model.crNumber)}</div></div>
                <div class="field"><div class="label">VAT Number</div><div class="value">${escapeHtml(model.vatNumber)}</div></div>
                <div class="field"><div class="label">Country</div><div class="value">${escapeHtml(model.countryLabel)}</div></div>
                <div class="field"><div class="label">Verification Status</div><div class="value status">${escapeHtml(model.verificationStatus)}</div></div>
              </div>
            </div>
          </div>
          <div class="classification">
            <div class="category">
              <div class="label">Vendor Classification</div>
              <div class="categoryValue">${escapeHtml(model.categoryName)}</div>
            </div>
            <div class="subcats">
              <div class="label">Approved Subcategories</div>
              <div class="chips">${chips}</div>
            </div>
          </div>
          <div class="coverage">
            <div class="coverageLeft">
              <div class="label">Coverage</div>
              <div class="coverageValue">${escapeHtml(model.coverageTitle)}</div>
            </div>
            <div class="coverageRight">
              <div class="label">Scope</div>
              <div class="scopeValue">${escapeHtml(model.coverageLocations.join(", "))}${model.additionalCoverageLocationCount > 0 ? `, +${model.additionalCoverageLocationCount} additional locations` : ""}</div>
            </div>
          </div>
          <div class="legalBox">${escapeHtml(model.note)}</div>
          <div class="signature">
            <div class="signatureUnit"><div class="sigLine">Procurement Department</div></div>
            <div class="signatureUnit"><div class="sigLine">Authorized Approval</div></div>
            <div class="signatureUnit"><div class="sigLine gold">THE GATHERING KSA</div></div>
          </div>
        </div>
        <div class="footer">
          <div class="footerCode">${escapeHtml(model.certificateCode)}</div>
          <div class="footerUrl">${escapeHtml(model.verificationUrl)}</div>
          <div class="footerBrand">THE GATHERING KSA</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  await writeFile(previewPath, html);

  console.log(
    JSON.stringify(
      {
        pdfPath,
        previewPath,
        pdfBytes: pdfBuffer.length,
        pdfPageCount: countPdfPages(pdfBuffer),
        certificateCode: model.certificateCode,
        verificationUrl: model.verificationUrl,
        forbiddenChecks: {
          allCountry: pdfText.includes("All Country") || html.includes("All Country"),
          localhost: pdfText.includes("localhost") || html.includes("localhost"),
          rawRequestId: pdfText.includes(request.id) || html.includes(request.id),
          cmol: pdfText.includes("cmol") || html.includes("cmol"),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
