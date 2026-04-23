import Form from "next/form";
import Link from "next/link";

import { CircularKpiMeter } from "@/components/admin/circular-kpi-meter";
import { MetricProgressBar } from "@/components/admin/metric-progress-bar";
import {
  PerformanceGradeBadge,
  TaskSlaStatusBadge,
} from "@/components/admin/status-badges";
import { MonthlyCycleForm } from "@/components/forms/monthly-cycle-form";
import { MonthlyCycleStatusForm } from "@/components/forms/monthly-cycle-status-form";
import { MonthlyPerformanceReviewForm } from "@/components/forms/monthly-performance-review-form";
import { QuarterlyPerformanceReviewForm } from "@/components/forms/quarterly-performance-review-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { QUARTER_LABELS } from "@/lib/constants";
import {
  canEvaluateTeamPerformance,
  canManageMonthlyGovernance,
} from "@/lib/permissions";
import { getCurrentMonthCycle, getCurrentQuarter, buildMonthCycleLabel } from "@/lib/time";
import { formatDate } from "@/lib/utils";
import {
  getMonthlyGovernanceDashboard,
  getQuarterlyPerformanceReviewDetail,
  getQuarterlyPerformanceReviews,
  getTeamPerformanceDashboard,
} from "@/server/queries/performance-queries";

type PerformancePageProps = {
  searchParams: Promise<{
    cycleId?: string;
    year?: string;
    quarter?: string;
    employeeUserId?: string;
  }>;
};

