"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createMonthlyCycleAction } from "@/actions/performance-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MONTHLY_CYCLE_STATUS_OPTIONS } from "@/lib/constants";

export function MonthlyCycleForm({
  defaultMonth,
  defaultYear,
  defaultLabel,
}: {
  defaultMonth: number;
  defaultYear: number;
  defaultLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createMonthlyCycleAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label htmlFor="monthly-cycle-month">Month</Label>
          <Input
            id="monthly-cycle-month"
            name="month"
            type="number"
            min={1}
            max={12}
            defaultValue={String(defaultMonth)}
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="monthly-cycle-year">Year</Label>
          <Input
            id="monthly-cycle-year"
            name="year"
            type="number"
            min={2024}
            max={2100}
            defaultValue={String(defaultYear)}
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="monthly-cycle-label">Label</Label>
          <Input
            id="monthly-cycle-label"
            name="label"
            defaultValue={defaultLabel}
            placeholder="April 2026"
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="monthly-cycle-status">Initial Status</Label>
          <Select
            id="monthly-cycle-status"
            name="status"
            defaultValue="OPEN"
            disabled={isPending}
          >
            {MONTHLY_CYCLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-[var(--color-ink)]">
        <input type="checkbox" name="activate" defaultChecked disabled={isPending} />
        Activate this cycle for the monthly command center immediately
      </label>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating cycle..." : "Create Monthly Cycle"}
      </Button>
    </form>
  );
}
