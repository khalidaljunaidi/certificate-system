"use client";

import { useActionState } from "react";

import { sendWorkflowEmailTestAction } from "@/actions/email-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailTestPanel({
  defaultRecipientEmail,
}: {
  defaultRecipientEmail: string;
}) {
  const [state, formAction, isPending] = useActionState(
    sendWorkflowEmailTestAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Test recipient email</Label>
            <Input
              id="recipientEmail"
              name="recipientEmail"
              type="email"
              defaultValue={defaultRecipientEmail}
              required
            />
          </div>
          <p className="text-sm leading-7 text-[var(--color-muted)]">
            These actions send sample workflow emails only to the address entered
            above. Live PM, vendor, and procurement CC recipients are not used.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              name="template"
              value="PM_APPROVAL_REQUEST"
              disabled={isPending}
            >
              Send PM Approval Request
            </Button>
            <Button
              type="submit"
              name="template"
              value="PROCUREMENT_NOTIFICATION"
              variant="secondary"
              disabled={isPending}
            >
              Send Procurement Notification
            </Button>
            <Button
              type="submit"
              name="template"
              value="CERTIFICATE_ISSUED"
              variant="secondary"
              disabled={isPending}
            >
              Send Issued Certificate
            </Button>
            <Button
              type="submit"
              name="template"
              value="CERTIFICATE_REOPENED"
              variant="secondary"
              disabled={isPending}
            >
              Send Reopened Notice
            </Button>
          </div>
          <FormStateMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
