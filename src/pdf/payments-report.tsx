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
import type { ReactNode } from "react";

const REPORT_COLORS = {
  purple: "#1B1033",
  purple2: "#2A1B4D",
  gold: "#C8A45C",
  goldSoft: "#E5C98A",
  body: "#22161F",
  muted: "#6B7280",
  line: "#E5E7EB",
  panel: "#FFFFFF",
  panelSoft: "#F8F7FB",
} as const;

const LOGO_FILE_PATH = path.join(process.cwd(), "public", "logo.png");
const LOGO_DATA_URI = fs.existsSync(LOGO_FILE_PATH)
  ? `data:image/${path.extname(LOGO_FILE_PATH).slice(1)};base64,${fs
      .readFileSync(LOGO_FILE_PATH)
      .toString("base64")}`
  : null;

let pdfConfigured = false;

function configurePdfRendering() {
  if (pdfConfigured) {
    return;
  }

  Font.registerHyphenationCallback((word) => [word]);
  pdfConfigured = true;
}

type TableColumn = {
  label: string;
  width: string;
  align?: "left" | "right" | "center";
};

export type PaymentsListPdfModel = {
  generatedAt: string;
  documentReference: string;
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
  documentReference: string;
  projectName: string;
  projectCode: string;
  vendorName: string;
  vendorCode: string;
  poNumber: string;
  contractNumber: string;
  totalAmount: string;
  amountSource: string;
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
    summaryRows: string[];
    changes: Array<{
      field: string;
      previousValue: string;
      newValue: string;
    }>;
  }>;
};

export function PaymentsListReportDocument({
  model,
}: {
  model: PaymentsListPdfModel;
}) {
  configurePdfRendering();

  return (
    <Document>
      <ReportPage orientation="landscape">
        <ReportHeader
          title="Payment Tracking Report"
          subtitle="Portfolio export across project assignments"
          generatedAt={model.generatedAt}
          documentReference={model.documentReference}
        />

        <View style={styles.contentLandscape}>
          <SummaryMetrics metrics={model.summary} compact />

          <Section title="Payment Records">
            <ReportTable
              columns={[
                { label: "Project", width: "16%" },
                { label: "Vendor", width: "15%" },
                { label: "PO / Contract", width: "15%" },
                { label: "Total", width: "11%", align: "right" },
                { label: "Paid", width: "10%", align: "right" },
                { label: "Remaining", width: "11%", align: "right" },
                { label: "Next Due", width: "9%" },
                { label: "Status", width: "7%" },
                { label: "Owner", width: "6%" },
              ]}
              rows={model.rows.map((row) => [
                row.project,
                row.vendor,
                row.reference,
                row.totalAmount,
                row.paidAmount,
                row.remainingAmount,
                row.nextDueDate,
                row.status,
                row.financeOwner,
              ])}
              emptyMessage="No payment records found for the current export filters."
              maxRowsPerTable={16}
            />
          </Section>
        </View>
      </ReportPage>
    </Document>
  );
}

