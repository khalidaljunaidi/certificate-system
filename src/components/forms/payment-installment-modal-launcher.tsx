"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { saveProjectVendorPaymentInstallmentAction } from "@/actions/project-payment-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatSarAmount } from "@/lib/utils";

type PaymentWorkflowModalMode =
  | "create"
  | "edit"
  | "invoice"
  | "review"
  | "schedule"
  | "mark-paid";

type PaymentInstallmentModalLauncherProps = {
  projectId: string;
  projectVendorId: string;
  assignmentLabel: string;
  redirectTo: string;
  buttonLabel: string;
  buttonVariant?: ButtonProps["variant"];
  buttonSize?: ButtonProps["size"];
  className?: string;
  assignmentAmount?: number | null;
  plannedAmount?: number;
  onOpen?: () => void;
  mode?: PaymentWorkflowModalMode;
  installment?: {
    id: string;
    amount: number;
    dueDate: Date;
    condition: string;
    invoiceNumber: string | null;
    invoiceStoragePath: string | null;
    invoiceDate: Date | null;
    invoiceAmount: number | null;
    invoiceReceivedDate: Date | null;
    taxInvoiceValidated: boolean;
    invoiceStatus:
      | "MISSING"
      | "RECEIVED"
      | "REJECTED"
      | "APPROVED_FOR_PAYMENT";
    financeReviewNotes: string | null;
    financeReviewedAt: Date | null;
    financeReviewedByName: string | null;
    scheduledPaymentDate: Date | null;
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
  };
};

const REVIEW_DECISION_OPTIONS = [
  { value: "RECEIVED", label: "Keep Awaiting Review" },
  { value: "REJECTED", label: "Reject Invoice" },
  { value: "APPROVED_FOR_PAYMENT", label: "Approve For Payment" },
] as const;

type ReviewDecisionValue = (typeof REVIEW_DECISION_OPTIONS)[number]["value"];

function toDateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function getWorkflowIntent(mode: PaymentWorkflowModalMode) {
  switch (mode) {
    case "create":
      return "CREATE_PLAN";
    case "edit":
      return "EDIT_PLAN";
    case "invoice":
      return "ADD_INVOICE";
    case "review":
      return "REVIEW_INVOICE";
    case "schedule":
      return "SCHEDULE_PAYMENT";
    case "mark-paid":
      return "MARK_PAID";
    default:
      return "EDIT_PLAN";
  }
}

function getDialogCopy(mode: PaymentWorkflowModalMode, installment?: { condition: string }) {
  switch (mode) {
    case "create":
      return {
        title: "Add payment plan",
        subtitle: "Create the next planned installment for this PO / contract workflow.",
        badge: "Planning",
      };
    case "edit":
      return {
        title: "Edit installment",
        subtitle: "Adjust the installment definition without breaking the finance process.",
        badge: "Plan update",
      };
    case "invoice":
      return {
        title: "Register invoice",
        subtitle: installment
          ? `Capture invoice intake for ${installment.condition}.`
          : "Capture invoice intake for this installment.",
        badge: "Invoice intake",
      };
    case "review":
      return {
        title: "Finance review",
        subtitle: "Approve or reject the received invoice before payment scheduling.",
        badge: "Finance review",
      };
    case "schedule":
      return {
        title: "Schedule payment",
        subtitle: "Set the approved payment date and move the installment into scheduling.",
        badge: "Scheduling",
      };
    case "mark-paid":
      return {
        title: "Confirm payment",
        subtitle: "Record the actual payment date and complete this installment.",
        badge: "Payment confirmation",
      };
    default:
      return {
        title: "Payment workflow",
        subtitle: "Manage the installment workflow for this assignment.",
        badge: "Workflow",
      };
  }
}

