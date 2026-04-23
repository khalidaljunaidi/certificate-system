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

export type PerformanceReviewPdfModel = {
  employeeName: string;
  employeeTitle: string;
  employeeRole: string;
  evaluatorName: string;
  reviewPeriod: string;
  generatedAt: string;
  systemScore: string;
  managerScore: string;
  finalScore: string;
  grade: string;
  managerComments: string;
  recommendation: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  capabilityIndexes: Array<{
    label: string;
    value: string;
  }>;
  scorecard: Array<{
    label: string;
    weight: string;
    score: string;
    weightedScore: string;
    notes: string;
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

export function PerformanceReviewReportDocument({
  model,
}: {
  model: PerformanceReviewPdfModel;
}) {
  registerFonts();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.kicker}>The Gathering KSA</Text>
          <Text style={styles.title}>Executive Performance Review</Text>
          <Text style={styles.subtitle}>
            Operational task management, KPI measurement, and managerial performance evaluation summary
          </Text>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>Employee</Text>
            <Text style={styles.heroValue}>{model.employeeName}</Text>
            <Text style={styles.cardValue}>
              {model.employeeTitle} | {model.employeeRole}
            </Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>Review Period</Text>
            <Text style={styles.heroValue}>{model.reviewPeriod}</Text>
            <Text style={styles.cardValue}>Generated {model.generatedAt}</Text>
          </View>
        </View>

        <View style={styles.scorePanel}>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>System Score</Text>
            <Text style={styles.scoreValue}>{model.systemScore}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>Manager Score</Text>
            <Text style={styles.scoreValue}>{model.managerScore}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>Final Score</Text>
            <Text style={styles.scoreValue}>{model.finalScore}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.cardLabel}>Final Grade</Text>
            <Text style={styles.scoreValue}>{model.grade}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KPI Summary</Text>
          <View style={styles.grid}>
            {model.metrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <Text style={styles.cardLabel}>{metric.label}</Text>
                <Text style={styles.cardValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capability Indexes</Text>
          <View style={styles.grid}>
            {model.capabilityIndexes.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <Text style={styles.cardLabel}>{metric.label}</Text>
                <Text style={styles.cardValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Scorecard</Text>
          {model.scorecard.map((entry) => (
            <View key={entry.label} style={styles.scorecardRow}>
              <View style={styles.scorecardHeader}>
                <Text style={styles.scorecardTitle}>{entry.label}</Text>
                <Text style={styles.scorecardMeta}>
                  Weight {entry.weight} | Score {entry.score} | Weighted {entry.weightedScore}
                </Text>
              </View>
              <Text style={styles.scorecardNotes}>{entry.notes || "No notes provided."}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Summary</Text>
          <View style={styles.commentCard}>
            <Text style={styles.commentLabel}>Evaluator</Text>
            <Text style={styles.commentValue}>{model.evaluatorName}</Text>
          </View>
          <View style={styles.commentCard}>
            <Text style={styles.commentLabel}>Comments</Text>
            <Text style={styles.commentValue}>{model.managerComments}</Text>
          </View>
          <View style={styles.commentCard}>
            <Text style={styles.commentLabel}>Recommendation</Text>
            <Text style={styles.commentValue}>{model.recommendation}</Text>
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
  cardValue: {
    color: "#554756",
    fontSize: 11,
    lineHeight: 1.5,
    marginTop: 6,
  },
  scorePanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  scoreCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 18,
    backgroundColor: "#fffaf4",
    padding: 14,
  },
  scoreValue: {
    color: BRAND_COLORS.ink,
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
  scorecardRow: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 8,
  },
  scorecardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  scorecardTitle: {
    color: BRAND_COLORS.ink,
    fontSize: 12,
    fontWeight: 700,
  },
  scorecardMeta: {
    color: BRAND_COLORS.orange,
    fontSize: 10,
  },
  scorecardNotes: {
    color: "#554756",
    fontSize: 10.5,
    lineHeight: 1.5,
    marginTop: 8,
  },
  commentCard: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 8,
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
    fontSize: 11,
    lineHeight: 1.55,
    marginTop: 8,
  },
});
