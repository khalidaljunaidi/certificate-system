import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

type CertificatePdfModel = {
  certificateCode: string;
  projectName: string;
  projectCode: string;
  projectLocation: string;
  vendorName: string;
  poNumber: string;
  contractNumber?: string | null;
  completionDate: string;
  issueDate: string;
  totalAmount: string;
  executedScopeSummary: string;
  clientName: string;
  clientTitle: string;
  approverName: string;
  approverTitle: string;
  pmName: string;
  pmTitle: string;
  issuedAt: string;
  verificationUrl: string;
  qrDataUrl: string;
  summaryFontSize: number;
  vendorFontSize: number;
};

const LOGO_FILE_PATH = path.join(process.cwd(), "public", "logo.png");
const FONT_ROOT = path.join(process.cwd(), "node_modules", "@fontsource");

let fontsRegistered = false;
let logoDataUrl: string | null = null;

function getLogoDataUrl() {
  if (!logoDataUrl) {
    const logoBase64 = fs.readFileSync(LOGO_FILE_PATH).toString("base64");
    logoDataUrl = `data:image/png;base64,${logoBase64}`;
  }

  return logoDataUrl;
}

function registerFonts() {
  if (fontsRegistered) {
    return;
  }

  Font.registerHyphenationCallback((word) => [word]);

  Font.register({
    family: "PublicSans",
    fonts: [
      {
        src: path.join(
          FONT_ROOT,
          "public-sans",
          "files",
          "public-sans-latin-400-normal.woff",
        ),
        fontWeight: 400,
      },
      {
        src: path.join(
          FONT_ROOT,
          "public-sans",
          "files",
          "public-sans-latin-600-normal.woff",
        ),
        fontWeight: 600,
      },
      {
        src: path.join(
          FONT_ROOT,
          "public-sans",
          "files",
          "public-sans-latin-700-normal.woff",
        ),
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: "Amiri",
    fonts: [
      {
        src: path.join(
          FONT_ROOT,
          "amiri",
          "files",
          "amiri-arabic-400-normal.woff",
        ),
        fontWeight: 400,
      },
      {
        src: path.join(
          FONT_ROOT,
          "amiri",
          "files",
          "amiri-arabic-700-normal.woff",
        ),
        fontWeight: 700,
      },
    ],
  });

  fontsRegistered = true;
}

function containsArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function valueFont(value: string) {
  return containsArabic(value) ? "Amiri" : "PublicSans";
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function CertificateDocument({ model }: { model: CertificatePdfModel }) {
  registerFonts();
  const logoSrc = getLogoDataUrl();
  const vendorFontSize = Math.min(model.vendorFontSize + 3, 24);
  const scopeText = truncateText(model.executedScopeSummary, 360);

  return (
    <Document
      title={`${model.certificateCode} - Project Completion Certificate`}
      author="THE GATHERING KSA"
      subject="Project Completion Certificate"
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.outerFrame}>
          <View style={styles.innerFrame}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSrc} style={styles.watermark} />

            <View style={styles.header}>
              <View style={styles.headerBrand}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={logoSrc} style={styles.logo} />
                <View style={styles.brandTextBlock}>
                  <Text style={styles.brandName}>THE GATHERING KSA</Text>
                  <Text style={styles.brandSubline}>Procurement Operations</Text>
                </View>
              </View>

              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerTitle}>
                  PROJECT COMPLETION CERTIFICATE
                </Text>
                <Text style={styles.headerSubtitle}>
                  Official Vendor Completion Record
                </Text>
              </View>

              <View style={styles.headerCodeBlock}>
                <Text style={styles.headerCodeLabel}>Certificate Code</Text>
                <Text style={styles.headerCode}>{model.certificateCode}</Text>
              </View>
            </View>

            <View style={styles.body}>
              <View style={styles.mainCertificateStage}>
                <Text style={styles.certifiesText}>This certificate confirms</Text>
                <Text
                  style={[
                    styles.vendorName,
                    {
                      fontFamily: valueFont(model.vendorName),
                      fontSize: vendorFontSize,
                    },
                  ]}
                >
                  {model.vendorName}
                </Text>
                <Text style={styles.certificateStatement}>
                  successful completion of the contracted project scope under the
                  commercial references listed below.
                </Text>
              </View>

              <View style={styles.detailsAndVerificationRow}>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailColumn}>
                    <Text style={styles.blockTitle}>Project Details</Text>
                    <CertificateField
                      label="Project Name"
                      value={model.projectName}
                      strong
                    />
                    <CertificateField
                      label="Project Reference"
                      value={`${model.projectCode} | ${model.projectLocation}`}
                      mono
                    />
                    <CertificateField
                      label="Completion Date"
                      value={model.completionDate}
                    />
                  </View>

                  <View style={styles.detailColumn}>
                    <Text style={styles.blockTitle}>Commercial Details</Text>
                    <CertificateField label="PO Number" value={model.poNumber} mono />
                    <CertificateField
                      label="Contract Number"
                      value={model.contractNumber || "Not recorded"}
                      mono
                    />
                    <CertificateField
                      label="Total Amount"
                      value={model.totalAmount}
                      amount
                    />
                  </View>
                </View>

                <VerificationBlock
                  qrDataUrl={model.qrDataUrl}
                />
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBlock}>
                  <Text style={styles.rowTitle}>Scope Summary</Text>
                  <Text
                    style={[
                      styles.summaryText,
                      {
                        fontFamily: valueFont(scopeText),
                        fontSize: Math.min(model.summaryFontSize + 0.8, 9.3),
                      },
                    ]}
                  >
                    {scopeText || "Completion scope summary not recorded."}
                  </Text>
                </View>

                <View style={styles.clientBlock}>
                  <Text style={styles.rowTitle}>Client Reference</Text>
                  <Text
                    style={[
                      styles.clientName,
                      { fontFamily: valueFont(model.clientName) },
                    ]}
                  >
                    {model.clientName}
                  </Text>
                  <Text style={styles.clientTitle}>{model.clientTitle}</Text>
                </View>
              </View>

              <View style={styles.approvalRow}>
                <ApprovalBlock
                  title="Project Manager Approval"
                  name={model.pmName}
                  role={model.pmTitle}
                />
                <ApprovalBlock
                  title="Procurement Approval"
                  name={model.approverName}
                  role={model.approverTitle}
                  accent
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerIssued}>Issued {model.issuedAt}</Text>
              <Text style={styles.footerUrl}>{model.verificationUrl}</Text>
              <Text style={styles.footerBrand}>THE GATHERING KSA</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function CertificateField({
  label,
  value,
  strong,
  mono,
  amount,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
  amount?: boolean;
}) {
  const displayValue = value || "-";

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text
        style={[
          styles.fieldValue,
          { fontFamily: valueFont(displayValue) },
          ...(strong ? [styles.strongValue] : []),
          ...(mono ? [styles.monoValue] : []),
          ...(amount ? [styles.amountValue] : []),
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function VerificationBlock({
  qrDataUrl,
}: {
  qrDataUrl: string;
}) {
  return (
    <View style={styles.verificationBlock}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={qrDataUrl} style={styles.qrImage} />
      <Text style={styles.verifyTitle}>Scan to verify</Text>
      <Text style={styles.verifySubtitle}>certificate authenticity</Text>
    </View>
  );
}

function ApprovalBlock({
  title,
  name,
  role,
  accent,
}: {
  title: string;
  name: string;
  role: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.approvalBlock}>
      <Text style={styles.approvalTitle}>{title}</Text>
      <View style={accent ? styles.signatureLineGold : styles.signatureLine} />
      <Text
        style={[
          styles.approvalName,
          { fontFamily: valueFont(name) },
          ...(accent ? [styles.approvalNameAccent] : []),
        ]}
      >
        {name}
      </Text>
      <Text style={styles.approvalRole}>{role}</Text>
    </View>
  );
}

const purple = "#1B1033";
const gold = "#C8A45C";
const softGold = "#E5C98A";
const ink = "#22161F";
const muted = "#62566A";
const border = "#DED6E5";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#F7F4FA",
    color: ink,
    fontFamily: "PublicSans",
    padding: 14,
  },
  outerFrame: {
    height: "100%",
    borderWidth: 1.2,
    borderColor: gold,
    padding: 5,
    backgroundColor: "#FFFFFF",
  },
  innerFrame: {
    position: "relative",
    height: "100%",
    borderWidth: 1,
    borderColor: "#D8C9E7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    width: 265,
    height: 265,
    left: 292,
    top: 176,
    opacity: 0.035,
    objectFit: "contain",
  },
  header: {
    height: 80,
    backgroundColor: purple,
    borderBottomWidth: 3,
    borderBottomColor: gold,
    color: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerBrand: {
    width: 180,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 46,
    height: 46,
    objectFit: "contain",
    marginRight: 10,
  },
  brandTextBlock: {
    width: 118,
  },
  brandName: {
    color: softGold,
    fontSize: 8.4,
    fontWeight: 700,
    letterSpacing: 0.65,
  },
  brandSubline: {
    marginTop: 4,
    color: "#F8F7FB",
    fontSize: 8.4,
    fontWeight: 600,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 0.55,
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 6,
    color: softGold,
    fontSize: 9.2,
    fontWeight: 700,
    textAlign: "center",
  },
  headerCodeBlock: {
    width: 156,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerCodeLabel: {
    color: "#DCD4E6",
    fontSize: 6.8,
    fontWeight: 700,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  headerCode: {
    marginTop: 5,
    color: softGold,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "right",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 42,
  },
  mainCertificateStage: {
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#E8DFEC",
  },
  certifiesText: {
    color: gold,
    fontSize: 7.8,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  vendorName: {
    marginTop: 6,
    color: purple,
    lineHeight: 1.05,
    fontWeight: 700,
    textAlign: "center",
  },
  certificateStatement: {
    marginTop: 7,
    color: "#4B4252",
    fontSize: 9.4,
    lineHeight: 1.25,
    textAlign: "center",
  },
  detailsAndVerificationRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "stretch",
  },
  detailsGrid: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: border,
    backgroundColor: "#FCFBFD",
  },
  detailColumn: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: border,
  },
  blockTitle: {
    color: purple,
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 7,
  },
  field: {
    marginBottom: 6.5,
  },
  fieldLabel: {
    color: muted,
    fontSize: 6.6,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  fieldValue: {
    marginTop: 3,
    color: ink,
    fontSize: 9.1,
    lineHeight: 1.18,
    fontWeight: 700,
  },
  strongValue: {
    color: purple,
    fontSize: 9.7,
  },
  monoValue: {
    fontSize: 8.5,
  },
  amountValue: {
    color: purple,
    fontSize: 11.5,
  },
  verificationBlock: {
    width: 126,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#D8C796",
    backgroundColor: "#FFFDF6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  qrImage: {
    width: 58,
    height: 58,
    backgroundColor: "#FFFFFF",
  },
  verifyTitle: {
    marginTop: 6,
    color: purple,
    fontSize: 8.5,
    fontWeight: 700,
    textAlign: "center",
  },
  verifySubtitle: {
    marginTop: 2,
    color: gold,
    fontSize: 6.8,
    fontWeight: 700,
    textAlign: "center",
  },
  summaryRow: {
    marginTop: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E0D8E7",
    backgroundColor: "#FFFFFF",
  },
  summaryBlock: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: "#E0D8E7",
  },
  clientBlock: {
    width: 232,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  rowTitle: {
    color: gold,
    fontSize: 8.6,
    fontWeight: 700,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  summaryText: {
    marginTop: 6,
    color: "#332A36",
    lineHeight: 1.35,
  },
  clientName: {
    marginTop: 7,
    color: purple,
    fontSize: 11.5,
    lineHeight: 1.15,
    fontWeight: 700,
  },
  clientTitle: {
    marginTop: 5,
    color: muted,
    fontSize: 8.6,
    lineHeight: 1.2,
  },
  approvalRow: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  approvalBlock: {
    flex: 1,
    marginHorizontal: 16,
  },
  approvalTitle: {
    color: muted,
    fontSize: 7.2,
    fontWeight: 700,
    letterSpacing: 0.45,
    textAlign: "center",
    textTransform: "uppercase",
  },
  signatureLine: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#CFC5D8",
    height: 1,
  },
  signatureLineGold: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: gold,
    height: 1,
  },
  approvalName: {
    marginTop: 6,
    color: purple,
    fontSize: 9.5,
    fontWeight: 700,
    textAlign: "center",
  },
  approvalNameAccent: {
    color: gold,
  },
  approvalRole: {
    marginTop: 3,
    color: muted,
    fontSize: 7.7,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E3DCE9",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  footerIssued: {
    width: 160,
    color: purple,
    fontSize: 7.4,
    fontWeight: 700,
  },
  footerUrl: {
    flex: 1,
    color: muted,
    fontSize: 7.1,
    textAlign: "center",
  },
  footerBrand: {
    width: 122,
    color: gold,
    fontSize: 7.4,
    fontWeight: 700,
    textAlign: "right",
    letterSpacing: 0.45,
  },
});

export type { CertificatePdfModel };
