import Form from "next/form";
import Link from "next/link";

import {
  OperationalTaskStatusBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { TasksRowActions } from "@/components/admin/tasks-row-actions";
import { OperationalTaskModalLauncher } from "@/components/forms/operational-task-modal-launcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TableHeaderLabel } from "@/components/ui/table-header-label";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { requireAdminSession } from "@/lib/auth";
import {
  OPERATIONAL_TASK_PRIORITY_OPTIONS,
  OPERATIONAL_TASK_STATUS_OPTIONS,
} from "@/lib/constants";
import { canManageOperationalTasks } from "@/lib/permissions";
import type { OperationalTaskListItem, TaskLookupOptions } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  getOperationalTasksForViewer,
  getTaskLookupOptions,
} from "@/server/queries/task-queries";

type TasksPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    priority?: string;
    assignedToUserId?: string;
    cycleId?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const [tasks, lookupOptions] = await Promise.all([
    getOperationalTasksForViewer(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
        permissions: session.user.permissions,
      },
      params,
      { limit: 100 },
    ),
    getTaskLookupOptions(),
  ]);

  const canManage = canManageOperationalTasks(session.user);
  const selectedCycle =
    lookupOptions.monthlyCycles.find((cycle) => cycle.id === params.cycleId) ??
    lookupOptions.monthlyCycles.find((cycle) => cycle.isActive) ??
    null;

  const kpis = {
    totalTasks: tasks.length,
    assignedTasks: tasks.filter((task) => task.assignedTo.id === session.user.id).length,
    completedTasks: tasks.filter((task) => task.status === "COMPLETED").length,
    overdueTasks: tasks.filter((task) => task.slaStatus === "OVERDUE").length,
    slaRiskTasks: tasks.filter((task) => task.slaStatus === "AT_RISK").length,
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operations"
        title="Operational Task Command Center"
        description="Coordinate execution, assignments, SLA exposure, and completion follow-up from one full-width internal workspace."
      />

      <section className="grid gap-4 md:grid-cols-3 2xl:grid-cols-5">
        <TaskKpiCard
          label="Total Tasks"
          value={String(kpis.totalTasks)}
          helper="Visible task records"
        />
        <TaskKpiCard
          label="Assigned Tasks"
          value={String(kpis.assignedTasks)}
          helper="Assigned to current viewer"
        />
        <TaskKpiCard
          label="Completed"
          value={String(kpis.completedTasks)}
          helper="Closed execution items"
        />
        <TaskKpiCard
          label="Overdue"
          value={String(kpis.overdueTasks)}
          helper="Past due SLA"
        />
        <TaskKpiCard
          label="SLA Risk"
          value={String(kpis.slaRiskTasks)}
          helper="At-risk tasks"
        />
      </section>

      <Card className="overflow-hidden">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
                Command Filters
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                Search and narrow the live operational portfolio by status, priority,
                monthly cycle, and assignee.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedCycle ? (
                <Chip tone={selectedCycle.isActive ? "green" : "neutral"} size="md">
                  {selectedCycle.label}
                </Chip>
              ) : null}
              {canManage ? (
                <OperationalTaskModalLauncher
                  lookupOptions={lookupOptions}
                  canManage={canManage}
                />
              ) : null}
            </div>
          </div>

          <Form action="" className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto_auto]">
            <FilterField label="Search">
              <input
                name="search"
                placeholder="Task name, project, vendor"
                defaultValue={params.search}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              />
            </FilterField>
            <FilterField label="Status">
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All statuses</option>
                {OPERATIONAL_TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Priority">
              <select
                name="priority"
                defaultValue={params.priority ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All priorities</option>
                {OPERATIONAL_TASK_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Monthly Cycle">
              <select
                name="cycleId"
                defaultValue={params.cycleId ?? selectedCycle?.id ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All cycles</option>
                {lookupOptions.monthlyCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.label}
                    {cycle.isActive ? " | Active" : ""}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Assigned To">
              <select
                name="assignedToUserId"
                defaultValue={params.assignedToUserId ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
                disabled={!canManage}
              >
                <option value="">All assignees</option>
                {lookupOptions.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <div className="flex items-end">
              <Button type="submit" className="w-full xl:w-auto">
                Apply Filters
              </Button>
            </div>
            <div className="flex items-end">
              <Button asChild variant="secondary" className="w-full xl:w-auto">
                <Link href="/admin/tasks">Reset</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Task Portfolio</CardTitle>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                Full-width operational execution list with direct actions into task management.
              </p>
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              Showing <span className="font-semibold text-[var(--color-ink)]">{tasks.length}</span>{" "}
              task{tasks.length === 1 ? "" : "s"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="rounded-[24px] p-8">
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-panel-soft)] p-8 text-center">
                <p className="text-base font-semibold text-[var(--color-ink)]">
                  No operational tasks match the current filters.
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  Adjust the filters or search to inspect a different slice of the task portfolio.
                </p>
                {canManage ? (
                  <div className="mt-5 flex justify-center">
                    <OperationalTaskModalLauncher
                      lookupOptions={lookupOptions}
                      canManage={canManage}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden xl:block">
                <table className="w-full table-fixed">
                  <thead className="bg-[var(--color-panel-soft)]">
                    <tr>
                      <th className="px-6 py-4 text-left"><TableHeaderLabel>Task Name</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>Project</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>Vendor</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>Assigned To</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>Due Date</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>Status</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>Priority</TableHeaderLabel></th>
                      <th className="px-4 py-4 text-left"><TableHeaderLabel>SLA</TableHeaderLabel></th>
                      <th className="px-6 py-4 text-right"><TableHeaderLabel className="text-right">Actions</TableHeaderLabel></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-t border-[var(--color-border)] align-top">
                        <td className="px-6 py-5">
                          <TaskPrimaryCell task={task} />
                        </td>
                        <td className="px-4 py-5">
                          <EntityCell
                            name={task.linkedProject?.projectName ?? "No project link"}
                            meta={task.linkedProject?.projectCode ?? "No code"}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <EntityCell
                            name={task.linkedVendor?.vendorName ?? "No vendor link"}
                            meta={task.linkedVendor?.vendorId ?? "No ID"}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <EntityCell
                            name={task.assignedTo.name}
                            meta={task.assignedTo.title}
                          />
                        </td>
                        <td className="px-4 py-5">
                          <DueDateCell task={task} />
                        </td>
                        <td className="px-4 py-5">
                          <OperationalTaskStatusBadge status={task.status} />
                        </td>
                        <td className="px-4 py-5">
                          <TaskPriorityChip priority={task.priority} />
                        </td>
                        <td className="px-4 py-5">
                          <TaskSlaStatusBadge status={task.slaStatus} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end">
                            <TasksRowActions task={task} canManage={canManage} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-5 xl:hidden">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[0_12px_30px_rgba(17,17,17,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <TaskPrimaryCell task={task} />
                      <TasksRowActions task={task} canManage={canManage} />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <TaskMobileBlock
                        label="Project"
                        value={task.linkedProject?.projectName ?? "No project link"}
                        helper={task.linkedProject?.projectCode ?? "No code"}
                      />
                      <TaskMobileBlock
                        label="Vendor"
                        value={task.linkedVendor?.vendorName ?? "No vendor link"}
                        helper={task.linkedVendor?.vendorId ?? "No ID"}
                      />
                      <TaskMobileBlock
                        label="Assigned To"
                        value={task.assignedTo.name}
                        helper={task.assignedTo.title}
                      />
                      <TaskMobileBlock
                        label="Due Date"
                        value={formatDate(task.dueDate)}
                        helper={getDueDateHelper(task)}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <OperationalTaskStatusBadge status={task.status} />
                      <TaskPriorityChip priority={task.priority} />
                      <TaskSlaStatusBadge status={task.slaStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function TaskKpiCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="flex min-h-[164px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(17,17,17,0.04)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-4 flex-1 text-[clamp(1.8rem,1.95vw,2.35rem)] font-semibold leading-none tracking-tight text-[var(--color-ink)] tabular-nums">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">{helper}</p>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function TaskPrimaryCell({ task }: { task: OperationalTaskListItem }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/admin/tasks/${task.id}`}
        className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
      >
        {task.title}
      </Link>
      <p className="mt-1 line-clamp-1 text-sm leading-6 text-[var(--color-muted)]">
        {task.description}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
        Updated {formatDateTime(task.updatedAt)}
      </p>
    </div>
  );
}

function EntityCell({
  name,
  meta,
}: {
  name: string;
  meta: string;
}) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 text-sm font-medium leading-6 text-[var(--color-ink)]">
        {name}
      </p>
      <p className="mt-1 truncate text-xs leading-5 text-[var(--color-muted)]">{meta}</p>
    </div>
  );
}

function DueDateCell({ task }: { task: OperationalTaskListItem }) {
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap text-sm font-medium text-[var(--color-ink)]">
        {formatDate(task.dueDate)}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
        {getDueDateHelper(task)}
      </p>
    </div>
  );
}

function TaskMobileBlock({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[var(--color-ink)]">
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{helper}</p> : null}
    </div>
  );
}

function TaskPriorityChip({
  priority,
}: {
  priority: OperationalTaskListItem["priority"];
}) {
  const tone =
    priority === "URGENT"
      ? "red"
      : priority === "HIGH"
        ? "orange"
        : priority === "MEDIUM"
          ? "purple"
          : "neutral";

  return <Chip tone={tone}>{priority.replaceAll("_", " ")}</Chip>;
}

function getDueDateHelper(task: OperationalTaskListItem) {
  if (task.status === "COMPLETED") {
    return "Completed";
  }

  if (task.remainingHoursToDueDate === null) {
    return "Closed";
  }

  if (task.remainingHoursToDueDate < 0) {
    return `${Math.abs(task.remainingHoursToDueDate).toFixed(1)}h overdue`;
  }

  return `${task.remainingHoursToDueDate.toFixed(1)}h remaining`;
}
