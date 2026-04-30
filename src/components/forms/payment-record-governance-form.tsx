"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  setPaymentRecordClosedStateAction,
  updatePaymentRecordGovernanceAction,
} from "@/actions/project-payment-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function PaymentRecordGovernanceForm({
  projectVendorId,
  redirectTo,
  financeOwners,
  currentFinanceOwnerUserId,
  paymentNotes,
  currentWorkflowOverrideStatus,
  currentWorkflowOverrideReason,
  closedAt,
  canAssignFinanceOwner,
  canCloseRecord,
  canClosePayment,
}: {
  projectVendorId: string;
  redirectTo: string;
  financeOwners: Array<{
    id: string;
    name: string;
    email: string;
    title: string;
  }>;
  currentFinanceOwnerUserId: string | null;
  paymentNotes: string | null;
  currentWorkflowOverrideStatus: "ON_HOLD" | "DISPUTED" | null;
  currentWorkflowOverrideReason: string | null;
  closedAt: Date | null;
  canAssignFinanceOwner: boolean;
  canCloseRecord: boolean;
  canClosePayment: boolean;
}) {
  const router = useRouter();
  const [governanceState, governanceAction, governancePending] = useActionState(
    updatePaymentRecordGovernanceAction,
    EMPTY_ACTION_STATE,
  );
  const [closeState, closeAction, closePending] = useActionState(
    setPaymentRecordClosedStateAction,
    EMPTY_ACTION_STATE,
  );
  const closeDisabled =
    closePending || (!closedAt && !canClosePayment);
  const closeDisabledReason =
    !closedAt && !canClosePayment
      ? "Payment cannot be closed until all installments are fully paid"
      : undefined;

  useEffect(() => {
    const redirectToTarget = governanceState.redirectTo ?? closeState.redirectTo;

    if (!redirectToTarget) {
      return;
    }

    router.replace(redirectToTarget, { scroll: false });
  }, [closeState.redirectTo, governanceState.redirectTo, router]);

  return (
    <div className="space-y-5">
      <form action={governanceAction} className="space-y-4">
        <input type="hidden" name="projectVendorId" value={projectVendorId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="grid gap-4">
          <div>
            <Label htmlFor="financeOwnerUserId">Finance Owner</Label>
            <Select
              id="financeOwnerUserId"
              name="financeOwnerUserId"
              defaultValue={currentFinanceOwnerUserId ?? ""}
              disabled={governancePending || !canAssignFinanceOwner}
            >
              <option value="">Unassigned</option>
              {financeOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} | {owner.title}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentNotes">Finance Notes</Label>
            <Textarea
              id="paymentNotes"
              name="paymentNotes"
              rows={5}
              defaultValue={paymentNotes ?? ""}
              placeholder="Capture payment governance context, escalation notes, or closure rationale."
              disabled={governancePending}
            />
          </div>

          {canAssignFinanceOwner ? (
            <>
              <div>
                <Label htmlFor="paymentWorkflowOverrideStatus">Workflow Override</Label>
                <Select
                  id="paymentWorkflowOverrideStatus"
                  name="paymentWorkflowOverrideStatus"
                  defaultValue={currentWorkflowOverrideStatus ?? ""}
                  disabled={governancePending}
                >
                  <option value="">No override</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="DISPUTED">Disputed</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentWorkflowOverrideReason">Override Reason</Label>
                <Textarea
                  id="paymentWorkflowOverrideReason"
                  name="paymentWorkflowOverrideReason"
                  rows={4}
                  defaultValue={currentWorkflowOverrideReason ?? ""}
                  placeholder="Explain why this payment record is on hold or disputed."
                  disabled={governancePending}
                />
              </div>
            </>
          ) : null}

          <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">
            PO / contract amount remains the source of finance truth. Use this
            panel to assign ownership, record governance notes, and place the
            workflow on hold or dispute when escalation is required.
          </div>
        </div>

        <FormStateMessage state={governanceState} />

        <Button type="submit" disabled={governancePending}>
          {governancePending ? "Saving..." : "Save Payment Governance"}
        </Button>
      </form>

      {canCloseRecord ? (
        <form action={closeAction} className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <input type="hidden" name="projectVendorId" value={projectVendorId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input type="hidden" name="closeAction" value={closedAt ? "REOPEN" : "CLOSE"} />

          <input type="hidden" name="overrideClosure" value="" />

          <div>
            <Label htmlFor="closeReason">
              {closedAt ? "Reopen Note" : "Close Reason"}
            </Label>
            <Input
              id="closeReason"
              name="closeReason"
              placeholder={
                closedAt
                  ? "Required note for reopening the payment record"
                  : "Provide a closure note or override reason when needed"
              }
              disabled={closePending}
            />
          </div>

          <FormStateMessage state={closeState} />

          {closeDisabledReason ? (
            <p className="rounded-[16px] border border-[rgba(185,28,28,0.14)] bg-[rgba(185,28,28,0.06)] px-4 py-3 text-xs leading-6 text-[#991b1b]">
              {closeDisabledReason}.
            </p>
          ) : null}

          <span className="inline-flex" title={closeDisabledReason}>
            <Button
              type="submit"
              variant={closedAt ? "secondary" : "destructive"}
              disabled={closeDisabled}
            >
              {closePending
                ? "Saving..."
                : closedAt
                  ? "Reopen Payment Record"
                  : "Close Payment Record"}
            </Button>
          </span>
        </form>
      ) : null}
    </div>
  );
}
