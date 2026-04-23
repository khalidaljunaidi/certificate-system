"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowEmailEvent } from "@prisma/client";

import { updateWorkflowEmailSettingAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkflowEmailGroupView } from "@/lib/types";

function normalizeEmailList(value: string) {
  return value
    .split(/[\n,;]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function mergeEmailLists(current: string, additions: string[]) {
  return [...new Set([...normalizeEmailList(current), ...additions])].join("\n");
}

export function WorkflowEmailSettingForm({
  event,
  title,
  description,
  primaryToLabels,
  primaryCcLabels,
  enabled,
  includeDefaultTo,
  includeDefaultCc,
  toEmails,
  ccEmails,
  notificationGroups,
}: {
  event: WorkflowEmailEvent;
  title: string;
  description: string;
  primaryToLabels: string[];
  primaryCcLabels: string[];
  enabled: boolean;
  includeDefaultTo: boolean;
  includeDefaultCc: boolean;
  toEmails: string[];
  ccEmails: string[];
  notificationGroups: WorkflowEmailGroupView[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateWorkflowEmailSettingAction,
    EMPTY_ACTION_STATE,
  );
  const [toValue, setToValue] = useState(toEmails.join("\n"));
  const [ccValue, setCcValue] = useState(ccEmails.join("\n"));

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="event" value={event} />
      <input
        type="hidden"
        name="includeDefaultTo"
        value={includeDefaultTo ? "on" : "off"}
      />
      <input
        type="hidden"
        name="includeDefaultCc"
        value={includeDefaultCc ? "on" : "off"}
      />

      <div className="space-y-2">
        <p className="text-base font-semibold text-[var(--color-ink)]">{title}</p>
        <p className="text-sm leading-7 text-[var(--color-muted)]">
          {description}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Entity-aware routing
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
                No automatic To recipient is resolved for this workflow.
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

        <div className="rounded-[20px] border border-[rgba(49,19,71,0.12)] bg-[rgba(49,19,71,0.04)] p-4 text-sm leading-7 text-[var(--color-muted)]">
          These recipients are explicit additions, not fallback routing. The
          workflow sends only when the final To list has at least one recipient.
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          Enable this workflow email
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${event}-to`}>To Recipients</Label>
            <span className="text-xs text-[var(--color-muted)]">
              Manual emails and groups only
            </span>
          </div>
          <Textarea
            id={`${event}-to`}
            name="toEmails"
            value={toValue}
            onChange={(event) => setToValue(event.target.value)}
            placeholder="Add explicit recipients, one per line."
            disabled={isPending}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${event}-cc`}>CC Recipients</Label>
            <span className="text-xs text-[var(--color-muted)]">
              Manual copies only
            </span>
          </div>
          <Textarea
            id={`${event}-cc`}
            name="ccEmails"
            value={ccValue}
            onChange={(event) => setCcValue(event.target.value)}
            placeholder="Add explicit CC recipients, one per line."
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-[var(--color-border)] bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Recipient groups
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            Add the live members of a manually managed group to To or CC
            without giving them any workflow permissions.
          </p>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {notificationGroups.map((group) => {
            const activeEmails = group.activeMembers.map((member) => member.email);
            const disabled = activeEmails.length === 0;

            return (
              <div
                key={group.key}
                className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
              >
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {group.name}
                </p>
                <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                  {group.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.activeMembers.length > 0 ? (
                    group.activeMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
                      >
                        <span>{member.name}</span>
                        <span className="text-[11px] font-medium text-[var(--color-muted)]">
                          {member.email}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--color-muted)]">
                      No active members configured yet.
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled || isPending}
                    onClick={() =>
                      setToValue((current) => mergeEmailLists(current, activeEmails))
                    }
                  >
                    Add to To
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled || isPending}
                    onClick={() =>
                      setCcValue((current) => mergeEmailLists(current, activeEmails))
                    }
                  >
                    Add to CC
                  </Button>
                </div>
                {disabled ? (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    No active addresses are configured for this group yet.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {activeEmails.length} recipient
                    {activeEmails.length === 1 ? "" : "s"} available.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Routing"}
      </Button>
    </form>
  );
}
