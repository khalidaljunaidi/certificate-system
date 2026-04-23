"use client";

import Link from "next/link";
import { useActionState, useDeferredValue, useMemo, useState } from "react";

import { addProjectVendorAction } from "@/actions/project-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { VendorPickerOption } from "@/lib/types";

type ProjectVendorFormProps = {
  projectId: string;
  vendorOptions: VendorPickerOption[];
};

export function ProjectVendorForm({
  projectId,
  vendorOptions,
}: ProjectVendorFormProps) {
  const [state, formAction, isPending] = useActionState(
    addProjectVendorAction,
    EMPTY_ACTION_STATE,
  );
  const [createNewVendor, setCreateNewVendor] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const deferredVendorSearch = useDeferredValue(vendorSearch);
  const filteredVendorOptions = useMemo(() => {
    if (!deferredVendorSearch) {
      return vendorOptions;
    }

    const normalizedSearch = deferredVendorSearch.toLowerCase();

    return vendorOptions.filter((vendor) =>
      [
        vendor.vendorName,
        vendor.vendorId,
        vendor.vendorEmail,
        vendor.categoryName ?? "",
        vendor.subcategoryName ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [deferredVendorSearch, vendorOptions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Vendor Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="md:col-span-2 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-muted)]">
            Select a vendor from the master registry first, then create the
            project-specific PO or contract assignment. Each submission creates
            a separate assignment row.
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button
              type="button"
              variant={createNewVendor ? "secondary" : "default"}
              onClick={() => setCreateNewVendor(false)}
            >
              Select Existing Vendor
            </Button>
            <Button
              type="button"
              variant={createNewVendor ? "default" : "secondary"}
              onClick={() => setCreateNewVendor(true)}
            >
              Create New Vendor Inline
            </Button>
            <Button asChild variant="secondary">
              <Link
                href={`/admin/vendors/new?redirectTo=${encodeURIComponent(
                  `/admin/projects/${projectId}`,
                )}`}
              >
                Open Full Vendor Create Page
              </Link>
            </Button>
          </div>

          {createNewVendor ? (
            <>
              <div>
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input id="vendorName" name="vendorName" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="vendorEmail">Vendor Email</Label>
                <Input
                  id="vendorEmail"
                  name="vendorEmail"
                  type="email"
                  required
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="vendorId">Vendor ID / CR / Code</Label>
                <Input id="vendorId" name="vendorId" required disabled={isPending} />
              </div>
              <div>
                <Label htmlFor="vendorPhone">Vendor Phone</Label>
                <Input id="vendorPhone" name="vendorPhone" disabled={isPending} />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2">
                <Label htmlFor="vendorSearch">Find Vendor</Label>
                <Input
                  id="vendorSearch"
                  value={vendorSearch}
                  onChange={(event) => setVendorSearch(event.target.value)}
                  placeholder="Search vendor name, code, email, category"
                  disabled={isPending}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="existingVendorRecordId">Vendor Registry Record</Label>
                <Select
                  id="existingVendorRecordId"
                  name="existingVendorRecordId"
                  required={!createNewVendor}
                  disabled={isPending}
                >
                  <option value="">Select a vendor</option>
                  {filteredVendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendorName} | {vendor.vendorId} | {vendor.vendorEmail}
                      {vendor.categoryName ? ` | ${vendor.categoryName}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="poNumber">PO Number</Label>
            <Input id="poNumber" name="poNumber" disabled={isPending} />
          </div>
          <div>
            <Label htmlFor="contractNumber">Contract Number</Label>
            <Input id="contractNumber" name="contractNumber" disabled={isPending} />
          </div>

          <div className="md:col-span-2">
            <FormStateMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Linking..." : "Create Assignment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
