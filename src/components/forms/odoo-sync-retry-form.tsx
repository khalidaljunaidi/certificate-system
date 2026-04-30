"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { retryOdooVendorSyncAction } from "@/actions/vendor-registration-actions";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";

export function OdooSyncRetryForm({
  targetType,
  targetId,
  vendorId,
  redirectTo,
  label = "Retry Sync",
}: {
  targetType: "registration" | "vendor";
  targetId: string;
  vendorId: string;
  redirectTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    retryOdooVendorSyncAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
      return;
    }

    if (state.success || state.error) {
      router.refresh();
    }
  }, [router, state.error, state.redirectTo, state.success]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Syncing..." : label}
      </Button>
      <FormStateMessage state={state} />
    </form>
  );
}
