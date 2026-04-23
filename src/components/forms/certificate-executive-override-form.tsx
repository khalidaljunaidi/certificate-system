"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { forceApproveCertificateAction } from "@/actions/certificate-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CertificateExecutiveOverrideForm({
  projectId,
  certificateId,
}: {
  projectId: string;
  certificateId: string;
}) {
  const router = useRouter();
  const handledRedirectRef = useRef(false);
  const [state, formAction, isPending] = useActionState(
    forceApproveCertificateAction,
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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="certificateId" value={certificateId} />

      <div className="rounded-[24px] border border-[rgba(215,132,57,0.24)] bg-[rgba(215,132,57,0.08)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Executive override
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Khaled can bypass the pending PM approval step only when the workflow
          needs to be advanced immediately. This action is audited and notifies
          the relevant users.
        </p>
      </div>

      <div>
        <Label htmlFor={`overrideReason-${certificateId}`}>Override Reason</Label>
        <Textarea
          id={`overrideReason-${certificateId}`}
          name="overrideReason"
          placeholder="Explain why this approval should be bypassed."
          required
          minLength={10}
          disabled={isPending}
        />
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Applying Override..." : "Force Approve & Continue"}
      </Button>
    </form>
  );
}
