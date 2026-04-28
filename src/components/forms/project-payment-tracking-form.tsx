"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { saveProjectVendorPaymentInstallmentAction } from "@/actions/project-payment-actions";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type ProjectPaymentTrackingFormProps = {
  projectId: string;
  initialProjectVendorId?: string | null;
  projectVendors: Array<{
    id: string;
    vendorName: string;
    vendorId: string;
    poNumber: string | null;
    contractNumber: string | null;
    paymentSummary: {
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      progressPercent: number;
      installmentCount: number;
      installments: Array<{
        id: string;
        projectVendorId: string;
        amount: number;
        dueDate: Date;
        condition: string;
        invoiceNumber: string | null;
        invoiceStoragePath: string | null;
        paymentDate: Date | null;
        status:
          | "PLANNED"
          | "INVOICE_REQUIRED"
          | "INVOICE_RECEIVED"
          | "UNDER_REVIEW"
          | "SCHEDULED"
          | "PAID"
          | "OVERDUE"
          | "CANCELLED";
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };
  }>;
};

const PAYMENT_STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "INVOICE_REQUIRED", label: "Invoice Required" },
  { value: "INVOICE_RECEIVED", label: "Invoice Received" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type DraftState = {
  installmentId: string | null;
  projectVendorId: string;
  amount: string;
  dueDate: string;
  condition: string;
  invoiceNumber: string;
  paymentDate: string;
  status: (typeof PAYMENT_STATUS_OPTIONS)[number]["value"];
  notes: string;
  invoiceKey: number;
};

function createEmptyDraft(projectVendorId: string): DraftState {
  return {
    installmentId: null,
    projectVendorId,
    amount: "",
    dueDate: "",
    condition: "",
    invoiceNumber: "",
    paymentDate: "",
    status: "PLANNED",
    notes: "",
    invoiceKey: 0,
  };
}

function statusVariant(status: DraftState["status"]) {
  if (status === "PAID") {
    return "green";
  }

  if (status === "OVERDUE") {
    return "red";
  }

  if (status === "INVOICE_REQUIRED" || status === "UNDER_REVIEW") {
    return "orange";
  }

  if (status === "CANCELLED") {
    return "neutral";
  }

  return "purple";
}

export function ProjectPaymentTrackingForm({
  projectId,
  initialProjectVendorId,
  projectVendors,
}: ProjectPaymentTrackingFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveProjectVendorPaymentInstallmentAction,
    EMPTY_ACTION_STATE,
  );
  const [selectedProjectVendorId, setSelectedProjectVendorId] = useState(
    projectVendors.find((vendor) => vendor.id === initialProjectVendorId)?.id ??
      projectVendors[0]?.id ??
      "",
  );
  const selectedAssignment = useMemo(
    () => projectVendors.find((vendor) => vendor.id === selectedProjectVendorId) ?? projectVendors[0] ?? null,
    [projectVendors, selectedProjectVendorId],
  );
  const [draft, setDraft] = useState<DraftState>(
    createEmptyDraft(projectVendors[0]?.id ?? ""),
  );

  useEffect(() => {
    if (!selectedAssignment) {
      return;
    }

    setDraft((current) =>
      current.projectVendorId === selectedAssignment.id
        ? current
        : createEmptyDraft(selectedAssignment.id),
    );
  }, [selectedAssignment]);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  if (!selectedAssignment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Tracking</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-[var(--color-muted)]">
          Add a vendor PO assignment to this project before tracking payments.
        </CardContent>
      </Card>
    );
  }

  const paymentSummary = selectedAssignment.paymentSummary;

  const loadInstallment = (
    installment: (typeof paymentSummary.installments)[number],
  ) => {
    setSelectedProjectVendorId(installment.projectVendorId);
    setDraft({
      installmentId: installment.id,
      projectVendorId: installment.projectVendorId,
      amount: String(installment.amount),
      dueDate: installment.dueDate.toISOString().slice(0, 10),
      condition: installment.condition,
      invoiceNumber: installment.invoiceNumber ?? "",
      paymentDate: installment.paymentDate
        ? installment.paymentDate.toISOString().slice(0, 10)
        : "",
      status: installment.status,
      notes: installment.notes ?? "",
      invoiceKey: Date.now(),
    });
  };

  const resetDraft = () => {
    setDraft({
      ...createEmptyDraft(selectedAssignment.id),
      invoiceKey: Date.now(),
    });
  };

  return (
    <Card id="payment-tracking" className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Payment Tracking</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={resetDraft}>
            New Installment
          </Button>
        </div>
        <p className="text-sm leading-7 text-[var(--color-muted)]">
          Track unlimited installments for each vendor PO / contract assignment,
          update payment status over time, and keep a clean financial trail.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div>
            <Label htmlFor="projectVendorId">Assignment</Label>
            <Select
              id="projectVendorId"
              value={selectedProjectVendorId}
              onChange={(event) => setSelectedProjectVendorId(event.target.value)}
            >
              {projectVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendorName}
                  {vendor.poNumber ? ` | PO ${vendor.poNumber}` : ""}
                  {vendor.contractNumber ? ` | Contract ${vendor.contractNumber}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <SummaryTile label="Total" value={`SAR ${paymentSummary.totalAmount.toFixed(2)}`} />
            <SummaryTile label="Paid" value={`SAR ${paymentSummary.paidAmount.toFixed(2)}`} />
            <SummaryTile
              label="Remaining"
              value={`SAR ${paymentSummary.remainingAmount.toFixed(2)}`}
            />
            <SummaryTile
              label="Progress"
              value={`${Math.round(paymentSummary.progressPercent)}%`}
            />
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-panel-soft)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]"
            style={{ width: `${Math.min(paymentSummary.progressPercent, 100)}%` }}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-[var(--color-border)] bg-[var(--color-panel-soft)]">
            <CardHeader>
              <CardTitle className="text-base">
                {draft.installmentId ? "Edit Installment" : "Add Installment"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4" noValidate>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="projectVendorId" value={selectedProjectVendorId} />
                {draft.installmentId ? (
                  <input type="hidden" name="installmentId" value={draft.installmentId} />
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="amount">
                      Amount (SAR) <span className="text-[#991b1b]">*</span>
                    </Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={draft.amount}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, amount: event.target.value }))
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">
                      Due Date <span className="text-[#991b1b]">*</span>
                    </Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      required
                      value={draft.dueDate}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, dueDate: event.target.value }))
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">
                      Condition <span className="text-[#991b1b]">*</span>
                    </Label>
                    <Input
                      id="condition"
                      name="condition"
                      required
                      value={draft.condition}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, condition: event.target.value }))
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">
                      Status <span className="text-[#991b1b]">*</span>
                    </Label>
                    <Select
                      id="status"
                      name="status"
                      value={draft.status}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          status: event.target.value as DraftState["status"],
                        }))
                      }
                      disabled={isPending}
                    >
                      {PAYMENT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      name="paymentDate"
                      type="date"
                      value={draft.paymentDate}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          paymentDate: event.target.value,
                        }))
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      value={draft.invoiceNumber}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          invoiceNumber: event.target.value,
                        }))
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="invoiceAttachment">Invoice File</Label>
                  <Input
                    key={draft.invoiceKey}
                    id="invoiceAttachment"
                    name="invoiceAttachment"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    disabled={isPending}
                    className="mt-2 file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-panel-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, notes: event.target.value }))
                    }
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isPending}>
                    {isPending
                      ? "Saving..."
                      : draft.installmentId
                        ? "Update Installment"
                        : "Save Installment"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetDraft} disabled={isPending}>
                    Clear Form
                  </Button>
                </div>

                <FormStateMessage state={state} />
              </form>
            </CardContent>
          </Card>

          <Card className="border-[var(--color-border)] bg-white">
            <CardHeader>
              <CardTitle className="text-base">Installments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentSummary.installments.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--color-muted)]">
                  No payment installments have been added yet.
                </p>
              ) : (
                paymentSummary.installments.map((installment) => (
                  <div
                    key={installment.id}
                    className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          SAR {installment.amount.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                          Due {formatDate(installment.dueDate)} | {installment.condition}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                          {installment.invoiceNumber ? `Invoice ${installment.invoiceNumber}` : "No invoice number"}
                          {installment.paymentDate
                            ? ` | Paid ${formatDate(installment.paymentDate)}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant={statusVariant(installment.status)}>
                        {installment.status.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    {installment.notes ? (
                      <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                        {installment.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => loadInstallment(installment)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
