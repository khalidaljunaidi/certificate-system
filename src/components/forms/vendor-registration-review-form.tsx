"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { reviewVendorRegistrationAction } from "@/actions/vendor-registration-actions";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function VendorRegistrationReviewForm({
  requestId,
  pending,
}: {
  requestId: string;
  pending: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    reviewVendorRegistrationAction,
    EMPTY_ACTION_STATE,
  );
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <div>
        <Label htmlFor="decision">Decision</Label>
        <Select
          id="decision"
          name="decision"
          value={decision}
          onChange={(event) =>
            setDecision(event.target.value === "REJECT" ? "REJECT" : "APPROVE")
          }
          disabled={isPending || !pending}
        >
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="rejectionReason">
          Rejection Reason {decision === "REJECT" ? "*" : "(optional)"}
        </Label>
        <Textarea
          id="rejectionReason"
          name="rejectionReason"
          rows={5}
          disabled={isPending || !pending || decision !== "REJECT"}
          required={decision === "REJECT"}
          placeholder="Explain why the vendor registration was rejected."
        />
      </div>

      <FormStateMessage state={state} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending || !pending}>
          {isPending ? "Saving..." : decision === "REJECT" ? "Reject Request" : "Approve Request"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.refresh()}
          disabled={isPending}
        >
          Refresh
        </Button>
      </div>
    </form>
  );
}
