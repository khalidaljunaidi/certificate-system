import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import * as React from "react";

Font.register({
  family: "TheGatheringSans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmEU9fBBc4.woff2",
      fontWeight: 700,
    },
  ],
});

export type VendorRegistrationCertificateModel = {
  certificateId: string;
  requestNumber: string;
  supplierId: string;
  companyName: string;
  legalName: string;
  crNumber: string;
  vatNumber: string;
  categoryName: string;
  approvedAt: string;
  verificationUrl: string;
  qrDataUrl: string;
  note: string;
};

export function VendorRegistrationCertificateDocument({
  model,
}: {
  model: VendorRegistrationCertificateModel;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Text style={styles.brand}>THE GATHERING KSA</Text>
            <Text style={styles.title}>Vendor Registration Certificate</Text>
            <Text style={styles.subtitle}>
              This certificate confirms supplier registration only and does not constitute a purchase order, contract, or guarantee of future business.
            </Text>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.vendorName}>{model.companyName}</Text>
              <Text style={styles.legalName}>{model.legalName}</Text>
            </View>
            <View style={styles.qrWrap}>
              <Image src={model.qrDataUrl} style={styles.qr} />
            </View>
          </View>

          <View style={styles.grid}>
            <Info label="Certificate ID" value={model.certificateId} />
            <Info label="Supplier ID" value={model.supplierId} />
            <Info label="Registration No." value={model.requestNumber} />
            <Info label="Approved At" value={model.approvedAt} />
            <Info label="CR" value={model.crNumber} />
            <Info label="VAT" value={model.vatNumber} />
            <Info label="Category" value={model.categoryName} />
            <Info label="Verification" value={model.verificationUrl} compact />
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Governance Note</Text>
            <Text style={styles.noteText}>{model.note}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function Info({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={compact ? [styles.infoCard, styles.infoCardCompact] : styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f7f1e9",
    padding: 28,
    fontFamily: "TheGatheringSans",
    color: "#241720",
  },
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e3d8cf",
    backgroundColor: "#fffdfb",
    padding: 28,
    minHeight: "100%",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#e6dad1",
    paddingBottom: 18,
    marginBottom: 18,
  },
  brand: {
    color: "#d78439",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 3,
  },
  title: {
    marginTop: 12,
    fontSize: 25,
    fontWeight: 700,
    color: "#311347",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 10.5,
    lineHeight: 1.6,
    color: "#5f5360",
    maxWidth: 480,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  heroText: {
    flex: 1,
  },
  vendorName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#241720",
  },
  legalName: {
    marginTop: 4,
    fontSize: 11.5,
    color: "#6e5b67",
  },
  qrWrap: {
    width: 116,
    height: 116,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eadfd6",
    backgroundColor: "#fff",
    padding: 8,
  },
  qr: {
    width: "100%",
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e8ddd4",
    backgroundColor: "#faf6f2",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoCardCompact: {
    width: "100%",
  },
  infoLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8a7780",
  },
  infoValue: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 1.5,
    color: "#241720",
    wordBreak: "break-word",
  },
  noteCard: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dfd2c8",
    backgroundColor: "#f7efea",
    padding: 16,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#d78439",
  },
  noteText: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 1.6,
    color: "#4b3f48",
  },
});
