import Form from "next/form";
import Link from "next/link";

import {
  OperationalTaskStatusBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import {
  OPERATIONAL_TASK_PRIORITY_OPTIONS,
  OPERATIONAL_TASK_STATUS_OPTIONS,
} from "@/lib/constants";
import { canManageOperationalTasks } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getTaskLookupOptions, getOperationalTasksForViewer } from "@/server/queries/task-queries";

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

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Operations
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            Operational task command center
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
            Manage execution tasks, SLA exposure, and direct links into project, vendor,
            assignment, and certificate context. Results are capped for
            responsiveness; narrow filters to inspect a smaller set.
          </p>
        </div>
        <Form action="" className="grid gap-3 rounded-[28px] border border-[var(--color-border)] bg-white p-4 xl:grid-cols-5">
          <input
            name="search"
            placeholder="Search tasks"
            defaultValue={params.search}
            className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
          />
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
          >
            <option value="">All statuses</option>
            {OPERATIONAL_TASK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={params.priority ?? ""}
            className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
          >
            <option value="">All priorities</option>
            {OPERATIONAL_TASK_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="cycleId"
            defaultValue={params.cycleId ?? selectedCycle?.id ?? ""}
            className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
          >
            <option value="">All monthly cycles</option>
            {lookupOptions.monthlyCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.label} | {cycle.status.replaceAll("_", " ")}
                {cycle.isActive ? " | Active" : ""}
              </option>
            ))}
          </select>
          {canManage ? (
            <select
              name="assignedToUserId"
              defaultValue={params.assignedToUserId ?? ""}
              className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
            >
              <option value="">All assignees</option>
              {lookupOptions.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button type="submit" className="xl:col-span-full">
            Apply filters
          </Button>
        </Form>
      </section>

      {selectedCycle ? (
        <section className="grid gap-4 md:grid-cols-3">
          <InfoPill label="Selected Cycle" value={selectedCycle.label} />
          <InfoPill
            label="Cycle Status"
            value={selectedCycle.status.replaceAll("_", " ")}
          />
          <InfoPill
            label="Mode"
            value={selectedCycle.isActive ? "Active command center" : "Archived view"}
          />
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operational Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No operational tasks match the current filters.
              </div>
            ) : (
              tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className="block rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition-colors hover:bg-[var(--color-panel-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <p className="text-lg font-semibold text-[var(--color-ink)]">
                        {task.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {task.description}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Assigned to {task.assignedTo.name} | Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <OperationalTaskStatusBadge status={task.status} />
                      <TaskSlaStatusBadge status={task.slaStatus} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <InfoPill label="Checklist" value={`${task.checklistCompletionPercent.toFixed(0)}%`} />
                    <InfoPill label="Elapsed" value={`${task.elapsedHoursSinceAssignment.toFixed(1)}h`} />
                    <InfoPill
                      label="Remaining"
                      value={
                        task.remainingHoursToDueDate === null
                          ? "Closed"
                          : `${task.remainingHoursToDueDate.toFixed(1)}h`
                      }
                    />
                  </div>
                  <div className="mt-4 text-xs text-[var(--color-muted)]">
                    Updated {formatDateTime(task.updatedAt)}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{canManage ? "Create Operational Task" : "Task Management"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <OperationalTaskForm lookupOptions={lookupOptions} canManage={canManage} />
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm leading-7 text-[var(--color-muted)]">
                Task creation is limited to operational managers. You can still open your
                assigned tasks and update execution status from the detail page.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--color-panel-soft)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
