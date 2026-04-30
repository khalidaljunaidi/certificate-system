"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SubcategorySelectorOption = {
  id: string;
  name: string;
  externalKey?: string | null;
  code?: string | null;
};

type SubcategorySelectorProps = {
  id: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  categorySelected: boolean;
  options: SubcategorySelectorOption[];
  selectedIds: string[];
  onSelectedIdsChange: (selectedIds: string[]) => void;
  emptyText?: string;
  lockedText?: string;
};

export function SubcategorySelector({
  id,
  label = "Subcategories",
  required = false,
  disabled = false,
  categorySelected,
  options,
  selectedIds,
  onSelectedIdsChange,
  emptyText = "No subcategories are configured for this category yet.",
  lockedText = "Select a category to unlock subcategory options.",
}: SubcategorySelectorProps) {
  const optionIds = new Set(options.map((option) => option.id));
  const selectedInCategory = selectedIds.filter((selectedId) =>
    optionIds.has(selectedId),
  );
  const selectedCount = selectedInCategory.length;
  const allSelected = options.length > 0 && selectedCount === options.length;
  const isPartial = selectedCount > 0 && !allSelected;

  function selectAll() {
    onSelectedIdsChange(options.map((option) => option.id));
  }

  function clearSelection() {
    onSelectedIdsChange([]);
  }

  function toggleSubcategory(subcategoryId: string, checked: boolean) {
    onSelectedIdsChange(
      checked
        ? Array.from(new Set([...selectedInCategory, subcategoryId]))
        : selectedInCategory.filter((selectedId) => selectedId !== subcategoryId),
    );
  }

  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <input
        type="hidden"
        name="subcategoryId"
        value={selectedInCategory[0] ?? ""}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor={id}>
            {label}
            {required ? <span className="text-[#991b1b]"> *</span> : null}
          </Label>
          <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
            Select one or more real subcategory records. No synthetic "all"
            value is stored.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={allSelected ? "green" : isPartial ? "orange" : "neutral"} size="sm">
            {selectedCount} of {options.length} selected
          </Chip>
          <Button
            type="button"
            variant={allSelected ? "default" : "secondary"}
            size="sm"
            onClick={selectAll}
            disabled={disabled || !categorySelected || options.length === 0}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={clearSelection}
            disabled={disabled || selectedCount === 0}
          >
            Clear selection
          </Button>
        </div>
      </div>

      {!categorySelected ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
          {lockedText}
        </div>
      ) : options.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
          {emptyText}
        </div>
      ) : (
        <div id={id} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {options.map((subcategory) => {
            const checked = selectedInCategory.includes(subcategory.id);
            const code = subcategory.externalKey ?? subcategory.code;

            return (
              <label
                key={subcategory.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[20px] border px-4 py-3 text-sm transition-colors",
                  checked
                    ? "border-[var(--color-primary)] bg-white text-[var(--color-primary)] shadow-[0_10px_24px_rgba(27,16,51,0.08)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-primary)]",
                  disabled ? "cursor-not-allowed opacity-70" : "",
                )}
              >
                <input
                  type="checkbox"
                  name="subcategoryIds"
                  value={subcategory.id}
                  checked={checked}
                  onChange={(event) =>
                    toggleSubcategory(subcategory.id, event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                  disabled={disabled}
                />
                <span className="min-w-0">
                  <span className="line-clamp-2 font-semibold">
                    {subcategory.name}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {code ?? "No code"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
