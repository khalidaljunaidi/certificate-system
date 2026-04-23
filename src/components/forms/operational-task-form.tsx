"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { saveOperationalTaskAction } from "@/actions/task-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  OPERATIONAL_TASK_PRIORITY_OPTIONS,
  OPERATIONAL_TASK_STATUS_OPTIONS,
  OPERATIONAL_TASK_TYPE_OPTIONS,
} from "@/lib/constants";
import type {
  OperationalTaskDetailView,
  TaskLookupOptions,
} from "@/lib/types";

type ChecklistDraftItem = {
  id?: string;
  label: string;
  completed: boolean;
  orderIndex: number;
};

function toInputDate(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function OperationalTaskForm({
  task,
  lookupOptions,
  canManage,
}: {
  task?: OperationalTaskDetailView;
  lookupOptions: TaskLookupOptions;
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveOperationalTaskAction,
    EMPTY_ACTION_STATE,
  );
  const [checklistItems, setChecklistItems] = useState<ChecklistDraftItem[]>(
    task?.checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      completed: item.completed,
      orderIndex: item.orderIndex,
    })) ?? [{ label: "", completed: false, orderIndex: 0 }],
  );
  const [linkedProjectId, setLinkedProjectId] = useState(
    task?.task.linkedProject?.id ?? "",
  );
  const [linkedVendorId, setLinkedVendorId] = useState(
    task?.task.linkedVendor?.id ?? "",
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  const filteredAssignments = useMemo(
    () =>
      lookupOptions.assignments.filter(
        (assignment) =>
          (!linkedProjectId || assignment.projectId === linkedProjectId) &&
          (!linkedVendorId || assignment.vendorId === linkedVendorId),
      ),
    [linkedProjectId, linkedVendorId, lookupOptions.assignments],
  );
  const filteredCertificates = useMemo(
    () =>
      lookupOptions.certificates.filter(
        (certificate) =>
          (!linkedProjectId || certificate.projectId === linkedProjectId) &&
          (!linkedVendorId || certificate.vendorId === linkedVendorId),
      ),
    [linkedProjectId, linkedVendorId, lookupOptions.certificates],
  );

  return (
    <form action={formAction} className="space-y-6">
      {task ? <input type="hidden" name="taskId" value={task.task.id} /> : null}
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

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <Label htmlFor="task-title">Task Title</Label>
          <Input
            id="task-title"
            name="title"
            defaultValue={task?.task.title}
            disabled={isPending}
            required
          />
        </div>
        <div className="xl:col-span-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            name="description"
            defaultValue={task?.task.description}
            disabled={isPending}
            required
          />
        </div>
        <div>
          <Label htmlFor="task-type">Task Type</Label>
          <Select
            id="task-type"
            name="type"
            defaultValue={task?.task.type ?? "CUSTOM"}
            disabled={isPending || !canManage}
          >
            {OPERATIONAL_TASK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="task-assignee">Assigned To</Label>
          <Select
            id="task-assignee"
            name="assignedToUserId"
            defaultValue={task?.task.assignedTo.id ?? lookupOptions.users[0]?.id ?? ""}
            disabled={isPending || !canManage}
          >
            {lookupOptions.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} | {user.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="task-cycle">Monthly Cycle</Label>
          <Select
            id="task-cycle"
            name="monthlyCycleId"
            defaultValue={task?.task.monthlyCycle?.id ?? lookupOptions.monthlyCycles.find((cycle) => cycle.isActive)?.id ?? ""}
            disabled={isPending}
          >
            <option value="">No monthly cycle</option>
            {lookupOptions.monthlyCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.label} | {cycle.status.replaceAll("_", " ")}
                {cycle.isActive ? " | Active" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            id="task-priority"
            name="priority"
            defaultValue={task?.task.priority ?? "MEDIUM"}
            disabled={isPending}
          >
            {OPERATIONAL_TASK_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="task-status">Status</Label>
          <Select
            id="task-status"
            name="status"
            defaultValue={task?.task.status ?? "NOT_STARTED"}
            disabled={isPending}
          >
            {OPERATIONAL_TASK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="task-start-date">Start Date</Label>
          <Input
            id="task-start-date"
            name="startDate"
            type="date"
            defaultValue={toInputDate(task?.task.startDate)}
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            name="dueDate"
            type="date"
            defaultValue={toInputDate(task?.task.dueDate)}
            disabled={isPending}
            required
          />
        </div>
        <div>
          <Label htmlFor="linked-project">Linked Project</Label>
          <Select
            id="linked-project"
            name="linkedProjectId"
            value={linkedProjectId}
            onChange={(event) => setLinkedProjectId(event.target.value)}
            disabled={isPending}
          >
            <option value="">No project link</option>
            {lookupOptions.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} | {project.projectName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="linked-vendor">Linked Vendor</Label>
          <Select
            id="linked-vendor"
            name="linkedVendorId"
            value={linkedVendorId}
            onChange={(event) => setLinkedVendorId(event.target.value)}
            disabled={isPending}
          >
            <option value="">No vendor link</option>
            {lookupOptions.vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.vendorName} | {vendor.vendorId}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="linked-assignment">Linked Assignment</Label>
          <Select
            id="linked-assignment"
            name="linkedProjectVendorId"
            defaultValue={task?.task.linkedProjectVendor?.id ?? ""}
            disabled={isPending}
          >
            <option value="">No assignment link</option>
            {filteredAssignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.vendorLabel} | {assignment.poNumber ?? "No PO"}
                {assignment.contractNumber ? ` | ${assignment.contractNumber}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="linked-certificate">Linked Certificate</Label>
          <Select
            id="linked-certificate"
            name="linkedCertificateId"
            defaultValue={task?.task.linkedCertificate?.id ?? ""}
            disabled={isPending}
          >
            <option value="">No certificate link</option>
            {filteredCertificates.map((certificate) => (
              <option key={certificate.id} value={certificate.id}>
                {certificate.certificateCode} | {certificate.status.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-[var(--color-ink)]">
        <input
          type="checkbox"
          name="requiresChecklistCompletion"
          defaultChecked={task?.task.requiresChecklistCompletion ?? true}
          disabled={isPending}
        />
        Require checklist completion before the task can be marked complete
      </label>

      <div className="space-y-3 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Operational Checklist
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Break operational execution into verifiable checklist steps.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setChecklistItems((current) => [
                ...current,
                {
                  label: "",
                  completed: false,
                  orderIndex: current.length,
                },
              ])
            }
          >
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <div
              key={`${item.id ?? "new"}-${index}`}
              className="rounded-[22px] border border-[var(--color-border)] bg-white p-4"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <Input
                  value={item.label}
                  onChange={(event) =>
                    setChecklistItems((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, label: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  placeholder={`Checklist item ${index + 1}`}
                  disabled={isPending}
                />
                <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
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
                  />
                  Completed
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setChecklistItems((current) =>
                      current.filter((_, entryIndex) => entryIndex !== index),
                    )
                  }
                  disabled={isPending || checklistItems.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending
          ? task
            ? "Saving..."
            : "Creating..."
          : task
            ? "Save Task"
            : "Create Task"}
      </Button>
    </form>
  );
}
