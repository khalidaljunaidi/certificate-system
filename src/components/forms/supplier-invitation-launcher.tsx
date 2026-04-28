"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { sendSupplierInvitationAction } from "@/actions/supplier-invitation-actions";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VendorRegistrationCategoryOption } from "@/lib/types";

type SupplierInvitationLauncherProps = {
  registrationUrl: string;
  categories: VendorRegistrationCategoryOption[];
  triggerLabel?: string;
  postSubmitRedirect?: string;
};

export function SupplierInvitationLauncher({
  registrationUrl,
  categories,
  triggerLabel = "Invite Supplier",
  postSubmitRedirect = "/admin/vendor-registrations",
}: SupplierInvitationLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const handleOpen = () => {
    setFormVersion((current) => current + 1);
    setIsOpen(true);
  };

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        {triggerLabel}
      </Button>

      {isOpen ? (
        <InvitationModal
          key={formVersion}
          categories={categories}
          onClose={() => setIsOpen(false)}
          postSubmitRedirect={postSubmitRedirect}
          registrationUrl={registrationUrl}
        />
      ) : null}
    </>
  );
}

function InvitationModal({
  categories,
  onClose,
  postSubmitRedirect,
  registrationUrl,
}: {
  categories: VendorRegistrationCategoryOption[];
  onClose: () => void;
  postSubmitRedirect: string;
  registrationUrl: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction, isPending] = useActionState(
    sendSupplierInvitationAction,
    EMPTY_ACTION_STATE,
  );

  const copyLabel = copied ? "Copied" : "Copy Registration Link";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

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
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(7,9,22,0.58)] p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-invite-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white shadow-[0_28px_90px_rgba(17,17,17,0.24)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Supplier Invitation
            </p>
            <h2
              id="supplier-invite-title"
              className="mt-2 text-2xl font-semibold text-[var(--color-ink)]"
            >
              Send the public registration link
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Invite a supplier directly by email. The form is public, and no
              portal account is created.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close supplier invitation modal"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-muted)] transition-colors hover:bg-[var(--color-panel-soft)] hover:text-[var(--color-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-6">
          <form action={formAction} className="space-y-5" noValidate>
            <input type="hidden" name="redirectPath" value={postSubmitRedirect} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Supplier Company Name" optional>
                <Input
                  name="supplierCompanyName"
                  disabled={isPending}
                  placeholder="Optional company name"
                />
              </Field>
              <Field label="Supplier Contact Email" required>
                <Input
                  name="supplierContactEmail"
                  type="email"
                  required
                  disabled={isPending}
                  placeholder="supplier@example.com"
                />
              </Field>
              <Field label="Supplier Contact Name" optional>
                <Input
                  name="supplierContactName"
                  disabled={isPending}
                  placeholder="Optional contact name"
                />
              </Field>
              <Field label="Suggested Category" optional>
                <Select name="suggestedCategoryId" disabled={isPending} defaultValue="">
                  <option value="">No suggestion</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.code ? `${category.name} (${category.code})` : category.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Internal Note" optional fullWidth>
                <Textarea
                  name="internalNote"
                  rows={4}
                  disabled={isPending}
                  placeholder="Internal reminder for the procurement team"
                />
              </Field>
              <Field label="Custom Message" optional fullWidth>
                <Textarea
                  name="customMessage"
                  rows={4}
                  disabled={isPending}
                  placeholder="A short note that should be included in the supplier email"
                />
              </Field>
            </div>

            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">Public link only</Badge>
                <Badge variant="green">No credentials</Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                The public registration URL will be included in the email and no
                supplier account is created until the form is submitted and
                reviewed.
              </p>
              <p className="mt-2 truncate text-xs text-[var(--color-muted)]">
                {registrationUrl}
              </p>
            </div>

            <FormStateMessage state={state} />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : "Send Invitation"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCopy} disabled={isPending}>
                {copyLabel}
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

function Field({
  label,
  optional,
  required,
  fullWidth,
  children,
}: {
  label: string;
  optional?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
        <span>{label}</span>
        {required ? <span className="text-[#991b1b]">*</span> : null}
        {optional ? (
          <span className="text-xs font-normal uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Optional
          </span>
        ) : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
