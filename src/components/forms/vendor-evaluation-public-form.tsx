"use client";

import { useActionState } from "react";

import { submitVendorEvaluationByTokenAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { PublicDecisionState } from "@/components/public/public-decision-state";
import { VendorScorecardFields } from "@/components/forms/vendor-scorecard-fields";
import type { VendorEvaluationEvaluatorRole } from "@prisma/client";

export function VendorEvaluationPublicForm({
  token,
  evaluatorRole,
}: {
  token: string;
  evaluatorRole: VendorEvaluationEvaluatorRole;
}) {
  const [state, formAction, isPending] = useActionState(
    submitVendorEvaluationByTokenAction,
    EMPTY_ACTION_STATE,
  );

  if (state.completionState === "submitted") {
    return (
      <PublicDecisionState
        title="Evaluation submitted successfully"
        body="Your vendor evaluation has been recorded. This request link is now locked and cannot be used again."
      />
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <VendorScorecardFields
        role={evaluatorRole}
        state={state}
        isPending={isPending}
        hiddenFields={[
          {
            name: "token",
            value: token,
          },
        ]}
        submitLabel="Submit Evaluation"
        submitPendingLabel="Submitting..."
      />
    </form>
  );
}
