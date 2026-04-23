"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { VendorEvaluationEvaluatorRole } from "@prisma/client";

import { FormStateMessage } from "@/components/forms/form-state-message";
import { VendorEvaluationGradeBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/types";
import {
  calculateVendorScorecardProgress,
  calculateVendorScorecardTotal,
  calculateWeightedScore,
  clampVendorScore,
  createDefaultVendorScorecardEntries,
  gradeFromVendorScore,
  getVendorScorecardTemplate,
} from "@/lib/vendor-scorecard";
import { VENDOR_EVALUATION_ROLE_LABELS } from "@/lib/constants";

type HiddenField = {
  name: string;
  value: string;
};

export function VendorScorecardFields({
  role,
  state,
  isPending,
  hiddenFields,
  submitLabel,
  submitPendingLabel,
  includeEvaluatorName = true,
  beforeSubmitContent,
}: {
  role: VendorEvaluationEvaluatorRole;
  state: ActionState;
  isPending: boolean;
  hiddenFields: HiddenField[];
  submitLabel: string;
  submitPendingLabel: string;
  includeEvaluatorName?: boolean;
  beforeSubmitContent?: ReactNode;
}) {
  const template = useMemo(() => getVendorScorecardTemplate(role), [role]);
  const [entries, setEntries] = useState(createDefaultVendorScorecardEntries(role));

  const totalScorePercent = useMemo(
    () => calculateVendorScorecardTotal(entries),
    [entries],
  );
  const completionProgress = useMemo(
    () => calculateVendorScorecardProgress(entries),
    [entries],
  );
  const finalGrade = useMemo(
    () => gradeFromVendorScore(totalScorePercent),
    [totalScorePercent],
  );

  function updateEntry(
    criterionId: string,
    patch: Partial<(typeof entries)[number]>,
  ) {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.criterionId !== criterionId) {
          return entry;
        }

        const nextScoreValue =
          patch.scoreValue === undefined
            ? entry.scoreValue
            : clampVendorScore(patch.scoreValue);

        return {
          ...entry,
          ...patch,
          scoreValue: nextScoreValue,
          weightedScore: calculateWeightedScore(nextScoreValue, entry.weightPercent),
        };
      }),
    );
  }

  return (
    <>
      {hiddenFields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <input
        type="hidden"
        name="criteriaSnapshot"
        value={JSON.stringify(entries)}
        readOnly
      />
      <input
        type="hidden"
        name="totalScorePercent"
        value={totalScorePercent.toFixed(2)}
        readOnly
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <ScorecardMetric
          label="Total Score"
          value={`${totalScorePercent.toFixed(2)}%`}
        />
        <ScorecardMetric
          label="Completion"
          value={`${completionProgress.toFixed(0)}%`}
        />
        <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Final Grade
          </p>
          <div className="mt-3">
            <VendorEvaluationGradeBadge grade={finalGrade} />
          </div>
        </div>
        <ScorecardMetric
          label="Evaluation Status"
          value={completionProgress === 100 ? "Ready to submit" : "In progress"}
        />
      </div>

      <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Weighted Scorecard
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {VENDOR_EVALUATION_ROLE_LABELS[role]} scoring against the shared
              vendor governance criteria.
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">
            {totalScorePercent.toFixed(2)}%
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[rgba(49,19,71,0.08)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-accent)_100%)] transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, totalScorePercent))}%` }}
          />
        </div>

        <div className="mt-6 space-y-4">
          {entries.map((entry, index) => {
            const criterion = template[index];

            return (
              <div
                key={entry.criterionId}
                className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5"
              >
                <div className="grid gap-4 xl:grid-cols-[1.4fr_140px_220px_140px] xl:items-start">
                  <div>
                    <p className="text-base font-semibold text-[var(--color-ink)]">
                      {criterion.label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                      {criterion.description}
                    </p>
                  </div>

                  <ScorecardMetric
                    label="Weight"
                    value={`${entry.weightPercent}%`}
                    compact
                  />

                  <div className="rounded-[20px] border border-[var(--color-border)] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Score
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateEntry(entry.criterionId, {
                            scoreValue: entry.scoreValue - 1,
                          })
                        }
                        disabled={isPending}
                      >
                        -
                      </Button>
                      <div className="min-w-[70px] rounded-full bg-[var(--color-panel-soft)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-ink)]">
                        {entry.scoreValue} / 5
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          updateEntry(entry.criterionId, {
                            scoreValue: entry.scoreValue + 1,
                          })
                        }
                        disabled={isPending}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <ScorecardMetric
                    label="Weighted Score"
                    value={`${entry.weightedScore.toFixed(2)}%`}
                    compact
                  />
                </div>

                <div className="mt-4">
                  <Label htmlFor={`criterion-note-${entry.criterionId}`}>
                    Criterion Notes
                  </Label>
                  <Textarea
                    id={`criterion-note-${entry.criterionId}`}
                    value={entry.notes}
                    onChange={(event) =>
                      updateEntry(entry.criterionId, {
                        notes: event.target.value,
                      })
                    }
                    placeholder="Add concise notes for this criterion."
                    disabled={isPending}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {includeEvaluatorName ? (
          <div>
            <Label htmlFor="evaluatorName">Evaluator Name</Label>
            <Input
              id="evaluatorName"
              name="evaluatorName"
              required
              disabled={isPending}
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="recommendation">Recommendation</Label>
          <Input
            id="recommendation"
            name="recommendation"
            placeholder="Preferred supplier / Monitor / Corrective action required"
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="summary">Executive Summary</Label>
        <Textarea
          id="summary"
          name="summary"
          placeholder="Summarize the overall vendor performance and key leadership takeaway."
          required
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Label htmlFor="strengths">Strengths</Label>
          <Textarea
            id="strengths"
            name="strengths"
            placeholder="Capture the strongest capabilities and differentiators."
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="concerns">Weaknesses</Label>
          <Textarea
            id="concerns"
            name="concerns"
            placeholder="Capture weak performance areas, gaps, or recurring concerns."
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="correctiveActions">Corrective Actions</Label>
        <Textarea
          id="correctiveActions"
          name="correctiveActions"
          placeholder="State the required corrective actions, recovery plan, or follow-up expectations."
          required
          disabled={isPending}
        />
      </div>

      {beforeSubmitContent}

      <FormStateMessage state={state.error ? state : {}} />

      <Button type="submit" disabled={isPending}>
        {isPending ? submitPendingLabel : submitLabel}
      </Button>
    </>
  );
}

function ScorecardMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border border-[var(--color-border)] bg-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 font-semibold text-[var(--color-ink)] ${
          compact ? "text-base" : "text-lg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
