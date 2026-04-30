const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

process.env.NEXT_PUBLIC_APP_URL = "https://fallback.thegatheringksa.example";

const rawDatabaseId = "cmolrawdatabaseid000000000000";
const certificateCode = "TG-SUP-CERT-2026-000001";
const requestNumber = "VR-20260430-SMOKE";

function countPdfPages(buffer: Buffer) {
  const pdfText = buffer.toString("latin1");

  return (pdfText.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const {
    formatVerificationUrl,
    resolveBaseUrlFromRequestHeaders,
  } = await import("../src/lib/vendor-registration-certificate");
  const {
    buildVendorRegistrationCertificateModel,
    generateVendorRegistrationCertificatePdfBuffer,
  } = await import("../src/server/services/vendor-registration-pdf-service");

  const localhostBaseUrl = resolveBaseUrlFromRequestHeaders(
    new Headers({
      host: "localhost:3000",
    }),
  );
  const productionBaseUrl = resolveBaseUrlFromRequestHeaders(
    new Headers({
      host: "procurement.thegatheringksa.com",
      "x-forwarded-proto": "https",
    }),
  );
  const fallbackBaseUrl = resolveBaseUrlFromRequestHeaders(new Headers());

  assert(localhostBaseUrl === "http://localhost:3000", "Expected localhost request base URL.");
  assert(
    productionBaseUrl === "https://procurement.thegatheringksa.com",
    "Expected production request base URL.",
  );
  assert(
    fallbackBaseUrl === "https://fallback.thegatheringksa.example",
    "Expected NEXT_PUBLIC_APP_URL fallback base URL.",
  );
  assert(
    formatVerificationUrl(requestNumber, localhostBaseUrl) ===
      `http://localhost:3000/verify/vendor-registration/${requestNumber}`,
    "Expected localhost verification URL.",
  );
  assert(
    formatVerificationUrl(requestNumber, productionBaseUrl) ===
      `https://procurement.thegatheringksa.com/verify/vendor-registration/${requestNumber}`,
    "Expected production verification URL.",
  );
  assert(
    formatVerificationUrl(requestNumber) ===
      `https://fallback.thegatheringksa.example/verify/vendor-registration/${requestNumber}`,
    "Expected fallback verification URL.",
  );

  const maxSubcategories = Array.from({ length: 16 }, (_, index) => ({
    id: `sub-${index + 1}`,
    name: `Approved Procurement Capability ${index + 1}`,
    externalKey: `EV-${String(index + 1).padStart(3, "0")}`,
  }));

  const source = {
    baseUrl: productionBaseUrl,
    certificateCode,
    requestNumber,
    supplierId: "SA-EV-BLD-000001",
    companyName: "Executive Supplier Smoke Test Company",
    legalName: "Executive Supplier Smoke Test Company LLC",
    crNumber: "1010000001",
    vatNumber: "300000000000003",
    categoryName: "Build & Infrastructure",
    categoryCode: "EV-BLD",
    subcategories: maxSubcategories,
    countryName: "All Country",
    countryCode: "SA",
    selectedCities: [
      { name: "Riyadh", region: "Riyadh Region" },
      { name: "Jeddah", region: "Makkah Region" },
      { name: "Dammam", region: "Eastern Province" },
    ],
    coverageScope: "ALL_COUNTRY",
    approvedAt: new Date("2026-04-30T10:00:00.000Z"),
  };

  const model = await buildVendorRegistrationCertificateModel(source);
  const buffer = await generateVendorRegistrationCertificatePdfBuffer(source);
  const searchableContent = `${buffer.toString("latin1")}\n${JSON.stringify(model)}`;

  assert(countPdfPages(buffer) === 1, "Expected certificate PDF to have exactly one page.");
  assert(
    searchableContent.includes(certificateCode),
    "Expected formatted certificate code to be present.",
  );
  assert(
    !searchableContent.includes(rawDatabaseId),
    "PDF/model content must not include raw database IDs.",
  );
  assert(
    !searchableContent.includes("All Country"),
    "PDF/model content must not include the phrase All Country.",
  );
  assert(
    !searchableContent.includes("localhost"),
    "PDF/model content must not include localhost when NEXT_PUBLIC_APP_URL is configured.",
  );
  assert(
    model.verificationUrl ===
      `https://procurement.thegatheringksa.com/verify/vendor-registration/${requestNumber}`,
    "PDF model verification URL must use the request-derived production URL.",
  );

  console.log(
    `Vendor registration certificate smoke passed: ${buffer.length} bytes, 1 page, dynamic URLs verified.`,
  );
}

main()
  .finally(() => {
    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }

  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
