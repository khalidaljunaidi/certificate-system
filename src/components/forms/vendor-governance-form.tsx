"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { updateVendorGovernanceAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { VendorGovernanceOptions } from "@/lib/types";

export function VendorGovernanceForm({
  vendorId,
  currentCategoryId,
  currentSubcategoryId,
  options,
}: {
  vendorId: string;
  currentCategoryId: string | null;
  currentSubcategoryId: string | null;
  options: VendorGovernanceOptions;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateVendorGovernanceAction,
    EMPTY_ACTION_STATE,
  );
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(currentSubcategoryId ?? "");

  const subcategoryOptions = useMemo(
    () =>
      options.categories
        .find((category) => category.id === categoryId)
        ?.subcategories ?? [],
    [categoryId, options.categories],
  );
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
        <Label htmlFor="vendor-category">Category</Label>
        <Select
          id="vendor-category"
          name="categoryId"
          value={categoryId}
          onChange={(event) => {
            const nextCategoryId = event.target.value;
            const nextSubcategoryOptions =
              options.categories.find((category) => category.id === nextCategoryId)
                ?.subcategories ?? [];

            setCategoryId(nextCategoryId);
            if (
              subcategoryId &&
              !nextSubcategoryOptions.some(
                (subcategory) => subcategory.id === subcategoryId,
              )
            ) {
              setSubcategoryId("");
            }
          }}
          disabled={isPending}
        >
          <option value="">Unassigned</option>
          {options.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.externalKey
                ? `${category.name} (${category.externalKey})`
                : category.name}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
          {hasCategories
            ? "Select the vendor category first so subcategories can be validated safely."
            : "No vendor categories are configured yet."}
        </p>
      </div>

      <div>
        <Label htmlFor="vendor-subcategory">Subcategory</Label>
        <Select
          id="vendor-subcategory"
          name="subcategoryId"
          value={subcategoryId}
          onChange={(event) => setSubcategoryId(event.target.value)}
          disabled={isPending || !categoryId}
        >
          <option value="">Unassigned</option>
          {subcategoryOptions.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.externalKey
                ? `${subcategory.name} (${subcategory.externalKey})`
                : subcategory.name}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
          {!categoryId
            ? "Choose a category to enable subcategory options."
            : subcategoryOptions.length === 0
              ? "No subcategories exist for the selected category yet."
              : "Subcategory options are tied to the selected category."}
        </p>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Governance Details"}
      </Button>
    </form>
  );
}
