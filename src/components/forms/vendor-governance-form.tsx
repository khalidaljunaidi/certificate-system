"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { updateVendorGovernanceAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { SubcategorySelector } from "@/components/forms/subcategory-selector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { VendorGovernanceOptions } from "@/lib/types";

export function VendorGovernanceForm({
  vendorId,
  currentCategoryId,
  currentSubcategoryId,
  currentSubcategoryIds = [],
  options,
}: {
  vendorId: string;
  currentCategoryId: string | null;
  currentSubcategoryId: string | null;
  currentSubcategoryIds?: string[];
  options: VendorGovernanceOptions;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateVendorGovernanceAction,
    EMPTY_ACTION_STATE,
  );
  const [categoryId, setCategoryId] = useState(currentCategoryId ?? "");
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>(
    currentSubcategoryIds.length > 0
      ? currentSubcategoryIds
      : currentSubcategoryId
        ? [currentSubcategoryId]
        : [],
  );

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
            setCategoryId(event.target.value);
            setSubcategoryIds([]);
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

      <SubcategorySelector
        id="vendor-governance-subcategories"
        categorySelected={Boolean(categoryId)}
        options={subcategoryOptions}
        selectedIds={subcategoryIds}
        onSelectedIdsChange={setSubcategoryIds}
        disabled={isPending}
        required={subcategoryOptions.length > 0}
        lockedText="Choose a category to enable subcategory options."
        emptyText="No subcategories exist for the selected category yet."
      />

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Governance Details"}
      </Button>
    </form>
  );
}
