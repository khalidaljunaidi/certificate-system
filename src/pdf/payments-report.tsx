import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

import { BRAND_COLORS } from "@/lib/brand";

const LOGO_FILE_PATH = path.join(process.cwd(), "public", "logo.png");
const LOGO_DATA_URI = fs.existsSync(LOGO_FILE_PATH)
  ? `data:image/${path.extname(LOGO_FILE_PATH).slice(1)};base64,${fs.readFileSync(
      LOGO_FILE_PATH,
    ).toString("base64")}`
  : null;

export type PaymentsListPdfModel = {
  generatedAt: string;
  summary: Array<{
    label: string;
    value: string;
  }>;
  rows: Array<{
    project: string;
    vendor: string;
    reference: string;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    nextDueDate: string;
    status: string;
    financeOwner: string;
  }>;
};

export type PaymentRecordPdfModel = {
  generatedAt: string;
  projectName: string;
  projectCode: string;
  vendorName: string;
  vendorCode: string;
  poNumber: string;
  contractNumber: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  progressPercent: string;
  status: string;
  closureStatus: string;
  nextDueDate: string;
  financeOwner: string;
  financeNotes: string;
  invoices: Array<{
    installmentLabel: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: string;
    receivedDate: string;
    taxValidated: string;
    status: string;
  }>;
  installments: Array<{
    label: string;
    amount: string;
    dueDate: string;
    condition: string;
    invoiceNumber: string;
    paymentDate: string;
    status: string;
    notes: string;
  }>;
  certificates: Array<{
    code: string;
    status: string;
    totalAmount: string;
    updatedAt: string;
  }>;
  auditItems: Array<{
    title: string;
    actorName: string;
    createdAt: string;
    summary: string;
  }>;
};

export function PaymentsListReportDocument({
  model,
}: {
  model: PaymentsListPdfModel;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.shell}>
          <Header
            title="Payments Portfolio Report"
            subtitle="Cross-project payment tracking summary"
            generatedAt={model.generatedAt}
          />

          <View style={styles.metricRow}>
            {model.summary.map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} />
            ))}
          </View>

          <SectionTitle title="Payment Records" />
          <Table
            columns={[
              { label: "Project", width: "16%" },
              { label: "Vendor", width: "15%" },
              { label: "PO / Contract", width: "15%" },
              { label: "Total", width: "10%" },
              { label: "Paid", width: "10%" },
              { label: "Remaining", width: "10%" },
              { label: "Next Due", width: "10%" },
              { label: "Status", width: "7%" },
              { label: "Finance Owner", width: "7%" },
            ]}
            rows={
              model.rows.length > 0
                ? model.rows.map((row) => [
                    row.project,
                    row.vendor,
                    row.reference,
                    row.totalAmount,
                    row.paidAmount,
                    row.remainingAmount,
                    row.nextDueDate,
                    row.status,
                    row.financeOwner,
                  ])
                : [["No payment records found for the current export filters."]]
            }
            emptyColSpan={9}
          />
        </View>
      </Page>
    </Document>
  );
}

export function PaymentRecordReportDocument({
  model,
}: {
  model: PaymentRecordPdfModel;
}) {
  const hasSupplementaryContent =
    model.certificates.length > 0 || model.auditItems.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <Header
            title="Payment Tracking Report"
            subtitle="Assignment-level finance report"
            generatedAt={model.generatedAt}
          />

          <View style={styles.heroRow}>
            <InfoCard label="Project" value={model.projectName} meta={model.projectCode} />
            <InfoCard label="Vendor" value={model.vendorName} meta={model.vendorCode} />
          </View>

          <View style={styles.summaryGrid}>
            <InfoCard label="PO Number" value={model.poNumber} />
            <InfoCard label="Contract Number" value={model.contractNumber} />
            <InfoCard label="Payment Status" value={model.status} />
            <InfoCard label="Closure Status" value={model.closureStatus} />
            <InfoCard label="Finance Owner" value={model.financeOwner} />
            <InfoCard label="Next Due Date" value={model.nextDueDate} />
            <InfoCard label="Progress" value={model.progressPercent} />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Total PO Amount" value={model.totalAmount} />
            <MetricCard label="Paid Amount" value={model.paidAmount} />
            <MetricCard label="Remaining Amount" value={model.remainingAmount} />
          </View>

          <SectionTitle title="Finance Notes" />
          <TextCard value={model.financeNotes} />

          <SectionTitle title="Invoices" />
          <Table
            columns={[
              { label: "Installment", width: "16%" },
              { label: "Invoice Number", width: "16%" },
              { label: "Invoice Date", width: "12%" },
              { label: "Invoice Amount", width: "14%" },
              { label: "Received Date", width: "12%" },
              { label: "Tax Validation", width: "12%" },
              { label: "Status", width: "18%" },
            ]}
            rows={
              model.invoices.length > 0
                ? model.invoices.map((invoice) => [
                    invoice.installmentLabel,
                    invoice.invoiceNumber,
                    invoice.invoiceDate,
                    invoice.invoiceAmount,
                    invoice.receivedDate,
                    invoice.taxValidated,
                    invoice.status,
                  ])
                : [["No invoices recorded"]]
            }
            emptyColSpan={7}
          />

          <SectionTitle title="Installments" />
          <Table
            columns={[
              { label: "Installment", width: "15%" },
              { label: "Amount SAR", width: "13%" },
              { label: "Due Date", width: "12%" },
              { label: "Condition", width: "18%" },
              { label: "Invoice Number", width: "12%" },
              { label: "Payment Date", width: "12%" },
              { label: "Status", width: "8%" },
              { label: "Notes", width: "10%" },
            ]}
            rows={
              model.installments.length > 0
                ? model.installments.map((installment) => [
                    installment.label,
                    installment.amount,
                    installment.dueDate,
                    installment.condition,
                    installment.invoiceNumber,
                    installment.paymentDate,
                    installment.status,
                    installment.notes,
                  ])
                : [["No installments recorded"]]
            }
            emptyColSpan={8}
          />
        </View>
      </Page>

      {hasSupplementaryContent ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.shell}>
            <Header
              title="Payment Tracking Report"
              subtitle="Certificates and audit summary"
              generatedAt={model.generatedAt}
            />

            <SectionTitle title="Linked Certificates" />
            <Table
              columns={[
                { label: "Certificate", width: "28%" },
                { label: "Status", width: "18%" },
                { label: "Amount", width: "18%" },
                { label: "Updated At", width: "36%" },
              ]}
              rows={
                model.certificates.length > 0
                  ? model.certificates.map((certificate) => [
                      certificate.code,
                      certificate.status,
                      certificate.totalAmount,
                      certificate.updatedAt,
                    ])
                  : [["No linked certificates recorded"]]
              }
              emptyColSpan={4}
            />

            <SectionTitle title="Audit Summary" />
            {model.auditItems.length > 0 ? (
              <View style={styles.auditList}>
                {model.auditItems.map((item, index) => (
                  <View
                    key={`${item.title}-${index}`}
                    style={styles.auditCard}
                  >
                    <Text style={styles.auditTitle}>{item.title}</Text>
                    <Text style={styles.auditMeta}>
                      {item.actorName} | {item.createdAt}
                    </Text>
                    <Text style={styles.auditSummary}>{item.summary}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <TextCard value="No audit summary available." />
            )}
          </View>
        </Page>
      ) : null}
    </Document>
  );
}

