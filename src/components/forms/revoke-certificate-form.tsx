"use client";

import { useActionState } from "react";

import { revokeCertificateAction } from "@/actions/certificate-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RevokeCertificateForm({
  certificateId,
  projectId,
}: {
  certificateId: string;
  projectId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    revokeCertificateAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="certificateId" value={certificateId} />
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <Label htmlFor="revokedReason">Revocation Reason</Label>
        <Textarea id="revokedReason" name="revokedReason" required />
      </div>
      <FormStateMessage state={state} />
      <Button type="submit" variant="destructive" disabled={isPending}>
        {isPending ? "Revoking..." : "Revoke Certificate"}
      </Button>
    </form>
  );
}
