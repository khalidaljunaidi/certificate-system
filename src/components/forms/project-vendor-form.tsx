"use client";

import { useActionState } from "react";

import { addProjectVendorAction } from "@/actions/project-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProjectVendorFormProps = {
  projectId: string;
};

export function ProjectVendorForm({ projectId }: ProjectVendorFormProps) {
  const [state, formAction, isPending] = useActionState(
    addProjectVendorAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Vendor PO Record</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="md:col-span-2 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-muted)]">
            Each submission creates a separate PO or contract record for this
            project. The same vendor can appear more than once with different PO
            numbers.
          </div>
          <div>
            <Label htmlFor="vendorName">Vendor Name</Label>
            <Input id="vendorName" name="vendorName" required />
          </div>
          <div>
            <Label htmlFor="vendorEmail">Vendor Email</Label>
            <Input id="vendorEmail" name="vendorEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="vendorId">Vendor ID</Label>
            <Input id="vendorId" name="vendorId" required />
          </div>
          <div>
            <Label htmlFor="poNumber">PO Number</Label>
            <Input id="poNumber" name="poNumber" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="contractNumber">Contract Number</Label>
            <Input id="contractNumber" name="contractNumber" />
          </div>
          <div className="md:col-span-2">
            <FormStateMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add PO Record"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