export function PaymentRecordReportDocument({
  model,
}: {
  model: PaymentRecordPdfModel;
}) {
  configurePdfRendering();

  return (
    <Document>
      <ReportPage>
        <ReportHeader
          title="Payment Tracking Report"
          subtitle="Assignment-level finance report"
          generatedAt={model.generatedAt}
          documentReference={model.documentReference}
        />

        <View style={styles.content}>
          <Section title="Project and Vendor Summary">
            <View style={styles.twoColumnRow}>
              <InfoPanel
                label="Project"
                value={model.projectName}
                helper={model.projectCode}
                wide
              />
              <InfoPanel
                label="Vendor"
                value={model.vendorName}
                helper={model.vendorCode}
                wide
              />
            </View>
            <View style={styles.summaryGrid}>
              <InfoPanel label="PO Number" value={model.poNumber} />
              <InfoPanel label="Contract Number" value={model.contractNumber} />
              <InfoPanel label="Payment Status" value={model.status} />
              <InfoPanel label="Finance Owner" value={model.financeOwner} />
              <InfoPanel label="Next Due" value={model.nextDueDate} />
              <InfoPanel label="Closure Status" value={model.closureStatus} />
            </View>
          </Section>

          <Section title="Financial Status">
            <SummaryMetrics
              metrics={[
                { label: "Total PO Amount", value: model.totalAmount },
                { label: "Paid Amount", value: model.paidAmount },
                { label: "Remaining Amount", value: model.remainingAmount },
                { label: "Progress", value: model.progressPercent },
                { label: "Amount Source", value: model.amountSource },
              ]}
            />
          </Section>

          <Section title="Finance Notes">
            <TextPanel value={model.financeNotes} />
          </Section>
        </View>
      </ReportPage>

      <ReportPage>
        <ReportHeader
          title="Payment Tracking Report"
          subtitle="Invoices and installments"
          generatedAt={model.generatedAt}
          documentReference={model.documentReference}
        />

        <View style={styles.content}>
          <Section title="Invoices">
            <ReportTable
              columns={[
                { label: "Installment", width: "15%" },
                { label: "Invoice", width: "19%" },
                { label: "Amount", width: "15%", align: "right" },
                { label: "Invoice Date", width: "13%" },
                { label: "Received", width: "13%" },
                { label: "Tax", width: "11%" },
                { label: "Status", width: "14%" },
              ]}
              rows={model.invoices.map((invoice) => [
                invoice.installmentLabel,
                invoice.invoiceNumber,
                invoice.invoiceAmount,
                invoice.invoiceDate,
                invoice.receivedDate,
                invoice.taxValidated,
                invoice.status,
              ])}
              emptyMessage="No invoices recorded."
              maxRowsPerTable={10}
            />
          </Section>

          <Section title="Installments">
            <ReportTable
              columns={[
                { label: "Name", width: "13%" },
                { label: "Amount", width: "14%", align: "right" },
                { label: "Due Date", width: "12%" },
                { label: "Condition", width: "19%" },
                { label: "Invoice", width: "12%" },
                { label: "Paid Date", width: "12%" },
                { label: "Status", width: "9%" },
                { label: "Notes", width: "9%" },
              ]}
              rows={model.installments.map((installment) => [
                installment.label,
                installment.amount,
                installment.dueDate,
                installment.condition,
                installment.invoiceNumber,
                installment.paymentDate,
                installment.status,
                installment.notes,
              ])}
              emptyMessage="No installments recorded."
              maxRowsPerTable={10}
            />
          </Section>

          <Section title="Linked Certificates">
            <ReportTable
              columns={[
                { label: "Certificate", width: "35%" },
                { label: "Status", width: "20%" },
                { label: "Amount", width: "20%", align: "right" },
                { label: "Updated", width: "25%" },
              ]}
              rows={model.certificates.map((certificate) => [
                certificate.code,
                certificate.status,
                certificate.totalAmount,
                certificate.updatedAt,
              ])}
              emptyMessage="No linked certificates recorded."
              maxRowsPerTable={8}
            />
          </Section>
        </View>
      </ReportPage>

      <ReportPage>
        <ReportHeader
          title="Payment Tracking Report"
          subtitle="Audit summary"
          generatedAt={model.generatedAt}
          documentReference={model.documentReference}
        />

        <View style={styles.content}>
          <Section title="Audit Summary">
            {model.auditItems.length > 0 ? (
              <View style={styles.auditList}>
                {model.auditItems.map((item, index) => (
                  <AuditCard key={`${item.title}-${index}`} item={item} />
                ))}
              </View>
            ) : (
              <TextPanel value="No audit summary available." />
            )}
          </Section>
        </View>
      </ReportPage>
    </Document>
  );
}

function ReportPage({
  children,
  orientation,
}: {
  children: ReactNode;
  orientation?: "portrait" | "landscape";
}) {
  return (
    <Page size="A4" orientation={orientation} style={styles.page}>
      {children}
      <Text
        fixed
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </Page>
  );
}

