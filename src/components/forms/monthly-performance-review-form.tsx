"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { saveMonthlyPerformanceReviewAction } from "@/actions/performance-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { CircularKpiMeter } from "@/components/admin/circular-kpi-meter";
import { MetricProgressBar } from "@/components/admin/metric-progress-bar";
import { PerformanceGradeBadge } from "@/components/admin/status-badges";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateFinalPerformanceScore, gradePerformanceScore } from "@/lib/performance";
import type { MonthlyEmployeePerformanceCard } from "@/lib/types";

export function MonthlyPerformanceReviewForm({
  cycleId,
  employee,
}: {
  cycleId: string;
  employee: MonthlyEmployeePerformanceCard;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveMonthlyPerformanceReviewAction,
    EMPTY_ACTION_STATE,
  );
  const [managerScore, setManagerScore] = useState(
    employee.review?.managerScorePercent ?? employee.systemScore,
  );
  const [managerNotes, setManagerNotes] = useState(
    employee.review?.managerNotes ?? "",
  );
  const [recommendation, setRecommendation] = useState(
    employee.review?.recommendation ?? "",
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  const finalScore = useMemo(
    () =>
      employee.review?.finalScorePercent ??
      calculateFinalPerformanceScore({
        systemScore: employee.systemScore,
        managerScore,
      }),
    [employee.review?.finalScorePercent, employee.systemScore, managerScore],
  );
  const finalGrade = employee.review?.grade ?? gradePerformanceScore(finalScore);
  const isReadOnly = employee.review?.status === "FINALIZED";

  return (
    <form action={formAction} className="space-y-5">
      {employee.review ? (
        <input type="hidden" name="reviewId" value={employee.review.id} />
      ) : null}
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="employeeUserId" value={employee.userId} />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <CircularKpiMeter
            label="System Score"
            value={employee.systemScore}
            tone="purple"
          />
          <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-5 shadow-[0_20px_50px_rgba(17,17,17,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Final Monthly Score
            </p>
            <p className="mt-3 text-4xl font-semibold text-[var(--color-ink)]">
              {finalScore.toFixed(2)}%
            </p>
            <div className="mt-4">
              <PerformanceGradeBadge grade={finalGrade} />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Manager Score Input
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Khaled can lightly tune the monthly score without replacing the
                system-generated KPI foundation.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">
              {managerScore.toFixed(0)}%
            </span>
          </div>

          <Input
            type="range"
            min="0"
            max="100"
            step="5"
            name="managerScorePercent"
            value={managerScore}
            onChange={(event) => setManagerScore(Number(event.target.value))}
            disabled={isPending || isReadOnly}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <MetricProgressBar
              label="Completion"
              value={employee.completionRate}
              tone="green"
            />
            <MetricProgressBar
              label="On-time"
              value={employee.onTimeCompletionRate}
              tone="gold"
            />
            <MetricProgressBar
              label="Overdue"
              value={100 - employee.overdueRate}
              tone="red"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Label htmlFor={`monthly-notes-${employee.userId}`}>Manager Notes</Label>
          <Textarea
            id={`monthly-notes-${employee.userId}`}
            name="managerNotes"
            value={managerNotes}
            onChange={(event) => setManagerNotes(event.target.value)}
            placeholder="Capture the strongest operational signals from this monthly cycle."
            disabled={isPending || isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor={`monthly-recommendation-${employee.userId}`}>
            Recommendation
          </Label>
          <Textarea
            id={`monthly-recommendation-${employee.userId}`}
            name="recommendation"
            value={recommendation}
            onChange={(event) => setRecommendation(event.target.value)}
            placeholder="Summarize the management recommendation for the next cycle."
            disabled={isPending || isReadOnly}
          />
        </div>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      {isReadOnly ? (
        <div className="rounded-[24px] border border-[rgba(22,101,52,0.18)] bg-[rgba(245,255,248,0.94)] px-5 py-4 text-sm text-[#166534]">
          This monthly review has been finalized and is now read-only.
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="draft" disabled={isPending}>
            {isPending ? "Saving..." : "Save Monthly Draft"}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="finalize"
            variant="secondary"
            disabled={isPending}
          >
            {isPending ? "Finalizing..." : "Finalize Monthly Review"}
          </Button>
        </div>
      )}
    </form>
  );
}
