"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  OperationalTaskStatusBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { OperationalTaskExecutionForm } from "@/components/forms/operational-task-execution-form";
import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DropdownActionMenu } from "@/components/ui/dropdown-action-menu";
import type {
  ActionState,
  OperationalTaskDetailView,
  OperationalTaskListItem,
  TaskLookupOptions,
} from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

type TaskActionMode = "view" | "edit" | "complete";

type TaskDetailResponse = {
  taskDetail?: OperationalTaskDetailView;
  error?: string;
};

type TaskLookupResponse = {
  lookupOptions?: TaskLookupOptions;
  error?: string;
};

export function TasksRowActions({
  task,
  canManage,
}: {
  task: OperationalTaskListItem;
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeModal, setActiveModal] = useState<TaskActionMode | null>(null);
  const [taskDetail, setTaskDetail] = useState<OperationalTaskDetailView | null>(null);
  const [lookupOptions, setLookupOptions] = useState<TaskLookupOptions | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadTaskDetail = useCallback(async () => {
    setIsLoadingDetail(true);
    setModalError(null);

    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as TaskDetailResponse;

      if (!response.ok || !payload.taskDetail) {
        throw new Error(payload.error ?? "Task details could not be loaded.");
      }

      setTaskDetail(payload.taskDetail);
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : "Task details could not be loaded.",
      );
    } finally {
      setIsLoadingDetail(false);
    }
  }, [task.id]);

  const loadLookupOptions = useCallback(async () => {
    if (lookupOptions || !canManage) {
      return;
    }

    setIsLoadingLookup(true);
    setModalError(null);

    try {
      const response = await fetch("/api/admin/tasks/lookup-options", {
        cache: "no-store",
      });
      const payload = (await response.json()) as TaskLookupResponse;

      if (!response.ok || !payload.lookupOptions) {
        throw new Error(payload.error ?? "Task edit options could not be loaded.");
      }

      setLookupOptions(payload.lookupOptions);
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : "Task edit options could not be loaded.",
      );
    } finally {
      setIsLoadingLookup(false);
    }
  }, [canManage, lookupOptions]);

  function openModal(mode: TaskActionMode) {
    setActiveModal(mode);
    setModalError(null);

    void loadTaskDetail();

    if (mode === "edit") {
      void loadLookupOptions();
    }
  }

  function closeModal() {
    setActiveModal(null);
    setModalError(null);
  }

  function handleMutationSuccess(state: ActionState) {
    setActiveModal(null);
    setTaskDetail(null);

    const params = new URLSearchParams(searchParams.toString());
    params.set("notice", state.noticeKey ?? "task-updated");
    const nextHref = `${pathname}?${params.toString()}`;

    router.replace(nextHref, { scroll: false });
  }

  return (
    <>
      <DropdownActionMenu
        triggerLabel="Actions"
        menuClassName="tg-floating-panel"
        widthClassName="w-64"
      >
        {({ closeMenu }) => (
          <>
            <MenuButton
              onClick={() => {
                closeMenu();
                openModal("view");
              }}
            >
              View Details
            </MenuButton>
            {canManage ? (
              <MenuButton
                onClick={() => {
                  closeMenu();
                  openModal("edit");
                }}
              >
                Edit Task
              </MenuButton>
            ) : null}
            {task.status !== "COMPLETED" ? (
              <MenuButton
                onClick={() => {
                  closeMenu();
                  openModal("complete");
                }}
              >
                Mark as Completed
              </MenuButton>
            ) : null}
          </>
        )}
      </DropdownActionMenu>

      {activeModal ? (
        <TaskModalShell
          title={getModalTitle(activeModal)}
          subtitle={task.title}
          onClose={closeModal}
        >
          <TaskModalContent
            mode={activeModal}
            taskDetail={taskDetail}
            lookupOptions={lookupOptions}
            canManage={canManage}
            isLoadingDetail={isLoadingDetail}
            isLoadingLookup={isLoadingLookup}
            error={modalError}
            onCancel={closeModal}
            onSuccess={handleMutationSuccess}
          />
        </TaskModalShell>
      ) : null}
    </>
  );
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-panel-soft)]"
    >
      {children}
    </button>
  );
}

function TaskModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="theme-admin fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(11,11,20,0.62)] px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_90px_rgba(11,11,20,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--accent)]">
              Procurement Task
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-main)]">
              {title}
            </h2>
            <p className="mt-1 line-clamp-1 text-sm text-[var(--text-muted)]">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-sm font-semibold text-[var(--text-main)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"
            aria-label="Close task modal"
          >
            X
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

function TaskModalContent({
  mode,
  taskDetail,
  lookupOptions,
  canManage,
  isLoadingDetail,
  isLoadingLookup,
  error,
  onCancel,
  onSuccess,
}: {
  mode: TaskActionMode;
  taskDetail: OperationalTaskDetailView | null;
  lookupOptions: TaskLookupOptions | null;
  canManage: boolean;
  isLoadingDetail: boolean;
  isLoadingLookup: boolean;
  error: string | null;
  onCancel: () => void;
  onSuccess: (state: ActionState) => void;
}) {
  if (isLoadingDetail || (mode === "edit" && isLoadingLookup)) {
    return (
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-sm text-[var(--text-muted)]">
        Loading task workspace...
      </div>
    );
  }

  if (error) {
    return (
      <TaskModalError message={error} onCancel={onCancel} />
    );
  }

  if (!taskDetail) {
    return (
      <TaskModalError
        message="Task details are not available yet. Please try again."
        onCancel={onCancel}
      />
    );
  }

  if (mode === "view") {
    return (
      <div className="space-y-5">
        <ProcurementTaskDetailsModal taskDetail={taskDetail} />
        <ModalCancelButton onCancel={onCancel} label="Close" />
      </div>
    );
  }

  if (mode === "edit") {
    if (!canManage) {
      return (
        <TaskModalError
          message="You do not have permission to edit operational tasks."
          onCancel={onCancel}
        />
      );
    }

    if (!lookupOptions) {
      return (
        <TaskModalError
          message="Task edit options are not available yet. Please try again."
          onCancel={onCancel}
        />
      );
    }

    return (
      <div className="space-y-5">
        <OperationalTaskForm
          task={taskDetail}
          lookupOptions={lookupOptions}
          canManage={canManage}
          redirectOnSuccess={false}
          onSuccess={onSuccess}
        />
        <ModalCancelButton onCancel={onCancel} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CompleteProcurementTaskModal
        taskDetail={taskDetail}
        onSuccess={onSuccess}
      />
      <ModalCancelButton onCancel={onCancel} />
    </div>
  );
}

function ProcurementTaskDetailsModal({
  taskDetail,
}: {
  taskDetail: OperationalTaskDetailView;
}) {
  const { task } = taskDetail;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <OperationalTaskStatusBadge status={task.status} />
          {task.status === "COMPLETED" ? (
            <Chip tone="green">Completed</Chip>
          ) : (
            <TaskSlaStatusBadge status={task.slaStatus} />
          )}
          <Chip tone={getPriorityTone(task.priority)}>{task.priority}</Chip>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-main)]">
          {task.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TaskDetailField label="Assigned To" value={task.assignedTo.name} helper={task.assignedTo.title} />
        <TaskDetailField label="Assigned By" value={task.assignedBy.name} helper={task.assignedBy.title} />
        <TaskDetailField label="Due Date" value={formatDate(task.dueDate)} helper={task.completedAt ? `Completed ${formatDateTime(task.completedAt)}` : "Open task"} />
        <TaskDetailField label="Monthly Cycle" value={task.monthlyCycle?.label ?? "No monthly cycle"} helper={task.monthlyCycle?.status.replaceAll("_", " ") ?? "Not linked"} />
        <TaskDetailField label="Project" value={task.linkedProject?.projectName ?? "No project link"} helper={task.linkedProject?.projectCode ?? "Not linked"} />
        <TaskDetailField label="Vendor" value={task.linkedVendor?.vendorName ?? "No vendor link"} helper={task.linkedVendor?.vendorId ?? "Not linked"} />
        <TaskDetailField label="PO / Contract" value={task.linkedProjectVendor?.poNumber ?? "No PO"} helper={task.linkedProjectVendor?.contractNumber ?? "No contract"} />
        <TaskDetailField label="Certificate" value={task.linkedCertificate?.certificateCode ?? "No certificate"} helper={task.linkedCertificate?.status.replaceAll("_", " ") ?? "Not linked"} />
      </div>

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--text-muted)]">
          Checklist
        </p>
        <div className="mt-3 space-y-2">
          {taskDetail.checklistItems.length > 0 ? (
            taskDetail.checklistItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3"
              >
                <span className="text-sm font-medium text-[var(--text-main)]">
                  {item.label}
                </span>
                <Chip tone={item.completed ? "green" : "neutral"}>
                  {item.completed ? "Completed" : "Open"}
                </Chip>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No checklist items recorded.</p>
          )}
        </div>
      </div>

      {task.executionResult ? (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--text-muted)]">
            Completion Note
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-main)]">
            {task.executionResult}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function CompleteProcurementTaskModal({
  taskDetail,
  onSuccess,
}: {
  taskDetail: OperationalTaskDetailView;
  onSuccess: (state: ActionState) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
        <p className="text-sm font-semibold text-[var(--text-main)]">
          Confirm task completion
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Mark this procurement task as completed after the execution result and
          checklist are ready. Completed tasks are removed from overdue and SLA-risk
          exposure.
        </p>
      </div>
      <OperationalTaskExecutionForm
        task={taskDetail}
        redirectOnSuccess={false}
        onSuccess={onSuccess}
      />
    </div>
  );
}

function TaskDetailField({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--text-main)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-[var(--text-muted)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function TaskModalError({
  message,
  onCancel,
}: {
  message: string;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-5">
      <div
        role="alert"
        className="rounded-[24px] border border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.06)] p-5 text-sm leading-6 text-[#991b1b]"
      >
        {message}
      </div>
      <ModalCancelButton onCancel={onCancel} label="Close" />
    </div>
  );
}

function ModalCancelButton({
  onCancel,
  label = "Cancel",
}: {
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="flex justify-end border-t border-[var(--border)] pt-4">
      <Button type="button" variant="secondary" onClick={onCancel}>
        {label}
      </Button>
    </div>
  );
}

function getModalTitle(mode: TaskActionMode) {
  if (mode === "edit") {
    return "Edit Task";
  }

  if (mode === "complete") {
    return "Mark as Completed";
  }

  return "Task Details";
}

function getPriorityTone(priority: OperationalTaskListItem["priority"]) {
  return priority === "URGENT"
    ? "red"
    : priority === "HIGH"
      ? "orange"
      : priority === "MEDIUM"
        ? "purple"
        : "neutral";
}