function ReportHeader({
  title,
  subtitle,
  generatedAt,
  documentReference,
}: {
  title: string;
  subtitle: string;
  generatedAt: string;
  documentReference: string;
}) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerBrandColumn}>
        {LOGO_DATA_URI ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={LOGO_DATA_URI} style={styles.logo} />
        ) : (
          <Text style={styles.logoFallback}>THE GATHERING</Text>
        )}
        <Text style={styles.platform}>Procurement Operations Platform</Text>
      </View>
      <View style={styles.headerReportColumn}>
        <Text style={styles.reportTitle}>{title}</Text>
        <Text style={styles.reportSubtitle}>{subtitle}</Text>
        <Text style={styles.reportMeta}>
          Exported {generatedAt} | Ref {documentReference}
        </Text>
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SummaryMetrics({
  metrics,
  compact = false,
}: {
  metrics: Array<{ label: string; value: string }>;
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.metricGridCompact : styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricCard} wrap={false}>
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
        </View>
      ))}
    </View>
  );
}

function InfoPanel({
  label,
  value,
  helper,
  wide = false,
}: {
  label: string;
  value: string;
  helper?: string;
  wide?: boolean;
}) {
  return (
    <View style={wide ? styles.infoPanelWide : styles.infoPanel} wrap={false}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      {helper ? <Text style={styles.infoHelper}>{helper}</Text> : null}
    </View>
  );
}

function TextPanel({ value }: { value: string }) {
  return (
    <View style={styles.textPanel} wrap={false}>
      <Text style={styles.textPanelValue}>{value}</Text>
    </View>
  );
}

