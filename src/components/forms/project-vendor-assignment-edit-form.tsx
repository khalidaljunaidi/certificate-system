"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { updateProjectVendorAssignmentAction } from "@/actions/project-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectVendorAssignmentEditForm({
  projectId,
  projectVendorId,
  poNumber,
  contractNumber,
  poAmount,
  defaultOpen = false,
  closeHref,
}: {
  projectId: string;
  projectVendorId: string;
  poNumber: string | null;
  contractNumber: string | null;
  poAmount: number | null;
  defaultOpen?: boolean;
  closeHref?: string;
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [formVersion, setFormVersion] = useState(0);
  const [state, formAction, isPending] = useActionState(
    updateProjectVendorAssignmentAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }

    setIsOpen(false);
    router.replace(state.redirectTo, { scroll: false });
  }, [router, state.redirectTo]);

  useEffect(() => {
    if (!isOpen || !isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeHref, defaultOpen, isOpen, router]);

  const open = () => {
    setFormVersion((current) => current + 1);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);

    if (defaultOpen && closeHref) {
      router.replace(closeHref, { scroll: false });
    }
  };

  const poNumberError = state.fieldErrors?.poNumber?.[0];
  const contractNumberError = state.fieldErrors?.contractNumber?.[0];
  const poAmountError = state.fieldErrors?.poAmount?.[0];

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={open}>
        Edit Assignment
      </Button>

      {isMounted && isOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(7,9,22,0.58)] p-4 backdrop-blur-sm"
              onClick={handleClose}
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`assignment-edit-title-${projectVendorId}`}
                className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white shadow-[0_28px_90px_rgba(17,17,17,0.24)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                      Project Assignment
                    </p>
                    <h2
                      id={`assignment-edit-title-${projectVendorId}`}
                      className="mt-2 text-2xl font-semibold text-[var(--color-ink)]"
                    >
                      Edit Assignment
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                      Update the PO reference, contract reference, and finance amount
                      used by the Payments workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close assignment edit modal"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-muted)] transition-colors hover:bg-[var(--color-panel-soft)] hover:text-[var(--color-ink)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-6">
                  <form key={formVersion} action={formAction} className="space-y-5" noValidate>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="projectVendorId" value={projectVendorId} />
                    <input
                      type="hidden"
                      name="redirectTo"
                      value={closeHref ?? `/admin/projects/${projectId}#assignment-${projectVendorId}`}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="PO Number" error={poNumberError}>
                        <Input
                          id={`poNumber-${projectVendorId}`}
                          name="poNumber"
                          defaultValue={poNumber ?? ""}
                          disabled={isPending}
                          className={poNumberError ? "border-[#c2410c] focus:border-[#c2410c] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.12)]" : undefined}
                        />
                      </Field>

                      <Field label="Contract Number" error={contractNumberError}>
                        <Input
                          id={`contractNumber-${projectVendorId}`}
                          name="contractNumber"
                          defaultValue={contractNumber ?? ""}
                          disabled={isPending}
                          className={contractNumberError ? "border-[#c2410c] focus:border-[#c2410c] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.12)]" : undefined}
                        />
                      </Field>

                      <Field
                        label="PO / Contract Amount (SAR)"
                        required
                        error={poAmountError}
                      >
                        <Input
                          id={`poAmount-${projectVendorId}`}
                          name="poAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={poAmount ?? ""}
                          placeholder="Enter the issued PO total"
                          disabled={isPending}
                          className={poAmountError ? "border-[#c2410c] focus:border-[#c2410c] focus:shadow-[0_0_0_4px_rgba(194,65,12,0.12)]" : undefined}
                        />
                      </Field>
                    </div>

                    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">
                      Saving here updates the assignment immediately and refreshes the
                      Payments module so finance totals stay in sync.
                    </div>

                    <FormStateMessage state={state} />

                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Assignment"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="text-[#991b1b]"> *</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-[#991b1b]">{error}</p>
      ) : null}
    </div>
  );
}
