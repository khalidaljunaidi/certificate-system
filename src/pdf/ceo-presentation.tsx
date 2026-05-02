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

const COLORS = {
  dark: "#05030A",
  panel: "#10081C",
  panelSoft: "#171024",
  purple: "#1B0D2F",
  gold: "#D4AF37",
  goldSoft: "#E8CA74",
  white: "#FFFFFF",
  muted: "#B9B1C8",
  line: "#4A355F",
} as const;

const SCREENSHOT_ROOT = path.join(
  process.cwd(),
  "artifacts",
  "ceo-presentation",
  "screenshots",
);
const LOGO_FILE_PATH = path.join(process.cwd(), "public", "logo.png");

type ScreenshotName =
  | "landing.png"
  | "supplier-registration.png"
  | "dashboard.png"
  | "projects.png"
  | "vendors.png"
  | "vendor-detail.png"
  | "payments.png"
  | "payment-detail.png";

type SlideDefinition = {
  label: string;
  title: string;
  support?: string;
  screenshot?: ScreenshotName;
  variant?:
    | "cover"
    | "title"
    | "proof"
    | "comparison"
    | "flow"
    | "performance"
    | "value"
    | "closing";
};

let pdfConfigured = false;

function configurePdfRendering() {
  if (pdfConfigured) {
    return;
  }

  Font.registerHyphenationCallback((word) => [word]);
  pdfConfigured = true;
}

