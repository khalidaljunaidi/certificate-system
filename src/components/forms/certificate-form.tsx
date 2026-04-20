"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { saveCertificateDraftAction } from "@/actions/certificate-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type VendorOption = {
  id: string;
  poNumber: string | null;
  contractNumber: string | null;
  vendor: {
    id: string;
    vendorName: string;
    vendorEmail: string;
    vendorId: string;
  };
};

type CertificateFormProps = {
  projectId: string;
  vendors: VendorOption[];
  preferredProjectVendorId?: string;
  defaults?: {
    projectVendorId: string;
    vendorId: string;
    issueDate: string;
    poNumber: string;
    contractNumber: string;
    completionDate: string;
    totalAmount: string;
    executedScopeSummary: string;
    clientName: string;
    clientTitle: string;
    approverName: string;
    approverTitle: string;
    pmEmail: string;
  };
  submitLabel?: string;
  formMode: "create" | "edit" | "revision";
  certificateId?: string;
};

type CreateCertificateFormProps = Omit<
  CertificateFormProps,
  "formMode" | "certificateId"
>;

type EditCertificateFormProps = Omit<CertificateFormProps, "formMode"> & {
  certificateId: string;
  formMode?: "edit" | "revision";
};

export function CreateCertificateForm(props: CreateCertificateFormProps) {
  return <CertificateFormShell {...props} formMode="create" />;
}

export function EditCertificateForm({
  formMode = "edit",
  ...props
}: EditCertificateFormProps) {
  return <CertificateFormShell {...props} formMode={formMode} />;
}

function CertificateFormShell({
  projectId,
  certificateId,
  vendors,
  preferredProjectVendorId,
  defaults,
  submitLabel = "Save Draft",
  formMode,
}: CertificateFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveCertificateDraftAction,
    EMPTY_ACTION_STATE,
  );
  const hasHandledSuccessRef = useRef(false);

  const initialProjectVendorId =
    (preferredProjectVendorId &&
    vendors.some((vendor) => vendor.id === preferredProjectVendorId)
      ? preferredProjectVendorId
      : defaults?.projectVendorId) ??
    vendors[0]?.id ??
    "";
  const initialVendor =
    vendors.find((item) => item.id === initialProjectVendorId) ?? vendors[0];
  const [selectedProjectVendorId, setSelectedProjectVendorId] = useState(
    initialProjectVendorId,
  );
  const [vendorId, setVendorId] = useState(
    defaults?.vendorId ?? initialVendor?.vendor.id ?? "",
  );
  const [poNumber, setPoNumber] = useState(
    defaults?.poNumber ?? initialVendor?.poNumber ?? "",
  );
  const [contractNumber, setContractNumber] = useState(
    defaults?.contractNumber ?? initialVendor?.contractNumber ?? "",
  );

  useEffect(() => {
    if (
      state.success !== "Certificate saved successfully." ||
      !state.redirectTo ||
      hasHandledSuccessRef.current
    ) {
      return;
    }

    hasHandledSuccessRef.current = true;
    router.replace(state.redirectTo);
  }, [router, state.redirectTo, state.success]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {formMode === "revision"
            ? "Revise Completion Certificate"
            : certificateId
              ? "Edit Completion Certificate"
              : "Issue Completion Certificate"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="formMode" value={formMode} />
          {certificateId ? (
            <input type="hidden" name="certificateId" value={certificateId} />
          ) : null}
          <div>
            <Label htmlFor="projectVendorId">Vendor</Label>
            <Select
              id="projectVendorId"
              name="projectVendorId"
              value={selectedProjectVendorId}
              required
              onChange={(event) => {
                const nextProjectVendorId = event.target.value;
                const nextVendor =
                  vendors.find((item) => item.id === nextProjectVendorId) ??
                  vendors[0];

                setSelectedProjectVendorId(nextProjectVendorId);
                setVendorId(nextVendor?.vendor.id ?? "");
                setPoNumber(nextVendor?.poNumber ?? "");
                setContractNumber(nextVendor?.contractNumber ?? "");
              }}
            >
              {vendors.map((vendorOption) => (
                <option key={vendorOption.id} value={vendorOption.id}>
                  {vendorOption.vendor.vendorName} | PO{" "}
                  {vendorOption.poNumber ?? "Not provided"}
                  {vendorOption.contractNumber
                    ? ` | Contract ${vendorOption.contractNumber}`
                    : ""}
                </option>
              ))}
            </Select>
            <input
              type="hidden"
              name="vendorId"
              value={vendorId}
            />
          </div>
          <div>
            <Label htmlFor="pmEmail">Project Manager Email</Label>
            <Input
              id="pmEmail"
              name="pmEmail"
              type="email"
              defaultValue={defaults?.pmEmail}
              required
            />
          </div>
          <div>
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              defaultValue={defaults?.issueDate}
              required
            />
          </div>
          <div>
            <Label htmlFor="completionDate">Completion Date</Label>
            <Input
              id="completionDate"
              name="completionDate"
              type="date"
              defaultValue={defaults?.completionDate}
              required
            />
          </div>
          <div>
            <Label htmlFor="poNumber">PO Number</Label>
            <Input
              id="poNumber"
              name="poNumber"
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="contractNumber">Contract Number</Label>
            <Input
              id="contractNumber"
              name="contractNumber"
              value={contractNumber}
              onChange={(event) => setContractNumber(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="totalAmount">Total Amount (SAR)</Label>
            <Input
              id="totalAmount"
              name="totalAmount"
              type="number"
              step="0.01"
              defaultValue={defaults?.totalAmount}
              required
            />
          </div>
          <div>
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              name="clientName"
              defaultValue={defaults?.clientName}
              required
            />
          </div>
          <div>
            <Label htmlFor="clientTitle">Client Title</Label>
            <Input
              id="clientTitle"
              name="clientTitle"
              defaultValue={defaults?.clientTitle}
              required
            />
          </div>
          <div>
            <Label htmlFor="approverName">Procurement Approver Name</Label>
            <Input
              id="approverName"
              name="approverName"
              defaultValue={defaults?.approverName}
              required
            />
          </div>
          <div>
            <Label htmlFor="approverTitle">Procurement Approver Title</Label>
            <Input
              id="approverTitle"
              name="approverTitle"
              defaultValue={defaults?.approverTitle}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="executedScopeSummary">Executed Scope Summary</Label>
            <Textarea
              id="executedScopeSummary"
              name="executedScopeSummary"
              defaultValue={defaults?.executedScopeSummary}
              required
            />
          </div>
          <div className="md:col-span-2">
            <FormStateMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
