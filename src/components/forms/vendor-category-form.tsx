"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createVendorCategoryAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VendorCategoryForm({
  vendorId,
}: {
  vendorId: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createVendorCategoryAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vendorId" value={vendorId} />

      <div>
        <Label htmlFor="vendor-category-name">Category Name</Label>
        <Input
          id="vendor-category-name"
          name="name"
          placeholder="Construction services, Fabrication, Logistics..."
          disabled={isPending}
          required
        />
      </div>

      <div>
        <Label htmlFor="vendor-category-external-key">External / Import Key</Label>
        <Input
          id="vendor-category-external-key"
          name="externalKey"
          placeholder="Optional import mapping key"
          disabled={isPending}
        />
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Creating..." : "Create Category"}
      </Button>
    </form>
  );
}
