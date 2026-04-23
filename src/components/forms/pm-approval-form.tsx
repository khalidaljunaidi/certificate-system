"use client";

import { useActionState } from "react";

import { submitPmDecisionAction } from "@/actions/pm-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { PublicDecisionState } from "@/components/public/public-decision-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PmApprovalForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    submitPmDecisionAction,
    EMPTY_ACTION_STATE,
  );

  if (state.decisionStatus === "approved") {
    return (
      <PublicDecisionState
        title="Certificate approved successfully"
        body="Your approval has been recorded. Procurement has been notified to continue the issuance workflow."
      />
    );
  }

  if (state.decisionStatus === "rejected") {
    return (
      <PublicDecisionState
        title="Certificate rejected and returned"
        body="Your rejection has been recorded. Procurement has been notified to review the certificate and your notes."
      />
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="pmName">Full Name</Label>
        <Input id="pmName" name="pmName" required />
      </div>
      <div>
        <Label htmlFor="pmTitle">Title</Label>
        <Input id="pmTitle" name="pmTitle" required />
      </div>
      <div>
        <Label htmlFor="approvalNotes">Notes</Label>
        <Textarea
          id="approvalNotes"
          name="approvalNotes"
          placeholder="Optional for approval, required for rejection."
        />
      </div>
      <FormStateMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="approve" disabled={isPending}>
          Approve Completion
        </Button>
        <Button
          type="submit"
          name="intent"
          value="reject"
          variant="destructive"
          disabled={isPending}
        >
          Reject and Return
        </Button>
      </div>
    </form>
  );
}
