"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { saveQuarterlyPerformanceReviewAction } from "@/actions/performance-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MetricProgressBar } from "@/components/admin/metric-progress-bar";
import { CircularKpiMeter } from "@/components/admin/circular-kpi-meter";
import { PerformanceGradeBadge } from "@/components/admin/status-badges";
import { PRIMARY_EVALUATOR_EMAIL } from "@/lib/constants";
import {
  calculateFinalPerformanceScore,
  calculateManagerScore,
  createDefaultPerformanceEntries,
  gradePerformanceScore,
} from "@/lib/performance";
import type {
  PerformanceReviewDetailView,
  TeamPerformanceMemberView,
} from "@/lib/types";

export function QuarterlyPerformanceReviewForm({
  employee,
  year,
  quarter,
  existingReview,
}: {
  employee: TeamPerformanceMemberView;
  year: number;
  quarter: number;
  existingReview?: PerformanceReviewDetailView;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveQuarterlyPerformanceReviewAction,
    EMPTY_ACTION_STATE,
  );
  const [entries, setEntries] = useState(() =>
    existingReview
      ? []
      : createDefaultPerformanceEntries({
          email: employee.email,
          role: employee.role,
        }),
  );
  const [managerComments, setManagerComments] = useState(
    existingReview?.managerComments ?? "",
  );
  const [recommendation, setRecommendation] = useState(
    existingReview?.recommendation ?? "",
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  const roleScorecard = useMemo(
    () =>
      existingReview ? existingReview.roleScorecard : entries,
    [entries, existingReview],
  );
  const managerScore = useMemo(
    () =>
      existingReview
        ? existingReview.managerScorePercent
        : calculateManagerScore(
            roleScorecard.map((entry) => ({
              ...entry,
              weightedScore: Number(
                ((entry.scorePercent / 100) * entry.weightPercent).toFixed(2),
              ),
            })),
          ),
    [existingReview, roleScorecard],
  );
  const finalScore = useMemo(
    () =>
      existingReview
        ? existingReview.finalScorePercent
        : calculateFinalPerformanceScore({
            systemScore: employee.systemScore,
            managerScore,
          }),
    [employee.systemScore, existingReview, managerScore],
  );
  const grade = existingReview?.grade ?? gradePerformanceScore(finalScore);
  const isReadOnly = existingReview?.status === "FINALIZED";

  return (
    <form action={formAction} className="space-y-6">
      {existingReview ? (
        <input type="hidden" name="reviewId" value={existingReview.id} />
      ) : null}
      <input type="hidden" name="employeeUserId" value={employee.userId} />
      <input type="hidden" name="year" value={String(year)} />
      <input type="hidden" name="quarter" value={String(quarter)} />
      <input type="hidden" name="managerScorecard" value={JSON.stringify(roleScorecard)} />

      <div className="grid gap-4 lg:grid-cols-3">
        <CircularKpiMeter label="System Score" value={employee.systemScore} tone="purple" />
        <CircularKpiMeter label="Manager Score" value={managerScore} tone="gold" />
        <div className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white p-5 shadow-[0_20px_50px_rgba(17,17,17,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Final Weighted Score
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            {finalScore.toFixed(2)}%
          </p>
          <div className="mt-4">
            <PerformanceGradeBadge grade={grade} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricProgressBar label="Completion Rate" value={employee.completionRate} tone="green" />
        <MetricProgressBar label="On-Time Completion" value={employee.onTimeCompletionRate} tone="purple" />
        <MetricProgressBar label="Overdue Exposure" value={100 - employee.overdueRate} tone="gold" />
      </div>

      <div className="space-y-4 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Manager Scorecard
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Khaled contributes 30% of the final quarterly score through this weighted scorecard.
          </p>
        </div>

        <div className="space-y-4">
          {roleScorecard.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-[22px] border border-[var(--color-border)] bg-white p-4"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Weight {entry.weightPercent}%
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`criterion-${entry.id}`}>Score %</Label>
                    <span className="text-sm font-semibold text-[var(--color-primary)]">
                      {entry.scorePercent}%
                    </span>
                  </div>
                  <Input
                    id={`criterion-${entry.id}`}
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="mt-3 h-1.5 w-full cursor-pointer accent-[var(--color-primary)]"
                    value={entry.scorePercent}
                    onChange={(event) =>
                      setEntries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                scorePercent: Number(event.target.value),
                                weightedScore: Number(
                                  (
                                    (Number(event.target.value) / 100) *
                                    item.weightPercent
                                  ).toFixed(2),
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    disabled={isPending || isReadOnly}
                  />
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    Weighted contribution: {(
                      (entry.scorePercent / 100) *
                      entry.weightPercent
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
              <Textarea
                className="mt-4"
                value={entry.notes}
                onChange={(event) =>
                  setEntries((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, notes: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Manager notes for this capability area"
                disabled={isPending || isReadOnly}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label htmlFor="manager-comments">Manager Comments</Label>
          <Textarea
            id="manager-comments"
            name="managerComments"
            value={managerComments}
            onChange={(event) => setManagerComments(event.target.value)}
            disabled={isPending || isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="recommendation">Recommendation</Label>
          <Textarea
            id="recommendation"
            name="recommendation"
            value={recommendation}
            onChange={(event) => setRecommendation(event.target.value)}
            disabled={isPending || isReadOnly}
          />
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(49,19,71,0.12)] bg-[rgba(49,19,71,0.04)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Recipient Preview
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Finalized employee evaluations are visible only to the evaluated team
          member and Khaled as the evaluator. No other employee will receive
          this review.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            Employee: {employee.email}
          </span>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            Evaluator: {PRIMARY_EVALUATOR_EMAIL}
          </span>
        </div>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      {isReadOnly ? (
        <div className="rounded-[24px] border border-[rgba(22,101,52,0.18)] bg-[rgba(245,255,248,0.94)] px-5 py-4 text-sm text-[#166534]">
          This quarterly review has been finalized and is now read-only.
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="draft" disabled={isPending}>
            {isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="finalize"
            variant="secondary"
            disabled={isPending}
          >
            {isPending ? "Finalizing..." : "Finalize Review"}
          </Button>
        </div>
      )}
    </form>
  );
}
