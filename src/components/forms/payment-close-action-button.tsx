"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { closePaymentAction } from "@/actions/project-payment-actions";
import { Button, type ButtonProps } from "@/components/ui/button";

type PaymentCloseActionButtonProps = {
  projectVendorId: string;
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  showInlineFeedback?: boolean;
  onSuccess?: () => void;
};

export function PaymentCloseActionButton({
  projectVendorId,
  disabled = false,
  disabledReason = "Payment cannot be closed until all installments are fully paid",
  label = "Close Payment",
  pendingLabel = "Closing...",
  variant = "default",
  size = "default",
  className,
  showInlineFeedback = true,
  onSuccess,
}: PaymentCloseActionButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const isDisabled = disabled || isPending;

  function refreshWithSuccessToast() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("notice", "payment-record-closed");
    const nextHref = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;

    router.replace(nextHref, { scroll: false });
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-2" title={disabled ? disabledReason : undefined}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={() => {
          setActionError(null);

          startTransition(async () => {
            const result = await closePaymentAction(projectVendorId);

            if (result.error) {
              setActionError(`Cannot close payment: ${result.error}`);
              return;
            }

            onSuccess?.();
            refreshWithSuccessToast();
          });
        }}
      >
        {isPending ? pendingLabel : label}
      </Button>

      {showInlineFeedback && actionError ? (
        <span
          role="alert"
          className="max-w-xs rounded-[14px] border border-[rgba(185,28,28,0.16)] bg-[rgba(185,28,28,0.06)] px-3 py-2 text-xs leading-5 text-[#991b1b]"
        >
          {actionError}
        </span>
      ) : null}
    </span>
  );
}
