import type {
  VendorEvaluationEvaluatorRole,
  VendorEvaluationGrade,
} from "@prisma/client";

export const MAX_VENDOR_EVALUATION_SCORE = 5;

export type VendorScorecardCriterion = {
  id: string;
  label: string;
  description: string;
  weightPercent: number;
};

export type VendorScorecardEntry = {
  criterionId: string;
  criterionLabel: string;
  weightPercent: number;
  scoreValue: number;
  weightedScore: number;
  notes: string;
};

const SHARED_VENDOR_SCORECARD_TEMPLATE: VendorScorecardCriterion[] = [
  {
    id: "delivery-quality",
    label: "Delivery Quality",
    description:
      "Measures how consistently the vendor delivered complete, accurate, and high-quality work outputs.",
    weightPercent: 25,
  },
  {
    id: "schedule-discipline",
    label: "Schedule Discipline",
    description:
      "Measures timeliness, responsiveness to milestones, and the ability to recover from delivery pressure.",
    weightPercent: 20,
  },
  {
    id: "commercial-compliance",
    label: "Commercial Compliance",
    description:
      "Measures adherence to contractual terms, commercial discipline, and documentation quality.",
    weightPercent: 20,
  },
  {
    id: "communication",
    label: "Communication & Collaboration",
    description:
      "Measures clarity, professionalism, stakeholder management, and issue escalation behavior.",
    weightPercent: 15,
  },
  {
    id: "hse-risk",
    label: "HSE / Risk Management",
    description:
      "Measures compliance, risk awareness, and the ability to maintain safe and controlled delivery practices.",
    weightPercent: 20,
  },
];

export function getVendorScorecardTemplate(
  role: VendorEvaluationEvaluatorRole,
) {
  void role;
  return SHARED_VENDOR_SCORECARD_TEMPLATE;
}

export function clampVendorScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_VENDOR_EVALUATION_SCORE, Math.max(0, Math.round(value)));
}

export function calculateWeightedScore(scoreValue: number, weightPercent: number) {
  return Number(
    ((clampVendorScore(scoreValue) / MAX_VENDOR_EVALUATION_SCORE) * weightPercent).toFixed(
      2,
    ),
  );
}

export function calculateVendorScorecardProgress(entries: VendorScorecardEntry[]) {
  if (entries.length === 0) {
    return 0;
  }

  const completedCount = entries.filter((entry) => entry.scoreValue > 0).length;
  return Number(((completedCount / entries.length) * 100).toFixed(2));
}

export function calculateVendorScorecardTotal(entries: VendorScorecardEntry[]) {
  return Number(
    entries.reduce((total, entry) => total + entry.weightedScore, 0).toFixed(2),
  );
}

export function gradeFromVendorScore(scorePercent: number): VendorEvaluationGrade {
  if (scorePercent >= 90) {
    return "A";
  }

  if (scorePercent >= 80) {
    return "B";
  }

  if (scorePercent >= 70) {
    return "C";
  }

  return "D";
}

export function createDefaultVendorScorecardEntries(
  role: VendorEvaluationEvaluatorRole,
): VendorScorecardEntry[] {
  return getVendorScorecardTemplate(role).map((criterion) => ({
    criterionId: criterion.id,
    criterionLabel: criterion.label,
    weightPercent: criterion.weightPercent,
    scoreValue: 0,
    weightedScore: 0,
    notes: "",
  }));
}

export function sanitizeVendorScorecardEntries(input: unknown): VendorScorecardEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("The evaluation scorecard payload is invalid.");
  }

  const criteriaById = new Map(
    SHARED_VENDOR_SCORECARD_TEMPLATE.map((criterion) => [criterion.id, criterion]),
  );

  return input.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("criterionId" in entry) ||
      typeof entry.criterionId !== "string"
    ) {
      throw new Error("The evaluation scorecard payload is invalid.");
    }

    const criterion = criteriaById.get(entry.criterionId);

    if (!criterion) {
      throw new Error("The evaluation scorecard contains an unknown criterion.");
    }

    const scoreValue = clampVendorScore(
      Number("scoreValue" in entry ? entry.scoreValue : 0),
    );
    const notes =
      "notes" in entry && typeof entry.notes === "string" ? entry.notes.trim() : "";

    return {
      criterionId: criterion.id,
      criterionLabel: criterion.label,
      weightPercent: criterion.weightPercent,
      scoreValue,
      weightedScore: calculateWeightedScore(scoreValue, criterion.weightPercent),
      notes,
    };
  });
}
