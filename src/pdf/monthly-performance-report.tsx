import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "node:path";

import { BRAND_COLORS } from "@/lib/brand";

export type MonthlyPerformancePdfModel = {
  cycleLabel: string;
  generatedAt: string;
  teamOverview: Array<{
    label: string;
    value: string;
  }>;
  employeeCards: Array<{
    name: string;
    title: string;
    assignedTasks: string;
    completedTasks: string;
    overdueTasks: string;
    onTimeRate: string;
    averageCompletion: string;
    monthlyScore: string;
    grade: string;
    managerNotes: string;
    recommendation: string;
  }>;
};

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

export function MonthlyPerformanceReportDocument({
  model,
}: {
  model: MonthlyPerformancePdfModel;
}) {
  registerFonts();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.kicker}>The Gathering KSA</Text>
          <Text style={styles.title}>Monthly Executive Operations Report</Text>
          <Text style={styles.subtitle}>
            Operational execution, workload balance, monthly review governance,
            and team delivery visibility for the selected monthly cycle.
          </Text>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>Selected Cycle</Text>
            <Text style={styles.heroValue}>{model.cycleLabel}</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>Generated</Text>
            <Text style={styles.heroValue}>{model.generatedAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Overview</Text>
          <View style={styles.grid}>
            {model.teamOverview.map((item) => (
              <View key={item.label} style={styles.metricCard}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Monthly Cards</Text>
          {model.employeeCards.map((employee) => (
            <View key={employee.name} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <View>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  <Text style={styles.employeeTitle}>{employee.title}</Text>
                </View>
                <View>
                  <Text style={styles.employeeScore}>{employee.monthlyScore}</Text>
                  <Text style={styles.employeeGrade}>{employee.grade}</Text>
                </View>
              </View>
              <View style={styles.employeeMetrics}>
                <Text style={styles.metricInline}>
                  Assigned {employee.assignedTasks} | Completed {employee.completedTasks}
                </Text>
                <Text style={styles.metricInline}>
                  Overdue {employee.overdueTasks} | On-time {employee.onTimeRate}
                </Text>
                <Text style={styles.metricInline}>
                  Avg completion {employee.averageCompletion}
                </Text>
              </View>
              <View style={styles.commentCard}>
                <Text style={styles.commentLabel}>Manager Notes</Text>
                <Text style={styles.commentValue}>{employee.managerNotes}</Text>
              </View>
              <View style={styles.commentCard}>
                <Text style={styles.commentLabel}>Recommendation</Text>
                <Text style={styles.commentValue}>{employee.recommendation}</Text>
              </View>
            </View>
          ))}
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
  },
  header: {
    backgroundColor: BRAND_COLORS.purple,
    borderRadius: 22,
    padding: 20,
  },
  kicker: {
    color: "#f7c08b",
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 700,
    marginTop: 12,
  },
  subtitle: {
    color: "#efe3f5",
    fontSize: 11,
    lineHeight: 1.5,
    marginTop: 10,
  },
  heroRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  heroCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  cardLabel: {
    color: BRAND_COLORS.orange,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroValue: {
    color: BRAND_COLORS.purple,
    fontSize: 18,
    fontWeight: 700,
    marginTop: 8,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: BRAND_COLORS.purple,
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
  },
  cardValue: {
    color: BRAND_COLORS.ink,
    fontSize: 12,
    fontWeight: 700,
    marginTop: 8,
  },
  employeeCard: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 14,
    marginBottom: 10,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  employeeName: {
    color: BRAND_COLORS.ink,
    fontSize: 13,
    fontWeight: 700,
  },
  employeeTitle: {
    color: "#554756",
    fontSize: 10,
    marginTop: 4,
  },
  employeeScore: {
    color: BRAND_COLORS.purple,
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
  },
  employeeGrade: {
    color: BRAND_COLORS.orange,
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  employeeMetrics: {
    marginTop: 10,
    gap: 4,
  },
  metricInline: {
    color: "#554756",
    fontSize: 10.5,
    lineHeight: 1.5,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 14,
    backgroundColor: "#fffaf4",
    padding: 10,
    marginTop: 8,
  },
  commentLabel: {
    color: BRAND_COLORS.orange,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  commentValue: {
    color: BRAND_COLORS.ink,
    fontSize: 10.5,
    lineHeight: 1.5,
    marginTop: 6,
  },
});
