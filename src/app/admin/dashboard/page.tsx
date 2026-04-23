import Link from "next/link";

import { ActivityFeed } from "@/components/admin/activity-feed";
import { CircularKpiMeter } from "@/components/admin/circular-kpi-meter";
import { EmailTestPanel } from "@/components/admin/email-test-panel";
import { KpiCard } from "@/components/admin/kpi-card";
import { MetricProgressBar } from "@/components/admin/metric-progress-bar";
import { NotificationList } from "@/components/admin/notification-list";
import { PageNotice } from "@/components/admin/page-notice";
import {
  OperationalTaskStatusBadge,
  PerformanceGradeBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { QUARTER_LABELS } from "@/lib/constants";
import { getDashboardData } from "@/server/queries/dashboard-queries";
import {
  getMonthlyGovernanceDashboard,
  getTeamPerformanceDashboard,
} from "@/server/queries/performance-queries";
import { formatDate } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function AdminDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const [data, performanceDashboard, monthlyDashboard] = await Promise.all([
    getDashboardData(session.user.id),
    getTeamPerformanceDashboard({
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    }),
    getMonthlyGovernanceDashboard({
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    }),
  ]);

  return (
    <div className="space-y-8">
      {params.notice === "password-updated" ? (
        <PageNotice
          title="Password updated successfully."
          body="You can continue using the admin workspace."
        />
      ) : null}

      <section className="tg-reveal tg-breathe-panel rounded-[32px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(77,34,106,0.96)_62%,rgba(215,132,57,0.94))] px-8 py-9 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f7c08b]">
          Dashboard
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Project-based certificate governance at a glance.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#efe3f5]">
          Monitor live project and certificate workload, recent workflow actions,
          unread operational notifications, and outbound email testing from one
          internal command center.
        </p>
      </section>

      <section className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Projects"
          value={data.kpis.totalProjects}
          className="tg-reveal"
        />
        <KpiCard
          label="Active Projects"
          value={data.kpis.activeProjects}
          accent="#d78439"
          className="tg-reveal tg-delay-1"
        />
        <KpiCard
          label="Total Certificates"
          value={data.kpis.totalCertificates}
          accent="#5b2a7a"
          className="tg-reveal tg-delay-2"
        />
        <KpiCard
          label="Draft Certificates"
          value={data.kpis.draftCertificates}
          accent="#b45309"
          className="tg-reveal tg-delay-3"
        />
        <KpiCard
          label="Pending PM Approval"
          value={data.kpis.pendingPmApproval}
          accent="#d78439"
          className="tg-reveal tg-delay-1"
        />
        <KpiCard
          label="Approved"
          value={data.kpis.approvedCertificates}
          accent="#5b2a7a"
          className="tg-reveal tg-delay-2"
        />
        <KpiCard
          label="Issued"
          value={data.kpis.issuedCertificates}
          accent="#166534"
          className="tg-reveal tg-delay-3"
        />
        <KpiCard
          label="Revoked"
          value={data.kpis.revokedCertificates}
          accent="#991b1b"
          className="tg-reveal tg-delay-4"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="tg-reveal tg-delay-1 overflow-hidden">
          <CardHeader>
            <CardTitle>Operational Performance Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <CircularKpiMeter
              label="Team Completion"
              value={performanceDashboard.kpis.teamCompletionRate}
              tone="green"
            />
            <CircularKpiMeter
              label="Overdue Exposure"
              value={performanceDashboard.kpis.overdueExposure}
              tone="red"
            />
            <CircularKpiMeter
              label="Productivity"
              value={performanceDashboard.kpis.productivityScore}
              tone="purple"
            />
          </CardContent>
        </Card>

        <Card className="tg-reveal tg-delay-2 overflow-hidden">
          <CardHeader>
            <CardTitle>
              {performanceDashboard.isExecutive
                ? "Executive Watchlist"
                : "My Performance Snapshot"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricProgressBar
                label="Team completion rate"
                value={performanceDashboard.kpis.teamCompletionRate}
                tone="green"
              />
              <MetricProgressBar
                label="Quarterly productivity"
                value={performanceDashboard.kpis.productivityScore}
                tone="purple"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoTile
                label="Top Performer"
                value={performanceDashboard.kpis.topPerformer ?? "-"}
              />
              <InfoTile
                label="At-Risk Member"
                value={performanceDashboard.kpis.atRiskMember ?? "-"}
              />
            </div>
            {performanceDashboard.currentUserSummary ? (
              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {performanceDashboard.currentUserSummary.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {performanceDashboard.currentUserSummary.title}
                    </p>
                  </div>
                  {performanceDashboard.currentUserSummary.grade ? (
                    <PerformanceGradeBadge
                      grade={performanceDashboard.currentUserSummary.grade}
                    />
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricProgressBar
                    label="System score"
                    value={performanceDashboard.currentUserSummary.systemScore}
                    tone="purple"
                  />
                  <MetricProgressBar
                    label="On-time %"
                    value={
                      performanceDashboard.currentUserSummary.onTimeCompletionRate
                    }
                    tone="gold"
                  />
                  <MetricProgressBar
                    label="Overdue %"
                    value={performanceDashboard.currentUserSummary.overdueRate}
                    tone="red"
                  />
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/tasks">Open Tasks</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/performance">
                  Open{" "}
                  {
                    QUARTER_LABELS[
                      performanceDashboard.currentQuarter as keyof typeof QUARTER_LABELS
                    ]
                  }{" "}
                  Performance
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="tg-reveal tg-delay-2 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Monthly Command Snapshot</CardTitle>
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/performance">Open Monthly Governance</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyDashboard.selectedCycle ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoTile
                    label="Active Cycle"
                    value={monthlyDashboard.selectedCycle.label}
                  />
                  <InfoTile
                    label="Workload Balance"
                    value={`${monthlyDashboard.kpis.workloadBalance.toFixed(0)}%`}
                  />
                  <InfoTile
                    label="Monthly Team Score"
                    value={`${monthlyDashboard.kpis.monthlyTeamScore.toFixed(0)}%`}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricProgressBar
                    label="Monthly completion"
                    value={monthlyDashboard.kpis.monthlyCompletionRate}
                    tone="green"
                  />
                  <MetricProgressBar
                    label="Completed tasks"
                    value={
                      monthlyDashboard.kpis.totalTasks === 0
                        ? 0
                        : (monthlyDashboard.kpis.completedTasks /
                            monthlyDashboard.kpis.totalTasks) *
                          100
                    }
                    tone="gold"
                  />
                  <MetricProgressBar
                    label="Overdue exposure"
                    value={
                      monthlyDashboard.kpis.totalTasks === 0
                        ? 0
                        : (monthlyDashboard.kpis.overdueTasks /
                            monthlyDashboard.kpis.totalTasks) *
                          100
                    }
                    tone="red"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No monthly cycle has been configured yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="tg-reveal tg-delay-3 overflow-hidden">
          <CardHeader>
            <CardTitle>Monthly Employee Watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyDashboard.employeeCards.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                Monthly employee cards will appear after a cycle is created.
              </div>
            ) : (
              monthlyDashboard.employeeCards.map((member) => (
                <div
                  key={member.userId}
                  className="rounded-[24px] border border-[var(--color-border)] bg-white p-5"
                >
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        {member.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {member.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                        {member.workloadLevel}
                      </span>
                      {member.grade ? (
                        <PerformanceGradeBadge grade={member.grade} />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MetricProgressBar
                      label="Progress"
                      value={member.completionRate}
                      tone="green"
                    />
                    <MetricProgressBar
                      label="Monthly score"
                      value={member.monthlyScore}
                      tone="purple"
                    />
                    <MetricProgressBar
                      label="Overdue control"
                      value={100 - member.overdueRate}
                      tone="red"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="tg-reveal tg-delay-1 overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              items={data.recentActivity.map((item) => ({
                id: item.id,
                action: item.action,
                entityType: item.entityType,
                actorName: item.actorName,
                createdAt: item.createdAt,
              }))}
            />
          </CardContent>
        </Card>
        <Card className="tg-reveal tg-delay-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationList notifications={data.recentNotifications} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="tg-reveal tg-delay-2 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Operational Tasks</CardTitle>
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/tasks">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceDashboard.recentTasks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No operational tasks are available yet.
              </div>
            ) : (
              performanceDashboard.recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className="block rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition-colors hover:bg-[var(--color-panel-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{task.title}</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {task.assignedTo.name} | Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <OperationalTaskStatusBadge status={task.status} />
                      <TaskSlaStatusBadge status={task.slaStatus} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="tg-reveal tg-delay-3 overflow-hidden">
          <CardHeader>
            <CardTitle>Team Member Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceDashboard.memberCards.map((member) => (
              <div
                key={member.userId}
                className="rounded-[24px] border border-[var(--color-border)] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{member.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{member.title}</p>
                  </div>
                  {member.grade ? <PerformanceGradeBadge grade={member.grade} /> : null}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricProgressBar label="Completion" value={member.completionRate} tone="green" />
                  <MetricProgressBar label="System Score" value={member.systemScore} tone="purple" />
                  <MetricProgressBar label="Overdue" value={member.overdueRate} tone="red" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="tg-reveal tg-delay-2">
        <EmailTestPanel defaultRecipientEmail={session.user.email} />
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[var(--color-border)] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}
