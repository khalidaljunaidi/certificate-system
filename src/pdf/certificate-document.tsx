import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "node:path";

import { BRAND_COLORS } from "@/lib/brand";

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

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) {
    return;
  }

  Font.register({
    family: "PublicSans",
    fonts: [
      {
        src: path.join(
          process.cwd(),
          "node_modules",
          "@fontsource",
          "public-sans",
          "files",
          "public-sans-latin-400-normal.woff",
        ),
        fontWeight: 400,
      },
      {
        src: path.join(
          process.cwd(),
          "node_modules",
          "@fontsource",
          "public-sans",
          "files",
          "public-sans-latin-700-normal.woff",
        ),
        fontWeight: 700,
      },
    ],
  });

  fontsRegistered = true;
}

export function CertificateDocument({ model }: { model: CertificatePdfModel }) {
  registerFonts();

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.backgroundGlow} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={LOGO_FILE_PATH} style={styles.watermark} />
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_FILE_PATH} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Project Completion Certificate</Text>
            <Text style={styles.headerSubtitle}>
              Official vendor completion record for project-linked delivery.
            </Text>
            <Text style={styles.code}>{model.certificateCode}</Text>
          </View>
        </View>

        <View style={styles.heroPanel}>
          <Text style={[styles.vendorName, { fontSize: model.vendorFontSize }]}>
            Completion certificate issued to {model.vendorName}
          </Text>
          <Text style={styles.heroMeta}>
            This document confirms successful completion of the contracted scope
            for the project listed below.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.infoCard}>
            <Text style={styles.cardHeading}>Project</Text>
            <Text style={styles.primaryValue}>{model.projectName}</Text>
            <Text style={styles.secondaryValue}>
              {model.projectCode} - {model.projectLocation}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.cardHeading}>Commercial Reference</Text>
            <Text style={styles.primaryValue}>PO: {model.poNumber}</Text>
            <Text style={styles.secondaryValue}>
              {model.contractNumber
                ? `Contract: ${model.contractNumber}`
                : "No contract reference"}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.cardHeading}>Dates</Text>
            <Text style={styles.primaryValue}>
              Completion: {model.completionDate}
            </Text>
            <Text style={styles.secondaryValue}>Issue: {model.issueDate}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.cardHeading}>Total Amount</Text>
            <Text style={styles.primaryValue}>{model.totalAmount}</Text>
            <Text style={styles.secondaryValue}>Saudi Riyal (SAR)</Text>
          </View>
        </View>

        <View style={styles.scopeCard}>
          <Text style={styles.cardHeading}>Executed Scope Summary</Text>
          <Text style={[styles.scopeText, { fontSize: model.summaryFontSize }]}>
            {model.executedScopeSummary}
          </Text>
        </View>

        <View style={styles.signaturesRow}>
          <View style={styles.signatureCard}>
            <Text style={styles.cardHeading}>Client Reference</Text>
            <Text style={styles.primaryValue}>{model.clientName}</Text>
            <Text style={styles.secondaryValue}>{model.clientTitle}</Text>
          </View>
          <View style={styles.signatureCard}>
            <Text style={styles.cardHeading}>Project Manager Approval</Text>
            <Text style={styles.primaryValue}>{model.pmName}</Text>
            <Text style={styles.secondaryValue}>{model.pmTitle}</Text>
          </View>
          <View style={styles.signatureCard}>
            <Text style={styles.cardHeading}>Procurement Issue Approval</Text>
            <Text style={styles.primaryValue}>{model.approverName}</Text>
            <Text style={styles.secondaryValue}>{model.approverTitle}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.verifyPanel}>
            <Text style={styles.cardHeading}>Verification</Text>
            <Text style={styles.secondaryValue}>{model.verificationUrl}</Text>
            <Text style={styles.footerFinePrint}>Issued at {model.issuedAt}</Text>
          </View>
          <View style={styles.qrPanel}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={model.qrDataUrl} style={styles.qrImage} />
            <Text style={styles.footerFinePrint}>Scan to verify</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#fffdf8",
    color: BRAND_COLORS.ink,
    fontFamily: "PublicSans",
    padding: 28,
    position: "relative",
  },
  backgroundGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "#f9f1ea",
  },
watermark: {
  position: "absolute",
  width: 220,
  height: 70,
  right: 26,
  top: 180,
  opacity: 0.06,
  objectFit: "contain",
},
 header: {
  flexDirection: "row",
  alignItems: "center",
  gap: 16,
  backgroundColor: BRAND_COLORS.purple,
  borderRadius: 24,
  paddingVertical: 18,
  paddingHorizontal: 18,
  minHeight: 88,
},
  logo: {
  width: 140,
  height: 42,
  objectFit: "contain",
},
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff7f1",
    fontSize: 24,
    fontWeight: 700,
  },
  headerSubtitle: {
    color: "#e9ddf2",
    fontSize: 10.5,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  code: {
    color: "#f7c08b",
    fontSize: 12,
    marginTop: 10,
    letterSpacing: 1,
  },
  heroPanel: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#eadfd2",
    borderRadius: 20,
    backgroundColor: "#fffaf4",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  vendorName: {
    color: BRAND_COLORS.purple,
    fontWeight: 700,
  },
  heroMeta: {
    color: "#6f5b68",
    fontSize: 10.5,
    lineHeight: 1.5,
    marginTop: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  infoCard: {
    width: "48.6%",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eadfd2",
    padding: 14,
  },
  cardHeading: {
    color: BRAND_COLORS.orange,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  primaryValue: {
    color: BRAND_COLORS.ink,
    fontSize: 13.5,
    lineHeight: 1.4,
    fontWeight: 700,
    marginTop: 7,
  },
  secondaryValue: {
    color: "#665760",
    fontSize: 10.5,
    lineHeight: 1.45,
    marginTop: 5,
  },
  scopeCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eadfd2",
    padding: 16,
    minHeight: 118,
  },
  scopeText: {
    color: "#22161f",
    lineHeight: 1.55,
    marginTop: 10,
  },
  signaturesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  signatureCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eadfd2",
    padding: 14,
    minHeight: 92,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginTop: 16,
    gap: 12,
  },
  verifyPanel: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#fffaf4",
    borderWidth: 1,
    borderColor: "#eadfd2",
    padding: 14,
  },
  qrPanel: {
    width: 110,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eadfd2",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: 72,
    height: 72,
  },
  footerFinePrint: {
    color: "#665760",
    fontSize: 9.5,
    lineHeight: 1.35,
    marginTop: 8,
  },
});

export type { CertificatePdfModel };
