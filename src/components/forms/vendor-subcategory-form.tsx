"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createVendorSubcategoryAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { VendorGovernanceOptions } from "@/lib/types";

export function VendorSubcategoryForm({
  vendorId,
  options,
  defaultCategoryId,
}: {
  vendorId: string;
  options: VendorGovernanceOptions;
  defaultCategoryId?: string | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createVendorSubcategoryAction,
    EMPTY_ACTION_STATE,
  );
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const hasCategories = options.categories.length > 0;

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vendorId" value={vendorId} />

      <div>
        <Label htmlFor="vendor-subcategory-category">Parent Category</Label>
        <Select
          id="vendor-subcategory-category"
          name="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={isPending || !hasCategories}
        >
          <option value="">Select category</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
          {hasCategories
            ? "Subcategories are created inside a selected parent category."
            : "Create a vendor category first before adding a subcategory."}
        </p>
      </div>

      <div>
        <Label htmlFor="vendor-subcategory-name">Subcategory Name</Label>
        <Input
          id="vendor-subcategory-name"
          name="name"
          placeholder="Steel fabrication, Civil works, Electrical..."
          disabled={isPending || !hasCategories}
          required
        />
      </div>

      <div>
        <Label htmlFor="vendor-subcategory-external-key">
          External / Import Key
        </Label>
        <Input
          id="vendor-subcategory-external-key"
          name="externalKey"
          placeholder="Optional import mapping key"
          disabled={isPending || !hasCategories}
        />
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" variant="secondary" disabled={isPending || !hasCategories}>
        {isPending ? "Creating..." : "Create Subcategory"}
      </Button>
    </form>
  );
}
