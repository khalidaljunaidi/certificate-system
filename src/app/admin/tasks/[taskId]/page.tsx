import Link from "next/link";
import { notFound } from "next/navigation";

import {
  OperationalTaskStatusBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { OperationalTaskExecutionForm } from "@/components/forms/operational-task-execution-form";
import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { requireAdminSession } from "@/lib/auth";
import {
  OPERATIONAL_TASK_PRIORITY_OPTIONS,
  OPERATIONAL_TASK_TYPE_OPTIONS,
} from "@/lib/constants";
import { canManageOperationalTasks } from "@/lib/permissions";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  getOperationalTaskDetail,
  getTaskLookupOptions,
} from "@/server/queries/task-queries";

type TaskDetailPageProps = {
  params: Promise<{
    taskId: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const session = await requireAdminSession();
  const { taskId } = await params;
  const [task, lookupOptions] = await Promise.all([
    getOperationalTaskDetail(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
        permissions: session.user.permissions,
      },
      taskId,
    ),
    getTaskLookupOptions(),
  ]);

  if (!task) {
    notFound();
  }

  const canManage = canManageOperationalTasks(session.user);
  const checklistPercent = `${task.task.checklistCompletionPercent.toFixed(0)}%`;
  const description = task.task.description.trim();
  const headerSubtitle = [
    getTaskTypeLabel(task.task.type),
    `Assigned to ${task.task.assignedTo.name}`,
    `Due ${formatDate(task.task.dueDate)}`,
  ].join(" · ");

  const linkedActions = [
    task.task.linkedProject
      ? {
          href: `/admin/projects/${task.task.linkedProject.id}`,
          label: "Open Project",
        }
      : null,
    task.task.linkedVendor
      ? {
          href: `/admin/vendors/${task.task.linkedVendor.id}`,
          label: "Open Vendor",
        }
      : null,
    task.task.monthlyCycle
      ? {
          href: `/admin/performance?cycleId=${task.task.monthlyCycle.id}`,
          label: "Open Monthly Governance",
        }
      : null,
    task.task.linkedCertificate
      ? {
          href: task.task.href,
          label: "Open Certificate",
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operational Tasks"
        title={task.task.title}
        description={headerSubtitle}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/tasks">Back to Tasks</Link>
            </Button>
            {linkedActions.map((action) => (
              <Button key={action.href} asChild variant="secondary">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </>
        }
        metrics={
          <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
            <OperationalTaskStatusBadge status={task.task.status} />
            <TaskSlaStatusBadge status={task.task.slaStatus} />
            <Chip tone={getPriorityTone(task.task.priority)}>
              {getTaskPriorityLabel(task.task.priority)}
            </Chip>
            <Chip tone={getTypeTone(task.task.type)}>{getTaskTypeLabel(task.task.type)}</Chip>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="tg-meta-label">Task Brief</p>
                  <CardTitle>Execution Overview</CardTitle>
                  <p className="tg-helper-text max-w-3xl">
                    {description || "No additional task brief was provided for this assignment."}
                  </p>
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-3">
                  <MetricCard
                    label="Checklist"
                    value={checklistPercent}
                    helper={`${task.task.completedChecklistItemsCount} of ${task.task.checklistItemsCount} steps`}
                  />
                  <MetricCard
                    label="Hours Remaining"
                    value={formatHoursRemaining(task.task.remainingHoursToDueDate)}
                    helper={task.task.status === "COMPLETED" ? "Task already completed" : "Until due date"}
                  />
                  <MetricCard
                    label="Reopened"
                    value={`${task.task.reopenedCount}`}
                    helper="Governance resets"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 xl:grid-cols-3">
              <MicroField label="Assignee" value={task.task.assignedTo.name} hint={task.task.assignedTo.title} />
              <MicroField label="Assigned by" value={task.task.assignedBy.name} hint={task.task.assignedBy.title} />
              <MicroField label="Due date" value={formatDate(task.task.dueDate)} />
              <MicroField label="Start date" value={formatOptionalDate(task.task.startDate)} />
              <MicroField label="Completed at" value={formatOptionalDateTime(task.task.completedAt)} />
              <MicroField label="Monthly cycle" value={task.task.monthlyCycle?.label ?? "Not linked"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-5">
              <div className="space-y-2">
                <p className="tg-meta-label">Execution Flow</p>
                <CardTitle>Checklist and Execution Result</CardTitle>
                <p className="tg-helper-text">
                  Keep the working evidence, completion gates, and execution narrative in one place.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="tg-micro-stack">
                <div className="flex items-center justify-between gap-4">
                  <p className="tg-micro-label tg-micro-label--caps">Completion Progress</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{checklistPercent}</p>
                </div>
                <div className="h-2.5 rounded-full bg-[rgba(17,17,17,0.06)]">
                  <div
                    className={cn(
                      "h-full rounded-full bg-[var(--color-primary)] transition-all duration-300",
                      task.task.checklistCompletionPercent >= 100 ? "bg-[var(--color-success)]" : "",
                    )}
                    style={{ width: `${Math.min(task.task.checklistCompletionPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {task.checklistItems.length > 0 ? (
                  task.checklistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                          item.completed
                            ? "bg-[rgba(21,128,61,0.14)] text-[var(--color-success)]"
                            : "bg-white text-[var(--color-muted)]",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--color-ink)]">
                            {item.label}
                          </p>
                          <Chip tone={item.completed ? "green" : "neutral"} size="sm">
                            {item.completed ? "Done" : "Open"}
                          </Chip>
                        </div>
                        <p className="tg-helper-text">
                          {item.completedAt
                            ? `Completed ${formatDateTime(item.completedAt)}`
                            : "Pending completion"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="tg-empty-state">
                    No checklist items were added to this task yet.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                <div className="tg-micro-stack">
                  <p className="tg-micro-label tg-micro-label--caps">Execution Result</p>
                  <p className="text-sm leading-7 text-[var(--color-ink)]">
                    {task.task.executionResult ?? "No execution result has been recorded yet."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)] pb-5">
              <div className="space-y-2">
                <p className="tg-meta-label">Linked Context</p>
                <CardTitle>Project, Vendor, and Governance Links</CardTitle>
                <p className="tg-helper-text">
                  Connected records stay visible here so task execution remains anchored to the right commercial context.
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <LinkedContextField
                label="Project"
                value={
                  task.task.linkedProject
                    ? `${task.task.linkedProject.projectCode} · ${task.task.linkedProject.projectName}`
                    : "Not linked"
                }
              />
              <LinkedContextField
                label="Vendor"
                value={
                  task.task.linkedVendor
                    ? `${task.task.linkedVendor.vendorId} · ${task.task.linkedVendor.vendorName}`
                    : "Not linked"
                }
              />
              <LinkedContextField
                label="PO Number"
                value={task.task.linkedProjectVendor?.poNumber ?? "Not linked"}
              />
              <LinkedContextField
                label="Contract Number"
                value={task.task.linkedProjectVendor?.contractNumber ?? "Not linked"}
              />
              <LinkedContextField
                label="Certificate"
                value={
                  task.task.linkedCertificate
                    ? `${task.task.linkedCertificate.certificateCode} · ${task.task.linkedCertificate.status.replaceAll("_", " ")}`
                    : "Not linked"
                }
              />
              <LinkedContextField
                label="Context Route"
                value={task.task.href.replace("/admin/", "").replaceAll("/", " / ")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="xl:sticky xl:top-28">
            <CardHeader className="border-b border-[var(--color-border)] pb-5">
              <div className="space-y-2">
                <p className="tg-meta-label">Workspace Summary</p>
                <CardTitle>Governance Snapshot</CardTitle>
                <p className="tg-helper-text">
                  Operational controls, routing history, and SLA monitoring stay visible beside the active task form.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <MicroField label="Status" value={task.task.status.replaceAll("_", " ")} />
                <MicroField label="SLA" value={task.task.slaStatus.replaceAll("_", " ")} />
                <MicroField label="Priority" value={getTaskPriorityLabel(task.task.priority)} />
                <MicroField label="Type" value={getTaskTypeLabel(task.task.type)} />
                <MicroField
                  label="Checklist Rule"
                  value={task.task.requiresChecklistCompletion ? "Checklist required" : "Optional checklist"}
                />
                <MicroField
                  label="Elapsed Hours"
                  value={`${task.task.elapsedHoursSinceAssignment.toFixed(1)}h`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MicroField
                  label="Due Soon Alert"
                  value={formatOptionalDateTime(task.task.dueSoonNotifiedAt)}
                />
                <MicroField
                  label="Overdue Escalation"
                  value={formatOptionalDateTime(task.task.overdueNotifiedAt)}
                />
                <MicroField
                  label="Last Status Update"
                  value={formatOptionalDateTime(task.task.lastStatusChangedAt)}
                />
                <MicroField
                  label="Updated At"
                  value={formatOptionalDateTime(task.task.updatedAt)}
                />
              </div>
            </CardContent>
          </Card>

          <Card id="task-action-panel" className="scroll-mt-28">
            <CardHeader className="border-b border-[var(--color-border)] pb-5">
              <div className="space-y-2">
                <p className="tg-meta-label">Task Workspace</p>
                <CardTitle>{canManage ? "Edit Task" : "Execution Update"}</CardTitle>
                <p className="tg-helper-text">
                  {canManage
                    ? "Adjust scope, ownership, due dates, and linked governance context from this side panel."
                    : "Record the execution result and complete the checklist before closing your assigned task."}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {canManage ? (
                <OperationalTaskForm
                  task={task}
                  lookupOptions={lookupOptions}
                  canManage={canManage}
                />
              ) : (
                <OperationalTaskExecutionForm task={task} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
      <div className="tg-micro-stack">
        <p className="tg-micro-label tg-micro-label--caps">{label}</p>
        <p className="truncate text-xl font-semibold tracking-tight text-[var(--color-ink)]">
          {value}
        </p>
        <p className="tg-helper-text">{helper}</p>
      </div>
    </div>
  );
}

function MicroField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="tg-micro-stack min-w-0 rounded-[20px] border border-[var(--color-border)] bg-white px-4 py-4">
      <p className="tg-micro-label">{label}</p>
      <p className="tg-micro-value break-words">{value}</p>
      {hint ? <p className="tg-helper-text">{hint}</p> : null}
    </div>
  );
}

function LinkedContextField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="tg-micro-stack min-w-0 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
      <p className="tg-micro-label">{label}</p>
      <p className="text-sm font-semibold leading-6 text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function getTaskPriorityLabel(priority: string) {
  return (
    OPERATIONAL_TASK_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ??
    priority.replaceAll("_", " ")
  );
}

function getTaskTypeLabel(type: string) {
  return (
    OPERATIONAL_TASK_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type.replaceAll("_", " ")
  );
}

function getPriorityTone(priority: string) {
  if (priority === "URGENT") {
    return "red";
  }

  if (priority === "HIGH") {
    return "orange";
  }

  if (priority === "MEDIUM") {
    return "purple";
  }

  return "neutral";
}

function getTypeTone(type: string) {
  if (type === "FINANCE") {
    return "green";
  }

  if (type === "PROCUREMENT") {
    return "purple";
  }

  if (type === "VENDOR") {
    return "orange";
  }

  return "neutral";
}

function formatOptionalDate(value: Date | null) {
  return value ? formatDate(value) : "Not scheduled";
}

function formatOptionalDateTime(value: Date | null) {
  return value ? formatDateTime(value) : "Not recorded";
}

function formatHoursRemaining(value: number | null) {
  if (value === null) {
    return "Closed";
  }

  if (value < 0) {
    return `${Math.abs(value).toFixed(1)}h overdue`;
  }

  return `${value.toFixed(1)}h`;
}