function ReportTable({
  columns,
  rows,
  emptyMessage,
  maxRowsPerTable,
}: {
  columns: TableColumn[];
  rows: string[][];
  emptyMessage: string;
  maxRowsPerTable: number;
}) {
  const rowGroups =
    rows.length > 0 ? chunkRows(rows, maxRowsPerTable) : [[[emptyMessage]]];

  return (
    <View style={styles.tableStack}>
      {rowGroups.map((rowGroup, groupIndex) => {
        const isEmptyMessageRow = rowGroup.length === 1 && rowGroup[0].length === 1;

        return (
          <View
            key={`table-${groupIndex}`}
            style={styles.table}
            wrap={false}
          >
            <View style={styles.tableHeader}>
              {columns.map((column) => (
                <Text
                  key={column.label}
                  style={[
                    styles.tableHeaderCell,
                    getTextAlignStyle(column.align),
                    { width: column.width },
                  ]}
                >
                  {column.label}
                </Text>
              ))}
            </View>

            {isEmptyMessageRow ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "100%" }]}>
                  {rowGroup[0][0]}
                </Text>
              </View>
            ) : (
              rowGroup.map((row, rowIndex) => (
                <View
                  key={`${groupIndex}-${rowIndex}`}
                  style={
                    rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt
                  }
                >
                  {columns.map((column, columnIndex) => (
                    <Text
                      key={`${groupIndex}-${rowIndex}-${column.label}`}
                      style={[
                        styles.tableCell,
                        getTextAlignStyle(column.align),
                        { width: column.width },
                      ]}
                    >
                      {row[columnIndex] ?? "-"}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function AuditCard({
  item,
}: {
  item: PaymentRecordPdfModel["auditItems"][number];
}) {
  return (
    <View style={styles.auditCard} wrap={false}>
      <View style={styles.auditHeader}>
        <Text style={styles.auditTitle}>{item.title}</Text>
        <Text style={styles.auditMeta}>
          {item.actorName} | {item.createdAt}
        </Text>
      </View>

      {item.summaryRows.map((summaryRow) => (
        <Text key={summaryRow} style={styles.auditSummary}>
          {summaryRow}
        </Text>
      ))}

      {item.changes.length > 0 ? (
        <View style={styles.auditChanges}>
          <View style={styles.auditChangeHeader}>
            <Text style={[styles.auditChangeCell, { width: "32%" }]}>Field</Text>
            <Text style={[styles.auditChangeCell, { width: "34%" }]}>
              Previous
            </Text>
            <Text style={[styles.auditChangeCell, { width: "34%" }]}>New</Text>
          </View>
          {item.changes.map((change) => (
            <View key={`${item.title}-${change.field}`} style={styles.auditChangeRow}>
              <Text style={[styles.auditChangeValue, { width: "32%" }]}>
                {change.field}
              </Text>
              <Text style={[styles.auditChangeValue, { width: "34%" }]}>
                {change.previousValue}
              </Text>
              <Text style={[styles.auditChangeValue, { width: "34%" }]}>
                {change.newValue}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function chunkRows(rows: string[][], size: number) {
  const chunks: string[][][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function getTextAlignStyle(align: TableColumn["align"]) {
  if (align === "right") {
    return styles.alignRight;
  }

  if (align === "center") {
    return styles.alignCenter;
  }

  return styles.alignLeft;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: REPORT_COLORS.panelSoft,
    color: REPORT_COLORS.body,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  header: {
    height: 78,
    backgroundColor: REPORT_COLORS.purple,
    paddingHorizontal: 30,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBrandColumn: {
    width: "46%",
  },
  logo: {
    width: 146,
    height: 24,
  },
  logoFallback: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: "#FFFFFF",
  },
  platform: {
    marginTop: 7,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: REPORT_COLORS.goldSoft,
  },
  headerReportColumn: {
    width: "50%",
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  reportSubtitle: {
    marginTop: 4,
    fontSize: 9,
    color: "#F8F7FB",
  },
  reportMeta: {
    marginTop: 5,
    fontSize: 8,
    color: REPORT_COLORS.goldSoft,
  },
  content: {
    paddingHorizontal: 30,
    paddingVertical: 22,
  },
  contentLandscape: {
    paddingHorizontal: 26,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.9,
    color: REPORT_COLORS.purple,
    textTransform: "uppercase",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 14,
  },
  metricCard: {
    minWidth: 96,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    backgroundColor: REPORT_COLORS.panel,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metricLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: REPORT_COLORS.muted,
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.25,
    color: REPORT_COLORS.body,
  },
  infoPanel: {
    width: "31.8%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    backgroundColor: REPORT_COLORS.panel,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  infoPanelWide: {
    width: "49%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    backgroundColor: REPORT_COLORS.panel,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  infoLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: REPORT_COLORS.muted,
    textTransform: "uppercase",
  },
  infoValue: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.35,
    color: REPORT_COLORS.body,
  },
  infoHelper: {
    marginTop: 4,
    fontSize: 8.2,
    color: REPORT_COLORS.muted,
  },
  textPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    backgroundColor: REPORT_COLORS.panel,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  textPanelValue: {
    fontSize: 9,
    lineHeight: 1.45,
    color: REPORT_COLORS.body,
  },
  tableStack: {
    gap: 9,
  },
  table: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: REPORT_COLORS.purple,
  },
  tableHeaderCell: {
    paddingHorizontal: 5,
    paddingVertical: 7,
    fontSize: 7,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: "#FBFAFD",
  },
  tableCell: {
    paddingHorizontal: 5,
    paddingVertical: 7,
    fontSize: 7.4,
    lineHeight: 1.35,
    color: REPORT_COLORS.body,
  },
  alignLeft: {
    textAlign: "left",
  },
  alignRight: {
    textAlign: "right",
  },
  alignCenter: {
    textAlign: "center",
  },
  auditList: {
    gap: 9,
  },
  auditCard: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    backgroundColor: REPORT_COLORS.panel,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  auditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  auditTitle: {
    width: "60%",
    fontSize: 9.2,
    fontWeight: 700,
    color: REPORT_COLORS.purple,
  },
  auditMeta: {
    width: "38%",
    fontSize: 8,
    textAlign: "right",
    color: REPORT_COLORS.muted,
  },
  auditSummary: {
    marginTop: 3,
    fontSize: 8.2,
    lineHeight: 1.35,
    color: REPORT_COLORS.body,
  },
  auditChanges: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: REPORT_COLORS.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  auditChangeHeader: {
    flexDirection: "row",
    backgroundColor: REPORT_COLORS.panelSoft,
  },
  auditChangeRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: REPORT_COLORS.line,
  },
  auditChangeCell: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 7.2,
    fontWeight: 700,
    color: REPORT_COLORS.muted,
    textTransform: "uppercase",
  },
  auditChangeValue: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 7.6,
    lineHeight: 1.3,
    color: REPORT_COLORS.body,
  },
  pageNumber: {
    position: "absolute",
    right: 30,
    bottom: 14,
    fontSize: 8,
    color: REPORT_COLORS.muted,
  },
});