function toDataUri(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const extension = path.extname(filePath).slice(1).toLowerCase() || "png";
  const mimeType = extension === "jpg" || extension === "jpeg" ? "jpeg" : "png";

  return `data:image/${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function getScreenshotDataUri(fileName: ScreenshotName) {
  return toDataUri(path.join(SCREENSHOT_ROOT, fileName));
}

function getLogoDataUri() {
  return toDataUri(LOGO_FILE_PATH);
}

const slides: SlideDefinition[] = [
  {
    label: "Title",
    title: "TG Gate",
    support: "The Execution Layer for Procurement & Vendor Operations",
    screenshot: "landing.png",
    variant: "cover",
  },
  {
    label: "Problem",
    title: "Execution is the bottleneck.",
    support: "Not procurement policy. Not finance records. Execution.",
    screenshot: "dashboard.png",
    variant: "proof",
  },
  {
    label: "Gap",
    title: "Systems exist. Work still waits.",
    support: "The missing layer is ownership, timing, and follow-through.",
    screenshot: "projects.png",
    variant: "proof",
  },
  {
    label: "Solution",
    title: "Not another system.",
    support: "A focused execution layer above the systems already in place.",
    screenshot: "landing.png",
    variant: "proof",
  },
  {
    label: "Odoo vs TG Gate",
    title: "Financial core meets execution control.",
    support: "Odoo records the truth. TG Gate drives the work.",
    variant: "comparison",
  },
  {
    label: "Flow",
    title: "Vendor to payment, connected.",
    support: "Every step has a status, owner, and audit trail.",
    screenshot: "payment-detail.png",
    variant: "flow",
  },
  {
    label: "Performance",
    title: "From waiting to instant control.",
    support: "Before: 9-15s. After: <1s.",
    variant: "performance",
  },
  {
    label: "Thread",
    title: "Everything stays connected.",
    support: "Vendor, documents, assignments, payments, and approvals in one context.",
    screenshot: "vendor-detail.png",
    variant: "proof",
  },
  {
    label: "Intelligence",
    title: "Track less. Know more.",
    support: "Exposure, progress, delays, and ownership surface automatically.",
    screenshot: "payments.png",
    variant: "proof",
  },
  {
    label: "Governance",
    title: "Who approved. Who executed. When.",
    support: "Auditability becomes part of the workflow.",
    screenshot: "payment-detail.png",
    variant: "proof",
  },
  {
    label: "Vendor",
    title: "Better vendors start at onboarding.",
    support: "Registration, documents, taxonomy, approval, and verification are controlled.",
    screenshot: "supplier-registration.png",
    variant: "proof",
  },
  {
    label: "Impact",
    title: "Leadership sees work moving.",
    support: "Projects, vendors, tasks, certificates, and payments become measurable.",
    screenshot: "vendors.png",
    variant: "proof",
  },
  {
    label: "Value",
    title: "Time saved is money saved.",
    support: "Control is profit protected.",
    variant: "value",
  },
  {
    label: "Model",
    title: "Odoo manages money.",
    support: "TG Gate manages execution.",
    screenshot: "payments.png",
    variant: "proof",
  },
  {
    label: "Closing",
    title: "We built control.",
    support: "A faster, smarter, governed procurement operation.",
    variant: "closing",
  },
];

const styles = StyleSheet.create({
  page: {
    position: "relative",
    width: "100%",
    height: "100%",
    padding: 38,
    backgroundColor: COLORS.dark,
    color: COLORS.white,
    fontFamily: "Helvetica",
  },
  frame: {
    position: "absolute",
    top: 18,
    right: 18,
    bottom: 18,
    left: 18,
    borderWidth: 1,
    borderColor: "#3C2B52",
  },
  header: {
    position: "absolute",
    top: 32,
    left: 38,
    right: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandLogo: {
    width: 34,
    height: 34,
    objectFit: "contain",
    marginRight: 10,
  },
  brandText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  slideNumber: {
    color: "#837492",
    fontSize: 9,
    letterSpacing: 1.6,
  },
  content: {
    position: "relative",
    zIndex: 2,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 38,
  },
  contentCenter: {
    position: "relative",
    zIndex: 2,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingTop: 28,
    textAlign: "center",
  },
  coverLogo: {
    width: 260,
    maxHeight: 140,
    objectFit: "contain",
    marginBottom: 30,
  },
  coverTitle: {
    color: COLORS.white,
    fontSize: 64,
    fontWeight: 700,
    lineHeight: 0.95,
    textAlign: "center",
  },
  coverSupport: {
    color: COLORS.goldSoft,
    fontSize: 20,
    lineHeight: 1.25,
    marginTop: 18,
    textAlign: "center",
  },
  coverFooter: {
    position: "absolute",
    bottom: 54,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  copy: {
    width: "45%",
    paddingRight: 30,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  kickerLine: {
    width: 34,
    height: 1,
    marginRight: 10,
    backgroundColor: COLORS.gold,
  },
  kicker: {
    color: COLORS.goldSoft,
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    color: COLORS.white,
    fontSize: 44,
    fontWeight: 700,
    lineHeight: 1.02,
  },
  titleCenter: {
    color: COLORS.white,
    fontSize: 58,
    fontWeight: 700,
    lineHeight: 1,
    textAlign: "center",
  },
  support: {
    color: COLORS.muted,
    fontSize: 18,
    lineHeight: 1.35,
    marginTop: 18,
  },
  supportCenter: {
    color: COLORS.muted,
    fontSize: 20,
    lineHeight: 1.28,
    marginTop: 18,
    textAlign: "center",
  },
  goldRule: {
    width: 170,
    height: 2,
    marginTop: 24,
    backgroundColor: COLORS.gold,
  },
  goldRuleCenter: {
    width: 210,
    height: 2,
    marginTop: 24,
    backgroundColor: COLORS.gold,
  },
  proof: {
    width: "55%",
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.panel,
    padding: 8,
  },
  proofImage: {
    width: "100%",
    height: 278,
    objectFit: "cover",
  },
  proofPlaceholder: {
    width: "100%",
    height: 278,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.panelSoft,
  },
  proofPlaceholderText: {
    color: COLORS.goldSoft,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  proofLabel: {
    color: COLORS.goldSoft,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    marginTop: 8,
    textTransform: "uppercase",
  },
  compareWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 34,
  },
  compareCard: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.panel,
    padding: 24,
  },
  comparePlus: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: 700,
  },
  compareTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: 700,
  },
  compareTitleGold: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: 700,
  },
  compareText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 1.4,
    marginTop: 14,
  },
  flowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
  },
  flowPill: {
    minWidth: 82,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 8,
    paddingHorizontal: 13,
    marginRight: 8,
    marginBottom: 8,
  },
  flowText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
  },
  metricWrap: {
    width: "100%",
    flexDirection: "row",
    marginTop: 34,
  },
  metricCard: {
    flex: 1,
    minHeight: 176,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.panel,
    padding: 24,
    marginHorizontal: 9,
  },
  metricCardGold: {
    flex: 1,
    minHeight: 176,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.panel,
    padding: 24,
    marginHorizontal: 9,
  },
  metricLabel: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 700,
  },
  metricLabelGold: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: 700,
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 70,
    fontWeight: 700,
    marginTop: 20,
  },
  metricValueGold: {
    color: COLORS.gold,
    fontSize: 70,
    fontWeight: 700,
    marginTop: 20,
  },
  metricNote: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 1.35,
    marginTop: 12,
  },
  valueWrap: {
    width: "100%",
    flexDirection: "row",
    marginTop: 38,
  },
  valueCard: {
    flex: 1,
    minHeight: 126,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.panel,
    padding: 22,
    marginHorizontal: 9,
  },
  valueCardGold: {
    flex: 1,
    minHeight: 126,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.panel,
    padding: 22,
    marginHorizontal: 9,
  },
  valueNumber: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 18,
  },
  valueTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.15,
  },
  valueText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 1.35,
    marginTop: 8,
  },
  closingLogo: {
    width: 340,
    maxHeight: 182,
    objectFit: "contain",
    marginBottom: 32,
  },
  closingSupport: {
    color: COLORS.goldSoft,
    fontSize: 20,
    lineHeight: 1.25,
    marginTop: 18,
    textAlign: "center",
  },
});

function SlideShell({
  children,
  slide,
  index,
  logoDataUri,
}: {
  children: ReactNode;
  slide: SlideDefinition;
  index: number;
  logoDataUri: string | null;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.frame} fixed />
      <View style={styles.header} fixed>
        <View style={styles.brand}>
          {logoDataUri ? <Image src={logoDataUri} style={styles.brandLogo} /> : null}
          <Text style={styles.brandText}>TG Gate</Text>
        </View>
        <Text style={styles.slideNumber}>
          {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </Text>
      </View>
      {children}
      <Text
        fixed
        style={{
          position: "absolute",
          right: 38,
          bottom: 28,
          color: "#6D5F78",
          fontSize: 8,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {slide.label}
      </Text>
    </Page>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <View style={styles.kickerRow}>
      <View style={styles.kickerLine} />
      <Text style={styles.kicker}>{children}</Text>
    </View>
  );
}

function ScreenshotFrame({ fileName, label }: { fileName: ScreenshotName; label: string }) {
  const screenshotDataUri = getScreenshotDataUri(fileName);

  return (
    <View style={styles.proof}>
      {screenshotDataUri ? (
        <Image src={screenshotDataUri} style={styles.proofImage} />
      ) : (
        <View style={styles.proofPlaceholder}>
          <Text style={styles.proofPlaceholderText}>Screenshot missing: {fileName}</Text>
        </View>
      )}
      <Text style={styles.proofLabel}>{label}</Text>
    </View>
  );
}

function CoverSlide({ slide, logoDataUri }: { slide: SlideDefinition; logoDataUri: string | null }) {
  return (
    <View style={styles.contentCenter}>
      {logoDataUri ? <Image src={logoDataUri} style={styles.coverLogo} /> : null}
      <Text style={styles.coverTitle}>{slide.title}</Text>
      {slide.support ? <Text style={styles.coverSupport}>{slide.support}</Text> : null}
      <View style={styles.goldRuleCenter} />
      <Text style={styles.coverFooter}>Executive Review</Text>
    </View>
  );
}

function TitleSlide({ slide }: { slide: SlideDefinition }) {
  return (
    <View style={styles.contentCenter}>
      <Kicker>{slide.label}</Kicker>
      <Text style={styles.titleCenter}>{slide.title}</Text>
      {slide.support ? <Text style={styles.supportCenter}>{slide.support}</Text> : null}
      <View style={styles.goldRuleCenter} />
    </View>
  );
}

function ValueSlide({ slide }: { slide: SlideDefinition }) {
  const values = [
    {
      title: "Faster decisions",
      text: "Leadership sees status, ownership, and blockers without waiting.",
    },
    {
      title: "Reduced operational risk",
      text: "Approvals, actions, and payment movement stay governed and auditable.",
    },
    {
      title: "Better cost control",
      text: "Finance exposure, PO value, and remaining commitments stay visible.",
    },
  ];

  return (
    <View style={styles.contentCenter}>
      <Kicker>{slide.label}</Kicker>
      <Text style={styles.titleCenter}>{slide.title}</Text>
      {slide.support ? <Text style={styles.supportCenter}>{slide.support}</Text> : null}
      <View style={styles.valueWrap}>
        {values.map((value, index) => (
          <View
            key={value.title}
            style={index === 1 ? styles.valueCardGold : styles.valueCard}
          >
            <Text style={styles.valueNumber}>0{index + 1}</Text>
            <Text style={styles.valueTitle}>{value.title}</Text>
            <Text style={styles.valueText}>{value.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProofSlide({ slide }: { slide: SlideDefinition }) {
  return (
    <View style={styles.content}>
      <View style={styles.copy}>
        <Kicker>{slide.label}</Kicker>
        <Text style={styles.title}>{slide.title}</Text>
        {slide.support ? <Text style={styles.support}>{slide.support}</Text> : null}
        <View style={styles.goldRule} />
      </View>
      {slide.screenshot ? (
        <ScreenshotFrame fileName={slide.screenshot} label={`${slide.label} proof`} />
      ) : null}
    </View>
  );
}

function ComparisonSlide({ slide }: { slide: SlideDefinition }) {
  return (
    <View style={styles.contentCenter}>
      <Kicker>{slide.label}</Kicker>
      <Text style={styles.titleCenter}>{slide.title}</Text>
      {slide.support ? <Text style={styles.supportCenter}>{slide.support}</Text> : null}
      <View style={styles.compareWrap}>
        <View style={styles.compareCard}>
          <Text style={styles.compareTitle}>Odoo</Text>
          <Text style={styles.compareText}>
            Manages money, accounting records, invoices, and financial truth.
          </Text>
        </View>
        <Text style={styles.comparePlus}>+</Text>
        <View style={styles.compareCard}>
          <Text style={styles.compareTitleGold}>TG Gate</Text>
          <Text style={styles.compareText}>
            Manages vendors, actions, status, accountability, and speed.
          </Text>
        </View>
      </View>
    </View>
  );
}

function FlowSlide({ slide }: { slide: SlideDefinition }) {
  const steps = ["Vendor", "Invoice", "Odoo", "Payment", "Status"];

  return (
    <View style={styles.content}>
      <View style={styles.copy}>
        <Kicker>{slide.label}</Kicker>
        <Text style={styles.title}>{slide.title}</Text>
        {slide.support ? <Text style={styles.support}>{slide.support}</Text> : null}
        <View style={styles.flowWrap}>
          {steps.map((step) => (
            <View key={step} style={styles.flowPill}>
              <Text style={styles.flowText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
      {slide.screenshot ? (
        <ScreenshotFrame fileName={slide.screenshot} label="Payment workflow" />
      ) : null}
    </View>
  );
}

function PerformanceSlide({ slide }: { slide: SlideDefinition }) {
  return (
    <View style={styles.contentCenter}>
      <Kicker>{slide.label}</Kicker>
      <Text style={styles.titleCenter}>{slide.title}</Text>
      {slide.support ? <Text style={styles.supportCenter}>{slide.support}</Text> : null}
      <View style={styles.metricWrap}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Before</Text>
          <Text style={styles.metricValue}>9-15s</Text>
          <Text style={styles.metricNote}>Slow detail pages and manual context switching.</Text>
        </View>
        <View style={styles.metricCardGold}>
          <Text style={styles.metricLabelGold}>After</Text>
          <Text style={styles.metricValueGold}>{"<1s"}</Text>
          <Text style={styles.metricNote}>Fast workflows and on-demand heavy actions.</Text>
        </View>
      </View>
    </View>
  );
}

function ClosingSlide({ slide, logoDataUri }: { slide: SlideDefinition; logoDataUri: string | null }) {
  return (
    <View style={styles.contentCenter}>
      {logoDataUri ? <Image src={logoDataUri} style={styles.closingLogo} /> : null}
      <Text style={styles.titleCenter}>{slide.title}</Text>
      {slide.support ? <Text style={styles.closingSupport}>{slide.support}</Text> : null}
      <View style={styles.goldRuleCenter} />
    </View>
  );
}

function renderSlide(slide: SlideDefinition, logoDataUri: string | null) {
  switch (slide.variant) {
    case "cover":
      return <CoverSlide slide={slide} logoDataUri={logoDataUri} />;
    case "comparison":
      return <ComparisonSlide slide={slide} />;
    case "flow":
      return <FlowSlide slide={slide} />;
    case "performance":
      return <PerformanceSlide slide={slide} />;
    case "value":
      return <ValueSlide slide={slide} />;
    case "closing":
      return <ClosingSlide slide={slide} logoDataUri={logoDataUri} />;
    case "title":
      return <TitleSlide slide={slide} />;
    case "proof":
    default:
      return <ProofSlide slide={slide} />;
  }
}

export function CeoPresentationDocument() {
  configurePdfRendering();
  const logoDataUri = getLogoDataUri();

  return (
    <Document
      title="TG Gate CEO Presentation"
      author="THE GATHERING KSA"
      subject="Executive procurement operations presentation"
      creator="TG Gate"
      producer="TG Gate"
    >
      {slides.map((slide, index) => (
        <SlideShell
          key={`${slide.label}-${index}`}
          slide={slide}
          index={index}
          logoDataUri={logoDataUri}
        >
          {renderSlide(slide, logoDataUri)}
        </SlideShell>
      ))}
    </Document>
  );
}