export function PaymentInstallmentModalLauncher({
  projectId,
  projectVendorId,
  assignmentLabel,
  redirectTo,
  buttonLabel,
  buttonVariant = "secondary",
  buttonSize = "sm",
  className,
  assignmentAmount,
  plannedAmount = 0,
  onOpen,
  mode = "create",
  installment,
}: PaymentInstallmentModalLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const open = () => {
    onOpen?.();
    setFormVersion((current) => current + 1);
    setIsOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        className={className}
        onClick={open}
      >
        {buttonLabel}
      </Button>

      {isOpen ? (
        <PaymentInstallmentModal
          key={formVersion}
          projectId={projectId}
          projectVendorId={projectVendorId}
          assignmentLabel={assignmentLabel}
          redirectTo={redirectTo}
          assignmentAmount={assignmentAmount}
          plannedAmount={plannedAmount}
          mode={mode}
          installment={installment}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

function PaymentInstallmentModal({
  projectId,
  projectVendorId,
  assignmentLabel,
  redirectTo,
  assignmentAmount,
  plannedAmount = 0,
  mode,
  installment,
  onClose,
}: Omit<
  PaymentInstallmentModalLauncherProps,
  "buttonLabel" | "buttonVariant" | "buttonSize" | "className" | "mode"
> & {
  mode: PaymentWorkflowModalMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [amountValue, setAmountValue] = useState(
    installment ? String(installment.amount) : "",
  );
  const [invoiceDecision, setInvoiceDecision] = useState<ReviewDecisionValue>(
    installment?.invoiceStatus === "APPROVED_FOR_PAYMENT" ||
      installment?.invoiceStatus === "REJECTED"
      ? installment.invoiceStatus
      : "APPROVED_FOR_PAYMENT",
  );
  const [state, formAction, isPending] = useActionState(
    saveProjectVendorPaymentInstallmentAction,
    EMPTY_ACTION_STATE,
  );

  const copy = useMemo(() => getDialogCopy(mode, installment), [installment, mode]);
  const workflowIntent = getWorkflowIntent(mode);
  const projectedPlannedAmount = useMemo(() => {
    const normalizedAmount = Number(amountValue);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return plannedAmount;
    }

    if (!installment) {
      return plannedAmount + normalizedAmount;
    }

    return plannedAmount - installment.amount + normalizedAmount;
  }, [amountValue, installment, plannedAmount]);

  const projectedDelta =
    assignmentAmount === null || assignmentAmount === undefined
      ? null
      : projectedPlannedAmount - assignmentAmount;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }

    onClose();
    router.replace(state.redirectTo, { scroll: false });
  }, [onClose, router, state.redirectTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="theme-admin fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(7,9,22,0.58)] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-installment-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white shadow-[0_28px_90px_rgba(17,17,17,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Payments
            </p>
            <h2
              id="payment-installment-title"
              className="mt-2 text-2xl font-semibold text-[var(--color-ink)]"
            >
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              {copy.subtitle}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              {assignmentLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment installment modal"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-muted)] transition-colors hover:bg-[var(--color-panel-soft)] hover:text-[var(--color-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-6">
          <form action={formAction} className="space-y-5" noValidate>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="projectVendorId" value={projectVendorId} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="workflowIntent" value={workflowIntent} />
            {installment ? (
              <input type="hidden" name="installmentId" value={installment.id} />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Badge variant="purple">{copy.badge}</Badge>
              <Badge variant="neutral">
                {installment ? installment.status.replaceAll("_", " ") : "New installment"}
              </Badge>
              {assignmentAmount !== null && assignmentAmount !== undefined ? (
                <Badge variant="green">PO Total {formatSarAmount(assignmentAmount)}</Badge>
              ) : (
                <Badge variant="orange">PO amount not set</Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Amount (SAR)" required>
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountValue}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAmountValue(event.target.value)
                  }
                  readOnly={mode !== "create" && mode !== "edit"}
                  disabled={isPending}
                  required
                />
                {assignmentAmount !== null && assignmentAmount !== undefined ? (
                  <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
                    Planned after save: {formatSarAmount(projectedPlannedAmount)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
                    Installments can be planned now, but finance totals remain pending until the PO amount is set.
                  </p>
                )}
                {projectedDelta !== null && projectedDelta !== 0 ? (
                  <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                    {projectedDelta > 0
                      ? `Warning: planned installments will be ${formatSarAmount(projectedDelta)} above the PO amount.`
                      : `Warning: planned installments will be ${formatSarAmount(Math.abs(projectedDelta))} below the PO amount.`}
                  </p>
                ) : null}
              </Field>

              <Field label="Due Date" required>
                <Input
                  name="dueDate"
                  type="date"
                  defaultValue={toDateInputValue(installment?.dueDate)}
                  readOnly={mode !== "create" && mode !== "edit"}
                  disabled={isPending}
                  required
                />
              </Field>

              <Field label="Condition" required>
                <Input
                  name="condition"
                  defaultValue={installment?.condition ?? ""}
                  readOnly={mode !== "create" && mode !== "edit"}
                  disabled={isPending}
                  required
                />
              </Field>

              {mode === "create" || mode === "edit" ? (
                <Field label="Installment Notes">
                  <Textarea
                    name="notes"
                    rows={4}
                    defaultValue={installment?.notes ?? ""}
                    placeholder="Describe the milestone, dependency, or payment context."
                    disabled={isPending}
                  />
                </Field>
              ) : null}

              {mode === "invoice" || mode === "review" || mode === "schedule" || mode === "mark-paid" ? (
                <>
                  <Field label="Invoice Number" required={mode === "invoice"}>
                    <Input
                      name="invoiceNumber"
                      defaultValue={installment?.invoiceNumber ?? ""}
                      readOnly={mode === "mark-paid"}
                      disabled={isPending}
                    />
                  </Field>

                  <Field label="Invoice Date" required={mode === "invoice"}>
                    <Input
                      name="invoiceDate"
                      type="date"
                      defaultValue={toDateInputValue(installment?.invoiceDate)}
                      readOnly={mode === "mark-paid"}
                      disabled={isPending}
                    />
                  </Field>

                  <Field label="Invoice Amount (SAR)" required={mode === "invoice"}>
                    <Input
                      name="invoiceAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        installment?.invoiceAmount !== null &&
                        installment?.invoiceAmount !== undefined
                          ? String(installment.invoiceAmount)
                          : installment
                            ? String(installment.amount)
                            : ""
                      }
                      readOnly={mode === "mark-paid"}
                      disabled={isPending}
                    />
                  </Field>

                  <Field label="Invoice Received Date" required={mode === "invoice"}>
                    <Input
                      name="invoiceReceivedDate"
                      type="date"
                      defaultValue={toDateInputValue(installment?.invoiceReceivedDate)}
                      readOnly={mode === "mark-paid"}
                      disabled={isPending}
                    />
                  </Field>

                  {(mode === "invoice" || mode === "review") ? (
                    <div className="md:col-span-2 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
                      <label className="inline-flex items-center gap-3 text-sm font-medium text-[var(--color-ink)]">
                        <input
                          type="checkbox"
                          name="taxInvoiceValidated"
                          defaultChecked={installment?.taxInvoiceValidated ?? false}
                          disabled={isPending}
                          className="h-4 w-4 rounded border-[var(--color-border)]"
                        />
                        Tax invoice validated
                      </label>
                    </div>
                  ) : (
                    <input
                      type="hidden"
                      name="taxInvoiceValidated"
                      value={installment?.taxInvoiceValidated ? "on" : ""}
                    />
                  )}

                  {mode === "invoice" ? (
                    <Field label="Invoice Attachment">
                      <Input
                        name="invoiceAttachment"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        disabled={isPending}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {mode === "review" ? (
                <>
                  <Field label="Finance Decision" required>
                    <Select
                      name="invoiceStatus"
                      value={invoiceDecision}
                      onChange={(event) =>
                        setInvoiceDecision(event.target.value as ReviewDecisionValue)
                      }
                      disabled={isPending}
                    >
                      {REVIEW_DECISION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Finance Review Notes">
                    <Textarea
                      name="financeReviewNotes"
                      rows={4}
                      defaultValue={installment?.financeReviewNotes ?? ""}
                      placeholder="Capture review observations, exceptions, or approval rationale."
                      disabled={isPending}
                    />
                  </Field>
                </>
              ) : null}

              {mode === "schedule" ? (
                <>
                  <input type="hidden" name="invoiceStatus" value="APPROVED_FOR_PAYMENT" />
                  <Field label="Scheduled Payment Date" required>
                    <Input
                      name="scheduledPaymentDate"
                      type="date"
                      defaultValue={toDateInputValue(installment?.scheduledPaymentDate)}
                      disabled={isPending}
                    />
                  </Field>
                  <Field label="Finance Review Notes">
                    <Textarea
                      name="financeReviewNotes"
                      rows={4}
                      defaultValue={installment?.financeReviewNotes ?? ""}
                      placeholder="Capture treasury scheduling notes or funding remarks."
                      disabled={isPending}
                    />
                  </Field>
                </>
              ) : null}

              {mode === "mark-paid" ? (
                <>
                  <Field label="Scheduled Payment Date">
                    <Input
                      name="scheduledPaymentDate"
                      type="date"
                      defaultValue={toDateInputValue(installment?.scheduledPaymentDate)}
                      readOnly
                      disabled={isPending}
                    />
                  </Field>
                  <Field label="Payment Date" required>
                    <Input
                      name="paymentDate"
                      type="date"
                      defaultValue={toDateInputValue(installment?.paymentDate ?? new Date())}
                      disabled={isPending}
                    />
                  </Field>
                  <Field label="Payment Notes">
                    <Textarea
                      name="notes"
                      rows={4}
                      defaultValue={installment?.notes ?? ""}
                      placeholder="Capture payment execution notes, transfer references, or completion remarks."
                      disabled={isPending}
                    />
                  </Field>
                </>
              ) : null}
            </div>

            <FormStateMessage state={state} />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : getSubmitLabel(mode)}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getSubmitLabel(mode: PaymentWorkflowModalMode) {
  switch (mode) {
    case "create":
      return "Create Installment";
    case "edit":
      return "Save Installment";
    case "invoice":
      return "Save Invoice";
    case "review":
      return "Save Review";
    case "schedule":
      return "Schedule Payment";
    case "mark-paid":
      return "Confirm Payment";
    default:
      return "Save";
  }
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="text-[#991b1b]"> *</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
