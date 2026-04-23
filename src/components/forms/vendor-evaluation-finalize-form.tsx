"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { finalizeVendorEvaluationCycleAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { VendorScorecardFields } from "@/components/forms/vendor-scorecard-fields";

export function VendorEvaluationFinalizeForm({
  vendorId,
  cycleId,
}: {
  vendorId: string;
  cycleId: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    finalizeVendorEvaluationCycleAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
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
        submitLabel="Finalize Evaluation"
        submitPendingLabel="Finalizing..."
        includeEvaluatorName={false}
      />
    </form>
  );
}
