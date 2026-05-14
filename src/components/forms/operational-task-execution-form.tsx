"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { updateOperationalTaskExecutionAction } from "@/actions/task-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import type { ActionState, OperationalTaskDetailView } from "@/lib/types";

type ChecklistDraftItem = {
  id?: string;
  label: string;
  completed: boolean;
  orderIndex: number;
};

export function OperationalTaskExecutionForm({
  task,
  onSuccess,
  redirectOnSuccess = true,
}: {
  task: OperationalTaskDetailView;
  onSuccess?: (state: ActionState) => void;
  redirectOnSuccess?: boolean;
}) {
  const router = useRouter();
  const handledSuccessRef = useRef<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    updateOperationalTaskExecutionAction,
    EMPTY_ACTION_STATE,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState(
    task.task.executionResult ?? "",
  );
  const [checklistItems, setChecklistItems] = useState<ChecklistDraftItem[]>(
    task.checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      completed: item.completed,
      orderIndex: item.orderIndex,
    })),
  );

  useEffect(() => {
    if (!state.success && !state.redirectTo) {
      return;
    }

    const successKey = `${state.noticeKey ?? ""}:${state.redirectTo ?? ""}:${state.success ?? ""}`;

    if (handledSuccessRef.current === successKey) {
      return;
    }

    handledSuccessRef.current = successKey;

    if (!redirectOnSuccess) {
      onSuccess?.(state);
      router.refresh();
      return;
    }

    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [onSuccess, redirectOnSuccess, router, state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError(null);

    if (
      task.task.requiresChecklistCompletion &&
      checklistItems.some((item) => !item.completed)
    ) {
      event.preventDefault();
      setClientError("Complete every checklist item before marking the task as completed.");
    }
  }

  if (task.task.status === "COMPLETED") {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Task completed
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            This task is locked because it has already been completed.
          </p>
          <p className="mt-4 text-sm font-medium text-[var(--color-ink)]">
            Result recorded at {formatDateTime(task.task.completedAt)}
          </p>
        </div>
        {task.task.executionResult ? (
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Execution Result
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink)]">
              {task.task.executionResult}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="taskId" value={task.task.id} />
      <input
        type="hidden"
        name="checklistPayload"
        value={JSON.stringify(
          checklistItems.map((item, index) => ({
            ...item,
            orderIndex: index,
          })),
        )}
      />

      <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Execution result
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Describe the outcome of the work before marking the task as completed.
        </p>
        <Textarea
          name="executionResult"
          value={executionResult}
          onChange={(event) => setExecutionResult(event.target.value)}
          placeholder="Summarize what was done, any blockers, and the final outcome."
          className="mt-4 min-h-[140px]"
          disabled={isPending}
          required
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          Checklist completion
        </p>
        <p className="text-sm leading-7 text-[var(--color-muted)]">
          Check every step that was completed as part of the execution result.
        </p>
        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <label
              key={`${item.id ?? "new"}-${index}`}
              className="flex items-start gap-3 rounded-[22px] border border-[var(--color-border)] bg-white p-4"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(event) =>
                  setChecklistItems((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, completed: event.target.checked }
                        : entry,
                    ),
                  )
                }
                disabled={isPending}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--color-ink)]">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs text-[var(--color-muted)]">
                  {item.completed ? "Completed" : "Open"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {clientError ? (
        <div
          role="alert"
          className="rounded-[18px] border border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.06)] px-4 py-3 text-sm leading-6 text-[#991b1b]"
        >
          {clientError}
        </div>
      ) : null}

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Completing..." : "Mark as Completed"}
      </Button>
    </form>
  );
}
