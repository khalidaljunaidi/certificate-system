"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateMonthlyCycleStatusAction } from "@/actions/performance-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { Button } from "@/components/ui/button";

export function MonthlyCycleStatusForm({
  cycleId,
  action,
  label,
  variant = "secondary",
  disabled = false,
}: {
  cycleId: string;
  action: "activate" | "close" | "archive" | "reopen";
  label: string;
  variant?: "default" | "secondary";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateMonthlyCycleStatusAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction}>
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant={variant} size="sm" disabled={disabled || isPending}>
        {isPending ? "Updating..." : label}
      </Button>
    </form>
  );
}
