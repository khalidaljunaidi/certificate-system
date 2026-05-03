"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { replaceVendorRegistrationAttachmentAction } from "@/actions/vendor-registration-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormStateMessage } from "@/components/forms/form-state-message";

type VendorRegistrationAttachmentReplaceFormProps = {
  attachmentId: string;
  documentType: string;
  storagePath: string;
};

export function VendorRegistrationAttachmentReplaceForm({
  attachmentId,
  documentType,
  storagePath,
}: VendorRegistrationAttachmentReplaceFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    replaceVendorRegistrationAttachmentAction,
    EMPTY_ACTION_STATE,
  );
  const attachmentFileError = state.fieldErrors?.attachmentFile?.[0] ?? null;

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="mt-3 grid gap-3">
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <input
        type="hidden"
        name="expectedAttachmentType"
        value={documentType}
      />
      <div className="rounded-[12px] bg-[rgba(49,19,71,0.06)] px-3 py-2 text-[10px] font-medium leading-5 text-[var(--color-muted)]">
        <p>Attachment ID: {attachmentId}</p>
        <p>Document Type: {documentType}</p>
        <p className="break-all">Storage Path: {storagePath}</p>
      </div>
      <Input
        name="attachmentFile"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        required
        disabled={isPending}
        className="file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-panel-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-ink)]"
      />
      {attachmentFileError ? (
        <p className="rounded-[14px] bg-[rgba(185,28,28,0.08)] px-3 py-2 text-xs font-medium text-[#991b1b]">
          {attachmentFileError}
        </p>
      ) : null}
      <FormStateMessage state={state} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-[var(--color-muted)]">
          Use this when the old metadata exists but the stored file is missing.
          PDF, JPG, or PNG, max 10MB.
        </p>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Uploading..." : "Upload File"}
        </Button>
      </div>
    </form>
  );
}
