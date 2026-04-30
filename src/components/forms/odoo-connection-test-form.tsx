"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { testOdooConnectionAction } from "@/actions/vendor-registration-actions";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";

export function OdooConnectionTestForm() {
  const [state, formAction, isPending] = useActionState(
    testOdooConnectionAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        {isPending ? "Testing..." : "Test Odoo Connection"}
      </Button>
      <FormStateMessage state={state} />
    </form>
  );
}