function Header({
  title,
  subtitle,
  generatedAt,
}: {
  title: string;
  subtitle: string;
  generatedAt: string;
}) {
  return (
    <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
          {LOGO_DATA_URI ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={LOGO_DATA_URI} style={styles.logo} />
          ) : null}
          <View>
            <Text style={styles.brand}>THE GATHERING KSA</Text>
            <Text style={styles.platform}>Procurement Operations Platform</Text>
          </View>
        </View>
        <Text style={styles.generatedAt}>Exported {generatedAt}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function InfoCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      {meta ? <Text style={styles.infoMeta}>{meta}</Text> : null}
    </View>
  );
}

function TextCard({ value }: { value: string }) {
  return (
    <View style={styles.textCard}>
      <Text style={styles.textCardValue}>{value}</Text>
    </View>
  );
}

function Table({
  columns,
  rows,
  emptyColSpan,
}: {
  columns: Array<{
    label: string;
    width: string;
  }>;
  rows: string[][];
  emptyColSpan: number;
}) {
  const isEmptyMessageRow = rows.length === 1 && rows[0].length === 1;

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        {columns.map((column) => (
          <Text
            key={column.label}
            style={[styles.tableHeaderCell, { width: column.width }]}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {isEmptyMessageRow ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: "100%" }]}>{rows[0][0]}</Text>
        </View>
      ) : (
        rows.map((row, rowIndex) => (
          <View
            key={`${row[0]}-${rowIndex}`}
            style={rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            {columns.map((column, index) => (
              <Text
                key={`${rowIndex}-${column.label}`}
                style={[styles.tableCell, { width: column.width }]}
              >
                {row[index] ?? "-"}
              </Text>
            ))}
          </View>
        ))
      )}
      {isEmptyMessageRow && emptyColSpan === 0 ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: BRAND_COLORS.sand,
    padding: 24,
    fontFamily: "Helvetica",
    color: BRAND_COLORS.ink,
  },
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    backgroundColor: "#fffdfb",
    padding: 22,
    minHeight: "100%",
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e6dad1",
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 34,
    height: 34,
    marginRight: 12,
  },
  brand: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2.8,
    color: BRAND_COLORS.orange,
  },
  platform: {
    marginTop: 3,
    fontSize: 10,
    color: "#6b6070",
  },
  generatedAt: {
    fontSize: 9.5,
    color: "#7b6d75",
  },
  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: 700,
    color: BRAND_COLORS.purple,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 10.5,
    color: "#5f5360",
  },
  heroRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8ddd4",
    backgroundColor: "#faf6f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#8a7780",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  metricValue: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: 700,
    color: BRAND_COLORS.ink,
  },
  infoCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8ddd4",
    backgroundColor: "#faf6f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#8a7780",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  infoValue: {
    marginTop: 7,
    fontSize: 11,
    color: BRAND_COLORS.ink,
  },
  infoMeta: {
    marginTop: 4,
    fontSize: 9.5,
    color: "#6b6070",
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: 700,
    color: BRAND_COLORS.orange,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  textCard: {
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dfd2c8",
    backgroundColor: "#f7efea",
    padding: 12,
  },
  textCardValue: {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: "#4b3f48",
  },
  table: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e8ddd4",
    borderRadius: 16,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_COLORS.purple,
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    paddingVertical: 9,
    fontSize: 8.4,
    fontWeight: 700,
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fffdfb",
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: "#faf6f2",
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 8.7,
    color: BRAND_COLORS.ink,
  },
  auditList: {
    gap: 10,
  },
  auditCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dfd2c8",
    backgroundColor: "#faf6f2",
    padding: 12,
  },
  auditTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: BRAND_COLORS.purple,
  },
  auditMeta: {
    marginTop: 4,
    fontSize: 9.2,
    color: "#6b6070",
  },
  auditSummary: {
    marginTop: 6,
    fontSize: 9.8,
    lineHeight: 1.5,
    color: "#4b3f48",
  },
});
