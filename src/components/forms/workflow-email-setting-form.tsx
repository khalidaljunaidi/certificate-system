"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowEmailEvent } from "@prisma/client";

import { updateWorkflowEmailSettingAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function WorkflowEmailSettingForm({
  event,
  title,
  description,
  primaryToLabels,
  primaryCcLabels,
  fallbackToLabels,
  fallbackCcLabels,
  enabled,
  includeDefaultTo,
  includeDefaultCc,
  toEmails,
  ccEmails,
}: {
  event: WorkflowEmailEvent;
  title: string;
  description: string;
  primaryToLabels: string[];
  primaryCcLabels: string[];
  fallbackToLabels: string[];
  fallbackCcLabels: string[];
  enabled: boolean;
  includeDefaultTo: boolean;
  includeDefaultCc: boolean;
  toEmails: string[];
  ccEmails: string[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateWorkflowEmailSettingAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="event" value={event} />

      <div>
        <p className="text-base font-semibold text-[var(--color-ink)]">{title}</p>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          {description}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Automatic Primary Routing
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {primaryToLabels.length > 0 ? (
              primaryToLabels.map((label) => (
                <span
                  key={`to-${label}`}
                  className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]"
                >
                  To: {label}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--color-muted)]">
                No automatic primary recipient rule is configured.
              </span>
            )}
            {primaryCcLabels.map((label) => (
              <span
                key={`cc-${label}`}
                className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-ink)]"
              >
                Cc: {label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Fallback Routing
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fallbackToLabels.length > 0 ? (
              fallbackToLabels.map((label) => (
                <span
                  key={`fallback-to-${label}`}
                  className="inline-flex rounded-full bg-[rgba(49,19,71,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]"
                >
                  To: {label}
                </span>
              ))
            ) : null}
            {fallbackCcLabels.map((label) => (
              <span
                key={`fallback-cc-${label}`}
                className="inline-flex rounded-full bg-[rgba(49,19,71,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]"
              >
                Cc: {label}
              </span>
            ))}
            {fallbackToLabels.length === 0 && fallbackCcLabels.length === 0 ? (
              <span className="text-sm text-[var(--color-muted)]">
                This workflow relies on the automatic entity routing above unless
                you configure fallback recipients below.
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          Enable this workflow email
        </label>
        <label className="flex items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input
            type="checkbox"
            name="includeDefaultTo"
            defaultChecked={includeDefaultTo}
          />
          Allow fallback To routing
        </label>
        <label className="flex items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input
            type="checkbox"
            name="includeDefaultCc"
            defaultChecked={includeDefaultCc}
          />
          Allow fallback CC routing
        </label>
      </div>

      <div className="rounded-[20px] border border-[rgba(49,19,71,0.12)] bg-[rgba(49,19,71,0.04)] px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">
        Automatic project, evaluation, task, and assignment recipients are
        resolved first. The fallback recipients below are used only when the
        entity-specific routing above cannot produce a recipient for this
        workflow.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Label htmlFor={`${event}-to`}>Fallback To Recipients</Label>
          <Textarea
            id={`${event}-to`}
            name="toEmails"
            defaultValue={toEmails.join("\n")}
            placeholder="Use only as fallback when automatic primary routing cannot resolve a recipient."
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor={`${event}-cc`}>Fallback CC Recipients</Label>
          <Textarea
            id={`${event}-cc`}
            name="ccEmails"
            defaultValue={ccEmails.join("\n")}
            placeholder="Use only as fallback when automatic copy routing cannot resolve a recipient."
            disabled={isPending}
          />
        </div>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Routing"}
      </Button>
    </form>
  );
}
