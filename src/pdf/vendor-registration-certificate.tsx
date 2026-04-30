import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import * as React from "react";

Font.registerHyphenationCallback((word) => [word]);

export type VendorRegistrationCertificateModel = {
  logoDataUrl: string | null;
  certificateCode: string;
  requestNumber: string;
  supplierId: string;
  companyName: string;
  legalName: string;
  crNumber: string;
  vatNumber: string;
  categoryName: string;
  subcategories: string[];
  additionalSubcategoryCount: number;
  countryLabel: string;
  issueDate: string;
  verificationStatus: "APPROVED";
  verificationUrl: string;
  qrDataUrl: string;
  coverageTitle: string;
  coverageLocations: string[];
  additionalCoverageLocationCount: number;
  note: string;
};

export function VendorRegistrationCertificateDocument({
  model,
}: {
  model: VendorRegistrationCertificateModel;
}) {
  const supplierNameStyle =
    model.companyName.length > 44
      ? [styles.supplierName, styles.supplierNameSmall]
      : styles.supplierName;

  return (
    <Document
      title={`${model.certificateCode} - Supplier Registration Certificate`}
      author="THE GATHERING KSA"
      subject="Authorized Supplier Registration Certificate"
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.outerFrame}>
          <View style={styles.innerFrame}>
            {model.logoDataUrl ? (
              <Image src={model.logoDataUrl} style={styles.watermark} />
            ) : null}

            <View style={styles.header}>
              <View style={styles.headerBrand}>
                {model.logoDataUrl ? (
                  <Image src={model.logoDataUrl} style={styles.logo} />
                ) : (
                  <View style={styles.logoFallback}>
                    <Text style={styles.logoFallbackText}>TG</Text>
                  </View>
                )}
                <View style={styles.brandTextBlock}>
                  <Text style={styles.brandName}>THE GATHERING KSA</Text>
                  <Text style={styles.brandSubline}>Procurement Operations</Text>
                </View>
              </View>

              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerTitle}>
                  AUTHORIZED SUPPLIER REGISTRATION CERTIFICATE
                </Text>
                <Text style={styles.headerSubtitle}>
                  Authorized by THE GATHERING KSA
                </Text>
              </View>

              <VerificationBlock qrDataUrl={model.qrDataUrl} />
            </View>

            <View style={styles.body}>
              <View style={styles.supplierStage}>
                <Text style={styles.certifiesText}>This certifies that</Text>
                <Text style={supplierNameStyle}>{model.companyName}</Text>
                <Text style={styles.legalName}>{model.legalName}</Text>
              </View>

              <View style={styles.detailBand}>
                <View style={styles.detailColumn}>
                  <Text style={styles.blockTitle}>Certificate Details</Text>
                  <CertificateField
                    label="Certificate Code"
                    value={model.certificateCode}
                    mono
                  />
                  <CertificateField label="Issue Date" value={model.issueDate} />
                  <CertificateField
                    label="Request Number"
                    value={model.requestNumber}
                    mono
                  />
                  <CertificateField label="Supplier ID" value={model.supplierId} mono />
                </View>

                <View style={styles.identityColumn}>
                  <Text style={styles.blockTitle}>Supplier Identity</Text>
                  <View style={styles.identityGrid}>
                  <CertificateField
                    label="Commercial Registration"
                    value={model.crNumber}
                    mono
                    half
                  />
                    <CertificateField
                      label="VAT Number"
                      value={model.vatNumber}
                      mono
                      half
                    />
                    <CertificateField
                      label="Country"
                      value={model.countryLabel}
                      strong
                      half
                    />
                    <CertificateField
                      label="Verification Status"
                      value={model.verificationStatus}
                      status
                      half
                    />
                  </View>
                </View>
              </View>

              <View style={styles.classificationRow}>
                <View style={styles.categoryBlock}>
                  <Text style={styles.rowLabel}>Vendor Classification</Text>
                  <Text style={styles.categoryValue}>{model.categoryName}</Text>
                </View>
                <View style={styles.subcategoryBlock}>
                  <Text style={styles.rowLabel}>Approved Subcategories</Text>
                  <View style={styles.subcategoryGrid}>
                    {model.subcategories.length > 0 ? (
                      model.subcategories.map((subcategory) => (
                        <Chip key={subcategory}>{subcategory}</Chip>
                      ))
                    ) : (
                      <Text style={styles.emptyValue}>Not recorded</Text>
                    )}
                    {model.additionalSubcategoryCount > 0 ? (
                      <Chip accent>
                        +{model.additionalSubcategoryCount} additional approved
                        subcategories
                      </Chip>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.coverageRow}>
                <View style={styles.coverageCell}>
                  <Text style={styles.rowLabel}>Coverage</Text>
                  <Text style={styles.coverageValue}>{model.coverageTitle}</Text>
                </View>
                <View style={styles.coverageCellWide}>
                  <Text style={styles.rowLabel}>Scope</Text>
                  <Text style={styles.scopeValue}>
                    {model.coverageLocations.join(", ")}
                    {model.additionalCoverageLocationCount > 0
                      ? `, +${model.additionalCoverageLocationCount} additional locations`
                      : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.legalStatement}>
                <Text style={styles.legalStatementText}>{model.note}</Text>
              </View>

              <SignatureBlock />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerCode}>{model.certificateCode}</Text>
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
  mono,
  strong,
  status,
  half,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  status?: boolean;
  half?: boolean;
}) {
  return (
    <View style={half ? [styles.field, styles.fieldHalf] : styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text
        style={[
          styles.fieldValue,
          ...(mono ? [styles.monoValue] : []),
          ...(strong ? [styles.strongValue] : []),
          ...(status ? [styles.statusValue] : []),
        ]}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function Chip({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Text style={accent ? [styles.chip, styles.chipAccent] : styles.chip}>
      {children}
    </Text>
  );
}

function VerificationBlock({ qrDataUrl }: { qrDataUrl: string }) {
  return (
    <View style={styles.verificationBlock}>
      <Image src={qrDataUrl} style={styles.qr} />
      <Text style={styles.qrTitle}>Scan to verify</Text>
      <Text style={styles.qrSubtitle}>authenticity</Text>
    </View>
  );
}

function SignatureBlock() {
  return (
    <View style={styles.signatureRow}>
      <View style={styles.signatureUnit}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureTitle}>Procurement Department</Text>
      </View>
      <View style={styles.signatureUnit}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureTitle}>Authorized Approval</Text>
      </View>
      <View style={styles.signatureUnit}>
        <View style={styles.signatureLineGold} />
        <Text style={styles.signatureTitleGold}>THE GATHERING KSA</Text>
      </View>
    </View>
  );
}

const purple = "#1B1033";
const purple2 = "#2A1B4D";
const gold = "#C8A45C";
const softGold = "#E5C98A";
const ink = "#22161F";
const muted = "#62566A";
const border = "#DED6E5";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#F7F4FA",
    color: ink,
    fontFamily: "Helvetica",
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
    width: 255,
    height: 255,
    left: 285,
    top: 174,
    opacity: 0.03,
    objectFit: "contain",
  },
  header: {
    height: 78,
    backgroundColor: purple,
    borderBottomWidth: 3,
    borderBottomColor: gold,
    color: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerBrand: {
    width: 170,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: "contain",
    marginRight: 10,
  },
  logoFallback: {
    width: 42,
    height: 42,
    backgroundColor: purple2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoFallbackText: {
    color: gold,
    fontSize: 13,
    fontWeight: 700,
  },
  brandTextBlock: {
    width: 112,
  },
  brandName: {
    color: softGold,
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 0.75,
  },
  brandSubline: {
    marginTop: 4,
    color: "#F8F7FB",
    fontSize: 8.6,
    fontWeight: 700,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 13.4,
    fontWeight: 700,
    letterSpacing: 0.55,
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 6,
    color: softGold,
    fontSize: 8.8,
    fontWeight: 700,
    textAlign: "center",
  },
  verificationBlock: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 10,
  },
  qr: {
    width: 42,
    height: 42,
    backgroundColor: "#FFFFFF",
  },
  qrTitle: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 6.7,
    fontWeight: 700,
    textAlign: "center",
  },
  qrSubtitle: {
    marginTop: 2,
    color: softGold,
    fontSize: 6.4,
    textAlign: "center",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 42,
  },
  supplierStage: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E8DFEC",
  },
  certifiesText: {
    color: gold,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  supplierName: {
    marginTop: 6,
    color: purple,
    fontSize: 26,
    lineHeight: 1.05,
    fontWeight: 700,
    textAlign: "center",
  },
  supplierNameSmall: {
    fontSize: 21,
  },
  legalName: {
    marginTop: 5,
    color: muted,
    fontSize: 9,
    textAlign: "center",
  },
  detailBand: {
    marginTop: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: border,
    backgroundColor: "#FCFBFD",
  },
  detailColumn: {
    width: 255,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: border,
  },
  identityColumn: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  blockTitle: {
    color: purple,
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 8,
  },
  identityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  field: {
    marginBottom: 6.5,
  },
  fieldHalf: {
    width: "50%",
  },
  fieldLabel: {
    color: muted,
    fontSize: 6.6,
    fontWeight: 700,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  fieldValue: {
    marginTop: 3,
    color: ink,
    fontSize: 9.2,
    lineHeight: 1.2,
    fontWeight: 700,
  },
  monoValue: {
    fontSize: 8.7,
  },
  strongValue: {
    color: purple,
    fontSize: 9.4,
  },
  statusValue: {
    color: "#1E6A3C",
    fontSize: 9.4,
  },
  classificationRow: {
    marginTop: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E0D8E7",
    backgroundColor: "#FFFFFF",
  },
  categoryBlock: {
    width: 255,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: "#E0D8E7",
  },
  subcategoryBlock: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  rowLabel: {
    color: muted,
    fontSize: 6.8,
    fontWeight: 700,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  categoryValue: {
    marginTop: 5,
    color: purple,
    fontSize: 10.6,
    fontWeight: 700,
  },
  subcategoryGrid: {
    marginTop: 5,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    width: "47%",
    color: purple,
    borderWidth: 1,
    borderColor: "#DDCFB5",
    backgroundColor: "#FFF9EB",
    fontSize: 6.2,
    lineHeight: 1.15,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginRight: 5,
    marginBottom: 4,
  },
  chipAccent: {
    backgroundColor: "#F3ECFA",
    borderColor: "#D9CAE9",
    color: purple2,
  },
  emptyValue: {
    marginTop: 4,
    color: muted,
    fontSize: 8.5,
  },
  coverageRow: {
    marginTop: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D8C796",
    backgroundColor: "#FFFDF6",
  },
  coverageCell: {
    width: 255,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: "#E9DDBD",
  },
  coverageCellWide: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  coverageValue: {
    marginTop: 5,
    color: purple,
    fontSize: 11,
    fontWeight: 700,
  },
  scopeValue: {
    marginTop: 5,
    color: ink,
    fontSize: 10.2,
    fontWeight: 700,
  },
  legalStatement: {
    marginTop: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E8E0EE",
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  legalStatementText: {
    color: "#4B4252",
    fontSize: 7.9,
    lineHeight: 1.2,
    textAlign: "center",
  },
  signatureRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  signatureUnit: {
    flex: 1,
    marginHorizontal: 10,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#CFC5D8",
    height: 1,
    marginBottom: 5,
  },
  signatureLineGold: {
    borderTopWidth: 1,
    borderTopColor: gold,
    height: 1,
    marginBottom: 5,
  },
  signatureTitle: {
    color: purple,
    fontSize: 8.2,
    fontWeight: 700,
    textAlign: "center",
  },
  signatureTitleGold: {
    color: gold,
    fontSize: 8.2,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 0.45,
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
  footerCode: {
    width: 172,
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
    letterSpacing: 0.6,
  },
});
