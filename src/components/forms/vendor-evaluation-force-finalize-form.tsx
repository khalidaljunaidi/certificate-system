"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { forceFinalizeVendorEvaluationCycleAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { VendorScorecardFields } from "@/components/forms/vendor-scorecard-fields";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VendorEvaluationForceFinalizeForm({
  vendorId,
  cycleId,
}: {
  vendorId: string;
  cycleId: string;
}) {
  const router = useRouter();
  const handledRedirectRef = useRef(false);
  const [state, formAction, isPending] = useActionState(
    forceFinalizeVendorEvaluationCycleAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (!state.redirectTo || handledRedirectRef.current) {
      return;
    }

    handledRedirectRef.current = true;
    router.replace(state.redirectTo, { scroll: false });
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      <VendorScorecardFields
        role="PROCUREMENT"
        state={state}
        isPending={isPending}
        hiddenFields={[
          {
            name: "vendorId",
            value: vendorId,
          },
          {
            name: "cycleId",
            value: cycleId,
          },
        ]}
        submitLabel="Force Finalize Evaluation"
        submitPendingLabel="Finalizing..."
        includeEvaluatorName={false}
        beforeSubmitContent={
          <div className="space-y-4 rounded-[22px] border border-[rgba(215,132,57,0.24)] bg-[rgba(215,132,57,0.08)] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Executive override
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                Khaled can force-finalize this evaluation when the workflow is
                blocked. The action is audited and immediately notifies the
                relevant stakeholders.
              </p>
            </div>
            <div>
              <Label htmlFor={`overrideReason-${cycleId}`}>Override Reason</Label>
              <Textarea
                id={`overrideReason-${cycleId}`}
                name="overrideReason"
                placeholder="Explain why this evaluation needs to be finalized now."
                required
                minLength={10}
                disabled={isPending}
              />
            </div>
          </div>
        }
      />
    </form>
  );
}