export default async function PerformancePage({
  searchParams,
}: PerformancePageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const currentQuarter = getCurrentQuarter();
  const currentMonth = getCurrentMonthCycle();
  const selectedYear = Number(params.year ?? currentQuarter.year);
  const selectedQuarter = Number(params.quarter ?? currentQuarter.quarter);
  const canEvaluate = canEvaluateTeamPerformance(
    session.user.role,
    session.user.email,
  );
  const canManageMonthly = canManageMonthlyGovernance(
    session.user.role,
    session.user.email,
  );
  const [dashboard, monthlyDashboard, reviews] = await Promise.all([
    getTeamPerformanceDashboard({
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    }),
    getMonthlyGovernanceDashboard(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      params.cycleId,
    ),
    getQuarterlyPerformanceReviews(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      {
        year: selectedYear,
        quarter: selectedQuarter,
        employeeUserId: params.employeeUserId,
      },
    ),
  ]);
  const reviewDetails = await Promise.all(
    reviews.map((review) =>
      getQuarterlyPerformanceReviewDetail(
        {
          id: session.user.id,
          role: session.user.role,
          email: session.user.email,
        },
        review.id,
      ),
    ),
  );
  const reviewByEmployeeId = new Map(
    reviewDetails
      .filter(Boolean)
      .map((review) => [review!.employee.id, review!]),
  );
  const selectedCycle = monthlyDashboard.selectedCycle;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      <section className="tg-reveal overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(70,34,102,0.96)_62%,rgba(215,132,57,0.92))] px-8 py-8 text-white">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c08b]">
              Performance
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Monthly team management and quarterly evaluation governance.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#efe3f5]">
              Run the monthly operating cycle for Abdulmajeed and Samia, review
              capacity and delivery risk, then preserve the deeper quarterly
              review framework underneath it.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HeroMetric
              label="Active Cycle"
              value={selectedCycle?.label ?? "Not configured"}
              hint={
                selectedCycle
                  ? `${selectedCycle.status.replaceAll("_", " ")}${selectedCycle.isActive ? " | Active" : ""}`
                  : "Create a monthly cycle to begin controlled task governance."
              }
            />
            <HeroMetric
              label="Monthly Team Score"
              value={`${monthlyDashboard.kpis.monthlyTeamScore.toFixed(0)}%`}
              hint={`${monthlyDashboard.kpis.completedTasks}/${monthlyDashboard.kpis.totalTasks} tasks completed in the selected cycle`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-3">
            <CardTitle>Monthly Cycle Control</CardTitle>
            <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
              Khaled controls the monthly operating period from here. Cycles can
              be created, activated, closed, or archived without disturbing the
              underlying task history.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <Form
              action=""
              className="grid gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <select
                name="cycleId"
                defaultValue={selectedCycle?.id ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                {monthlyDashboard.cycles.length === 0 ? (
                  <option value="">No monthly cycles yet</option>
                ) : (
                  monthlyDashboard.cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.label} | {cycle.status.replaceAll("_", " ")}
                      {cycle.isActive ? " | Active" : ""}
                    </option>
                  ))
                )}
              </select>
              <Button type="submit">Switch Cycle</Button>
            </Form>

            {selectedCycle ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid min-w-0 gap-4 md:grid-cols-3">
                  <InfoTile label="Cycle Label" value={selectedCycle.label} />
                  <InfoTile
                    label="Status"
                    value={selectedCycle.status.replaceAll("_", " ")}
                  />
                  <InfoTile
                    label="Calendar Period"
                    value={`${selectedCycle.month}/${selectedCycle.year}`}
                  />
                </div>
                {canManageMonthly ? (
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {!selectedCycle.isActive ? (
                      <MonthlyCycleStatusForm
                        cycleId={selectedCycle.id}
                        action="activate"
                        label="Activate"
                      />
                    ) : null}
                    {selectedCycle.status === "OPEN" ? (
                      <MonthlyCycleStatusForm
                        cycleId={selectedCycle.id}
                        action="close"
                        label="Close Cycle"
                        variant="secondary"
                      />
                    ) : null}
                    {selectedCycle.status === "CLOSED" ? (
                      <MonthlyCycleStatusForm
                        cycleId={selectedCycle.id}
                        action="reopen"
                        label="Reopen"
                        variant="secondary"
                      />
                    ) : null}
                    {selectedCycle.status !== "ARCHIVED" ? (
                      <MonthlyCycleStatusForm
                        cycleId={selectedCycle.id}
                        action="archive"
                        label="Archive"
                        variant="secondary"
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {canManageMonthly ? (
              <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-5">
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                  Create Monthly Cycle
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
                  Create the next management period intentionally instead of
                  relying on hardcoded year assumptions.
                </p>
                <div className="mt-5">
                  <MonthlyCycleForm
                    defaultMonth={currentMonth.month}
                    defaultYear={currentMonth.year}
                    defaultLabel={buildMonthCycleLabel(
                      currentMonth.year,
                      currentMonth.month,
                    )}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="space-y-3">
            <CardTitle>Monthly Exports</CardTitle>
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Export the selected cycle as structured Excel/CSV output or a
              branded executive PDF summary.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCycle ? (
              <>
                <div className="grid gap-3">
                  <Button asChild variant="secondary">
                    <Link
                      href={`/admin/performance/monthly/export?format=csv&cycleId=${selectedCycle.id}`}
                    >
                      Export Monthly CSV
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link
                      href={`/admin/performance/monthly/export?format=excel&cycleId=${selectedCycle.id}`}
                    >
                      Export Monthly Excel
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/admin/performance/monthly/${selectedCycle.id}/report`}>
                      Open Monthly PDF Report
                    </Link>
                  </Button>
                </div>
                <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4 text-sm leading-7 text-[var(--color-muted)]">
                  This export set stays tied to the selected monthly cycle and
                  preserves the same task/performance record history.
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                Create or select a monthly cycle before exporting monthly team
                governance reports.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <CircularKpiMeter
          label="Monthly Completion"
          value={monthlyDashboard.kpis.monthlyCompletionRate}
          tone="green"
        />
        <CircularKpiMeter
          label="Workload Balance"
          value={monthlyDashboard.kpis.workloadBalance}
          tone="purple"
        />
        <CircularKpiMeter
          label="Team Score"
          value={monthlyDashboard.kpis.monthlyTeamScore}
          tone="gold"
        />
        <InfoCard
          label="Monthly Tasks"
          value={String(monthlyDashboard.kpis.totalTasks)}
          hint={`${monthlyDashboard.kpis.completedTasks} completed`}
        />
        <InfoCard
          label="Overdue Exposure"
          value={String(monthlyDashboard.kpis.overdueTasks)}
          hint={`${monthlyDashboard.taskSummary.openTasks} open tasks remain`}
        />
        <InfoCard
          label="Open Tasks"
          value={String(monthlyDashboard.taskSummary.openTasks)}
          hint="Tasks still in progress for this cycle"
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Monthly Team Cards
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
              Selected cycle execution and review snapshot
            </h2>
          </div>
          {selectedCycle ? (
            <Button asChild variant="secondary">
              <Link href={`/admin/tasks?cycleId=${selectedCycle.id}`}>
                Open Monthly Task Command Center
              </Link>
            </Button>
          ) : null}
        </div>

        {monthlyDashboard.employeeCards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No monthly employee data is available for the selected cycle yet.
            </CardContent>
          </Card>
        ) : (
          monthlyDashboard.employeeCards.map((member) => (
            <Card key={member.userId} className="overflow-hidden">
              <CardHeader className="min-w-0">
                <CardTitle className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{member.name}</span>
                    <span className="mt-1 block text-sm font-normal text-[var(--color-muted)]">
                      {member.title}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                      {member.workloadLevel} workload
                    </span>
                    {member.grade ? <PerformanceGradeBadge grade={member.grade} /> : null}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <StatTile label="Assigned Tasks" value={String(member.assignedTasks)} />
                  <StatTile label="Completed" value={String(member.completedTasks)} />
                  <StatTile label="Overdue" value={String(member.overdueTasks)} />
                  <StatTile label="Progress" value={`${member.completionRate.toFixed(2)}%`} />
                  <StatTile label="On-Time %" value={`${member.onTimeCompletionRate.toFixed(2)}%`} />
                  <StatTile
                    label="Avg Completion"
                    value={`${member.averageCompletionHours.toFixed(2)}h`}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-4">
                  <MetricProgressBar
                    label="Workload Capacity"
                    value={member.workloadPercent}
                    tone="purple"
                  />
                  <MetricProgressBar
                    label="System Score"
                    value={member.systemScore}
                    tone="gold"
                  />
                  <MetricProgressBar
                    label="Monthly Score"
                    value={member.monthlyScore}
                    tone="green"
                  />
                  <MetricProgressBar
                    label="Overdue Control"
                    value={100 - member.overdueRate}
                    tone="red"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Trend vs Previous Cycle
                    </p>
                    {member.trendDelta === null ? (
                      <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        New baseline
                      </div>
                    ) : (
                      <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                        {member.trendDelta >= 0
                          ? `+${member.trendDelta.toFixed(2)}%`
                          : `${member.trendDelta.toFixed(2)}%`}
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                      {monthlyDashboard.previousCycle
                        ? `Compared with ${monthlyDashboard.previousCycle.label}.`
                        : "A previous cycle comparison will appear once another cycle exists."}
                    </p>
                  </div>

                  {canEvaluate ? (
                    selectedCycle ? (
                      <MonthlyPerformanceReviewForm
                        cycleId={selectedCycle.id}
                        employee={member}
                      />
                    ) : null
                  ) : member.review ? (
                    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                      <p>
                        Monthly review status:{" "}
                        <strong>{member.review.status.replaceAll("_", " ")}</strong>
                      </p>
                      <p className="mt-2">
                        Final score:{" "}
                        <strong>{member.review.finalScorePercent.toFixed(2)}%</strong>
                      </p>
                      <p className="mt-2">
                        Manager notes: {member.review.managerNotes ?? "No notes saved yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-muted)]">
                      No monthly review has been saved for this cycle yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Monthly Planning Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-hidden">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Review the due-date distribution across the selected month to spot
              overload and quiet periods quickly.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {monthlyDashboard.timeline.map((day) => (
                <div
                  key={day.isoDate}
                  className={`group relative flex min-h-[124px] min-w-0 flex-col overflow-hidden rounded-[22px] border p-3 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(17,17,17,0.12)] ${
                    day.isToday
                      ? day.totalTasks > 0
                        ? "border-[rgba(91,42,122,0.38)] bg-[linear-gradient(180deg,rgba(91,42,122,0.11)_0%,rgba(255,250,255,0.98)_72%)]"
                        : "border-[rgba(215,132,57,0.52)] bg-[linear-gradient(180deg,rgba(255,248,238,0.98)_0%,rgba(255,255,255,0.98)_76%)]"
                      : day.totalTasks > 0
                        ? "border-[rgba(91,42,122,0.26)] bg-[linear-gradient(180deg,rgba(49,19,71,0.08)_0%,rgba(255,255,255,0.98)_70%)]"
                        : "border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,248,245,0.94)_100%)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {day.weekdayShort}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">
                        {day.dayOfMonth}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-bold shadow-[0_8px_18px_rgba(17,17,17,0.08)] ring-1 ring-white/70 ${
                        day.totalTasks > 0
                          ? day.isToday
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[rgba(49,19,71,0.12)] text-[var(--color-primary)]"
                          : "bg-[var(--color-panel-soft)] text-[var(--color-primary)]"
                      }`}
                    >
                      {day.totalTasks}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {day.taskTitles.slice(0, 2).map((title, index) => (
                      <p
                        key={`${day.isoDate}-${title}`}
                        className={`min-h-[30px] truncate rounded-full border px-3 py-1.5 text-[12px] font-semibold leading-5 shadow-[0_8px_18px_rgba(17,17,17,0.05)] transition-colors ${
                          getTimelineTaskChipClass(day, index)
                        }`}
                      >
                        {title}
                      </p>
                    ))}
                    {day.totalTasks > 2 ? (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        +{day.totalTasks - 2} more
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Monthly Task Watchlist</CardTitle>
            {selectedCycle ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/tasks?cycleId=${selectedCycle.id}`}>Open Tasks</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyDashboard.tasks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No monthly tasks are linked to this cycle yet.
              </div>
            ) : (
              monthlyDashboard.tasks.slice(0, 8).map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className="block rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition-colors hover:bg-[var(--color-panel-soft)]"
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {task.title}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {task.assignedTo.name} | Due {formatDate(task.dueDate)}
                      </p>
                      {task.monthlyCycle ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          {task.monthlyCycle.label}
                        </p>
                      ) : null}
                    </div>
                    <TaskSlaStatusBadge status={task.slaStatus} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Quarterly Evaluation
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
              Quarterly review foundation
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
              The monthly governance layer is additive only. The deeper
              quarterly review framework remains intact for weighted performance
              evaluation and reporting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link
                href={`/admin/performance/export?format=csv&year=${selectedYear}&quarter=${selectedQuarter}`}
              >
                Export Quarterly CSV
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link
                href={`/admin/performance/export?format=excel&year=${selectedYear}&quarter=${selectedQuarter}`}
              >
                Export Quarterly Excel
              </Link>
            </Button>
          </div>
        </div>

        <Form
          action=""
          className="grid gap-3 rounded-[28px] border border-[var(--color-border)] bg-white p-4 xl:grid-cols-3"
        >
          <select
            name="year"
            defaultValue={String(selectedYear)}
            className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
          >
            {Array.from({ length: 5 }, (_, index) => currentQuarter.year - 2 + index).map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ),
            )}
          </select>
          <select
            name="quarter"
            defaultValue={String(selectedQuarter)}
            className="h-11 rounded-full border border-[var(--color-border)] px-4 text-sm"
          >
            {([1, 2, 3, 4] as const).map((quarter) => (
              <option key={quarter} value={quarter}>
                {QUARTER_LABELS[quarter]}
              </option>
            ))}
          </select>
          <Button type="submit">Apply Period</Button>
        </Form>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <CircularKpiMeter
            label="Team Completion Rate"
            value={dashboard.kpis.teamCompletionRate}
            tone="green"
          />
          <CircularKpiMeter
            label="Overdue Exposure"
            value={dashboard.kpis.overdueExposure}
            tone="red"
          />
          <CircularKpiMeter
            label="Productivity Score"
            value={dashboard.kpis.productivityScore}
            tone="purple"
          />
          <Card className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white p-5 shadow-[0_20px_50px_rgba(17,17,17,0.05)]">
            <CardContent className="min-w-0 space-y-3 p-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Executive Watchlist
              </p>
              <div className="min-w-0">
                <p className="text-sm text-[var(--color-muted)]">Top Performer</p>
                <p className="mt-1 truncate text-lg font-semibold text-[var(--color-ink)]">
                  {dashboard.kpis.topPerformer ?? "-"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[var(--color-muted)]">At-Risk Member</p>
                <p className="mt-1 truncate text-lg font-semibold text-[var(--color-ink)]">
                  {dashboard.kpis.atRiskMember ?? "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Workload Distribution</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.workloadDistribution.map((member) => (
                <div
                  key={member.userId}
                  className="rounded-[22px] border border-[var(--color-border)] bg-white p-4"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {member.name}
                    </p>
                    <p className="shrink-0 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {member.openTasks} open tasks
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <MetricProgressBar
                      label="Open task exposure"
                      value={Math.min(100, member.openTasks * 10)}
                      tone="purple"
                    />
                    <MetricProgressBar
                      label="Overdue exposure"
                      value={Math.min(100, member.overdueTasks)}
                      tone="red"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Quarterly Trend Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.quarterlyTrend.length > 0 ? (
              dashboard.quarterlyTrend.map((trend) => (
                <div
                  key={`${trend.year}-${trend.quarter}`}
                  className="rounded-[22px] border border-[var(--color-border)] bg-white p-4"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {QUARTER_LABELS[trend.quarter as keyof typeof QUARTER_LABELS]} {trend.year}
                    </p>
                    <p className="shrink-0 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {trend.finalScore !== null
                        ? `Avg final ${trend.finalScore.toFixed(2)}%`
                        : "No finalized review"}
                    </p>
                  </div>
                  <div className="mt-4">
                    <MetricProgressBar
                      label="Completion rate"
                      value={trend.completionRate}
                      tone="green"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-[var(--color-panel-soft)] p-3 text-sm leading-6 text-[var(--color-muted)]">
                No quarterly trend data is available yet. Finalized reviews will
                populate this comparison automatically.
              </div>
            )}
          </CardContent>
        </Card>
        </section>

        <section className="space-y-6">
          {dashboard.memberCards.map((member) => {
            const existingReview = reviewByEmployeeId.get(member.userId);

            return (
              <Card key={member.userId}>
                <CardHeader>
                  <CardTitle className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate">
                        {member.name} | {member.title}
                      </span>
                    </span>
                    {member.grade ? <PerformanceGradeBadge grade={member.grade} /> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <StatTile label="Active Tasks" value={String(member.activeTasks)} />
                    <StatTile label="Completed" value={String(member.completedTasks)} />
                    <StatTile label="Completion %" value={`${member.completionRate.toFixed(2)}%`} />
                    <StatTile label="On-Time %" value={`${member.onTimeCompletionRate.toFixed(2)}%`} />
                    <StatTile label="Overdue %" value={`${member.overdueRate.toFixed(2)}%`} />
                    <StatTile
                      label="Avg Completion"
                      value={`${member.averageCompletionHours.toFixed(2)}h`}
                    />
                  </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <MetricProgressBar label="System Score" value={member.systemScore} tone="purple" />
                    <MetricProgressBar
                      label="Manager Score"
                      value={member.managerScore ?? 0}
                      tone="gold"
                    />
                    <MetricProgressBar
                      label="Final Score"
                      value={member.finalScore ?? member.systemScore}
                      tone="green"
                    />
                  </div>

                  {canEvaluate ? (
                    <QuarterlyPerformanceReviewForm
                      key={`${member.userId}-${selectedYear}-${selectedQuarter}-${existingReview?.id ?? "draft"}`}
                      employee={member}
                      year={selectedYear}
                      quarter={selectedQuarter}
                      existingReview={existingReview}
                    />
                  ) : existingReview ? (
                    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                      <p>
                        Review status: <strong>{existingReview.status.replaceAll("_", " ")}</strong>
                      </p>
                      <p className="mt-2">
                        Final score: <strong>{existingReview.finalScorePercent.toFixed(2)}%</strong>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/admin/performance/${existingReview.id}/report`}>
                            Open PDF Report
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-muted)]">
                      No saved quarterly review for this period yet.
                    </div>
                  )}

                  {existingReview ? (
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/performance/${existingReview.id}/report`}>
                          Open PDF Report
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </section>
    </div>
  );
}

function getTimelineTaskChipClass(
  day: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
  },
  index: number,
) {
  if (day.overdueTasks > 0) {
    return index === 0
      ? "border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.12)] text-[#7f1d1d]"
      : "border-[rgba(215,132,57,0.22)] bg-[rgba(215,132,57,0.12)] text-[#9a5a18]";
  }

  if (day.completedTasks > 0 && day.completedTasks === day.totalTasks) {
    return index === 0
      ? "border-[rgba(22,101,52,0.2)] bg-[rgba(22,101,52,0.1)] text-[#14532d]"
      : "border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.1)] text-[#1d4ed8]";
  }

  return index === 0
    ? "border-[rgba(91,42,122,0.2)] bg-[rgba(91,42,122,0.1)] text-[var(--color-primary)]"
    : "border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.09)] text-[#1d4ed8]";
}

function HeroMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 rounded-[26px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f7c08b]">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[#efe3f5]">{hint}</p>
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

function InfoCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white p-4 shadow-[0_20px_50px_rgba(17,17,17,0.05)]">
      <CardContent className="flex h-full min-w-0 flex-col justify-between gap-4 p-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-3 break-words text-3xl font-semibold text-[var(--color-ink)]">
            {value}
          </p>
        </div>
        <p className="break-words text-sm leading-6 text-[var(--color-muted)]">{hint}</p>
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[var(--color-border)] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold text-[var(--color-ink)] sm:text-lg">
        {value}
      </p>
    </div>
  );
}
