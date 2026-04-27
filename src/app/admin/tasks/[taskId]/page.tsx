import Link from "next/link";
import { notFound } from "next/navigation";

import {
  OperationalTaskStatusBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { OperationalTaskExecutionForm } from "@/components/forms/operational-task-execution-form";
import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { canManageOperationalTasks } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getOperationalTaskDetail, getTaskLookupOptions } from "@/server/queries/task-queries";

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

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 shadow-[0_20px_60px_rgba(17,17,17,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Operational Task
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
              {task.task.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
              {task.task.description}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <OperationalTaskStatusBadge status={task.task.status} />
            <TaskSlaStatusBadge status={task.task.slaStatus} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <InfoTile label="Assigned To" value={task.task.assignedTo.name} />
          <InfoTile label="Assigned By" value={task.task.assignedBy.name} />
          <InfoTile label="Due Date" value={formatDate(task.task.dueDate)} />
          <InfoTile
            label="Monthly Cycle"
            value={task.task.monthlyCycle?.label ?? "Not linked"}
          />
          <InfoTile
            label="Checklist"
            value={`${task.task.checklistCompletionPercent.toFixed(0)}% complete`}
          />
          <InfoTile
            label="Execution Result"
            value={task.task.executionResult ?? "Awaiting execution"}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {task.task.linkedProject ? (
            <Button asChild variant="secondary">
              <Link href={`/admin/projects/${task.task.linkedProject.id}`}>Open Project</Link>
            </Button>
          ) : null}
          {task.task.linkedVendor ? (
            <Button asChild variant="secondary">
              <Link href={`/admin/vendors/${task.task.linkedVendor.id}`}>Open Vendor</Link>
            </Button>
          ) : null}
          {task.task.monthlyCycle ? (
            <Button asChild variant="secondary">
              <Link href={`/admin/performance?cycleId=${task.task.monthlyCycle.id}`}>
                Open Monthly Governance
              </Link>
            </Button>
          ) : null}
          {task.task.linkedCertificate ? (
            <Button asChild variant="secondary">
              <Link href={task.task.href}>Open Certificate</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Checklist & SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.checklistItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {item.label}
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {item.completed ? "Done" : "Open"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {item.completedAt
                    ? `Completed ${formatDateTime(item.completedAt)}`
                    : "Awaiting completion"}
                </p>
              </div>
            ))}
            {task.checklistItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-muted)]">
                No checklist items were added to this task.
              </div>
            ) : null}
            <div className="rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-4 text-sm text-[var(--color-muted)]">
              Due-soon alert sent: {formatDateTime(task.task.dueSoonNotifiedAt)}
              <br />
              Overdue escalation sent: {formatDateTime(task.task.overdueNotifiedAt)}
              <br />
              Last status update: {formatDateTime(task.task.lastStatusChangedAt)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{canManage ? "Edit Task" : "Update My Task"}</CardTitle>
          </CardHeader>
          <CardContent>
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
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}
