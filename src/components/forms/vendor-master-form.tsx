"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { saveVendorMasterAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VENDOR_STATUS_OPTIONS } from "@/lib/constants";
import type { VendorGovernanceOptions } from "@/lib/types";

export function VendorMasterForm({
  vendor,
  options,
  redirectTo,
}: {
  vendor?: {
    id: string;
    vendorName: string;
    vendorEmail: string;
    vendorId: string;
    vendorPhone: string | null;
    status: "ACTIVE" | "INACTIVE";
    classification: string | null;
    notes: string | null;
    categoryId: string | null;
    subcategoryId: string | null;
  };
  options: VendorGovernanceOptions;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveVendorMasterAction,
    EMPTY_ACTION_STATE,
  );
  const [categoryId, setCategoryId] = useState(vendor?.categoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(vendor?.subcategoryId ?? "");

  const subcategoryOptions = useMemo(
    () =>
      options.categories.find((category) => category.id === categoryId)
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
    <form action={formAction} className="space-y-5">
      {vendor ? (
        <input type="hidden" name="vendorRecordId" value={vendor.id} />
      ) : null}
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Label htmlFor="vendorName">Vendor Name</Label>
          <Input
            id="vendorName"
            name="vendorName"
            defaultValue={vendor?.vendorName}
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="vendorId">Vendor Identifier / CR / Code</Label>
          <Input
            id="vendorId"
            name="vendorId"
            defaultValue={vendor?.vendorId}
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="vendorEmail">Email</Label>
          <Input
            id="vendorEmail"
            name="vendorEmail"
            type="email"
            defaultValue={vendor?.vendorEmail}
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="vendorPhone">Phone</Label>
          <Input
            id="vendorPhone"
            name="vendorPhone"
            defaultValue={vendor?.vendorPhone ?? ""}
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="vendorStatus">Vendor Status</Label>
          <Select
            id="vendorStatus"
            name="status"
            defaultValue={vendor?.status ?? "ACTIVE"}
            disabled={isPending}
          >
            {VENDOR_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="classification">Classification / Rating</Label>
          <Input
            id="classification"
            name="classification"
            defaultValue={vendor?.classification ?? ""}
            placeholder="Strategic, Approved, Watchlist, Preferred..."
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select
            id="categoryId"
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
              ? "Choose the vendor master category before selecting a dependent subcategory."
              : "No vendor categories are configured yet. Create categories before classifying vendors."}
          </p>
        </div>
        <div>
          <Label htmlFor="subcategoryId">Subcategory</Label>
          <Select
            id="subcategoryId"
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
              ? "Select a category to unlock subcategory governance options."
              : subcategoryOptions.length === 0
                ? "No subcategories are configured for this category yet."
                : "Subcategory choices update automatically when the category changes."}
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="vendorNotes">Notes</Label>
        <Textarea
          id="vendorNotes"
          name="notes"
          defaultValue={vendor?.notes ?? ""}
          placeholder="Capture governance notes, onboarding context, or commercial observations."
          disabled={isPending}
        />
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending
          ? vendor
            ? "Saving..."
            : "Creating..."
          : vendor
            ? "Save Vendor"
            : "Create Vendor"}
      </Button>
    </form>
  );
}
