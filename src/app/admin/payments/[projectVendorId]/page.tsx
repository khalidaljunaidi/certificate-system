import Link from "next/link";
import { notFound } from "next/navigation";

import { PageNotice } from "@/components/admin/page-notice";
import {
  CertificateStatusBadge,
  PaymentInstallmentStatusBadge,
  PaymentRecordStatusBadge,
} from "@/components/admin/status-badges";
import { PaymentCloseActionButton } from "@/components/forms/payment-close-action-button";
import { PaymentInstallmentModalLauncher } from "@/components/forms/payment-installment-modal-launcher";
import { PaymentRecordGovernanceForm } from "@/components/forms/payment-record-governance-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableHeaderLabel } from "@/components/ui/table-header-label";
import { requireAdminSession } from "@/lib/auth";
import {
  canAssignPaymentFinanceOwner,
  canClosePayments,
  canCreatePaymentPlan,
  canExportPayments,
  canManageRoles,
  canUpdatePayments,
  canViewPayments,
} from "@/lib/permissions";
import { formatDate, formatDateTime, formatSarAmount } from "@/lib/utils";
import { getPaymentRecordDetail } from "@/server/queries/payment-queries";

type PaymentDetailPageProps = {
  params: Promise<{
    projectVendorId: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    notice?: string;
  }>;
};

type PaymentRecordView = NonNullable<
  Awaited<ReturnType<typeof getPaymentRecordDetail>>
>["record"];

const PAYMENT_TABS = [
  { key: "overview", label: "Overview" },
  { key: "installments", label: "Installments" },
  { key: "invoices", label: "Invoices" },
  { key: "finance-review", label: "Finance Review" },
  { key: "certificates", label: "Certificates" },
  { key: "audit", label: "Audit Trail" },
  { key: "notes", label: "Notes" },
] as const;

type PaymentTabKey = (typeof PAYMENT_TABS)[number]["key"];

export default async function PaymentDetailPage({
  params,
  searchParams,
}: PaymentDetailPageProps) {
  const { projectVendorId } = await params;
  const query = await searchParams;
  const session = await requireAdminSession();

  if (!canViewPayments(session.user)) {
    return (
      <div className="space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-accent)]">
          Payments
        </p>
        <h1 className="text-4xl font-semibold text-[var(--color-ink)]">
          Payment record
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
          You do not have permission to access this payment record.
        </p>
      </div>
    );
  }

  const activeTab = getPaymentTab(query.tab);
  const detail = await getPaymentRecordDetail({
    viewer: session.user,
    projectVendorId,
    activeTab,
  });

  if (!detail) {
    notFound();
  }

  const record = detail.record;
  const redirectTo = `/admin/payments/${record.projectVendorId}?tab=notes`;
  const canManageInstallments =
    canCreatePaymentPlan(session.user) || canUpdatePayments(session.user);
  const canAssignOwner = canAssignPaymentFinanceOwner(session.user);
  const canCloseRecord = canClosePayments(session.user);
  const canExport = canExportPayments(session.user);
  const canViewTechnicalAuditDetails = canManageRoles(session.user);
  const assignmentLabel = `${record.projectName} | ${record.vendorName}${record.poNumber ? ` | PO ${record.poNumber}` : ""}${record.contractNumber ? ` | Contract ${record.contractNumber}` : ""}`;
  const workflowSteps = buildWorkflowSteps(record);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PaymentNoticeBanner notice={query.notice} />

      <section className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 shadow-[0_24px_80px_rgba(17,17,17,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-accent)]">
              Payments
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
                {record.vendorName}
              </h1>
              <PaymentRecordStatusBadge status={record.status} />
            </div>
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              {record.projectName} ({record.projectCode}) | {record.poNumber ?? "No PO"}{" "}
              {record.contractNumber ? `| Contract ${record.contractNumber}` : ""}
            </p>
            {record.workflowOverrideStatus ? (
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                Workflow override: {record.workflowOverrideStatus.replaceAll("_", " ")}
                {record.workflowOverrideReason
                  ? ` | ${record.workflowOverrideReason}`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 xl:justify-end">
            <RecommendedActionButton
              record={record}
              assignmentLabel={assignmentLabel}
              canManageInstallments={canManageInstallments}
              canCloseRecord={canCloseRecord}
              hidePassiveAction
            />
            <Button asChild variant="secondary">
              <Link href={`/admin/projects/${record.projectId}`}>Open Project</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/payments">Back to Payments</Link>
            </Button>
            {canExport ? (
              <Button asChild variant="secondary">
                <Link href={`/admin/payments/${record.projectVendorId}/report`}>
                  Export PDF
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <WorkflowStepTile key={step.label} index={index + 1} step={step} />
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3 2xl:grid-cols-6">
          <MetricTile
            label="Total PO Amount"
            value={record.amountMissing ? "Not set" : formatCompactSarAmount(record.totalAmount)}
            valueTitle={record.amountMissing ? "PO amount not set" : formatSarAmount(record.totalAmount)}
            helper={record.amountMissing ? "PO amount not set" : "From PO / contract"}
          />
          <MetricTile
            label="Paid"
            value={formatCompactSarAmount(record.paidAmount)}
            valueTitle={formatSarAmount(record.paidAmount)}
            helper="Paid installments"
          />
          <MetricTile
            label="Remaining"
            value={record.amountMissing ? "Pending" : formatCompactSarAmount(record.remainingAmount)}
            valueTitle={
              record.amountMissing ? "Pending amount" : formatSarAmount(record.remainingAmount)
            }
            helper={record.amountMissing ? "Awaiting PO amount" : "Outstanding finance exposure"}
          />
          <MetricTile
            label="Progress"
            value={record.amountMissing ? "Pending" : `${Math.round(record.progressPercent)}%`}
            helper="Payment completion"
          />
          <MetricTile
            label="Finance Owner"
            value={record.financeOwner?.name ?? "Unassigned"}
            helper={record.financeOwner?.title ?? "Finance owner pending"}
            variant="text"
          />
          <MetricTile
            label="Next Due"
            value={formatDate(record.nextDueDate)}
            helper={record.nextDueDate ? "Next scheduled payment date" : "No payment due yet"}
            variant="text"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryLine label="Project" value={`${record.projectName} (${record.projectCode})`} />
              <SummaryLine label="Client" value={record.clientName} />
              <SummaryLine label="Location" value={record.projectLocation} />
              <SummaryLine label="Vendor" value={`${record.vendorName} (${record.vendorId})`} />
              <SummaryLine label="PO Reference" value={record.poNumber ?? "-"} />
              <SummaryLine label="Contract Reference" value={record.contractNumber ?? "-"} />
              <SummaryLine
                label="Invoice Stage"
                value={`${record.invoiceReceivedCount} received | ${record.approvedInvoiceCount} approved`}
              />
              <SummaryLine
                label="Payment Stage"
                value={`${record.scheduledInstallmentCount} scheduled | ${record.paidInstallmentCount} paid`}
              />
            </div>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
                Next Guided Step
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
                {getRecommendedActionLabel(record.recommendedAction)}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                {getRecommendedActionDescription(record)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <RecommendedActionButton
                record={record}
                assignmentLabel={assignmentLabel}
                canManageInstallments={canManageInstallments}
                canCloseRecord={canCloseRecord}
              />
            </div>
          </CardContent>
        </Card>

        <Card id="payment-governance" className="scroll-mt-28">
          <CardHeader>
            <CardTitle>Finance Governance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Assign the finance owner, capture governance notes, control hold or dispute
              states, and manage record closure once the workflow is complete.
            </p>
            <PaymentRecordGovernanceForm
              projectVendorId={record.projectVendorId}
              redirectTo={redirectTo}
              financeOwners={detail.financeOwners}
              currentFinanceOwnerUserId={record.financeOwner?.id ?? null}
              paymentNotes={record.paymentNotes}
              currentWorkflowOverrideStatus={record.workflowOverrideStatus}
              currentWorkflowOverrideReason={record.workflowOverrideReason}
              closedAt={record.closedAt}
              canAssignFinanceOwner={canAssignOwner}
              canCloseRecord={canCloseRecord}
              canClosePayment={record.canClosePayment}
            />
          </CardContent>
        </Card>
      </section>

      <Card id="payment-workspace" className="scroll-mt-28 overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Finance Record Workspace</CardTitle>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                Follow the controlled finance process from invoice intake through scheduling,
                payment, closure, and audit review.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TABS.map((tab) => (
                <Button
                  key={tab.key}
                  asChild
                  variant={activeTab === tab.key ? "default" : "secondary"}
                  size="sm"
                >
                  <Link href={`/admin/payments/${record.projectVendorId}?tab=${tab.key}`}>
                    {tab.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {activeTab === "overview" ? (
            <OverviewTab
              record={record}
              assignmentLabel={assignmentLabel}
              canManageInstallments={canManageInstallments}
              canCloseRecord={canCloseRecord}
            />
          ) : null}
          {activeTab === "installments" ? (
            <InstallmentsTab
              record={record}
              assignmentLabel={assignmentLabel}
              canManageInstallments={canManageInstallments}
            />
          ) : null}
          {activeTab === "invoices" ? (
            <InvoicesTab
              record={record}
              assignmentLabel={assignmentLabel}
              canManageInstallments={canManageInstallments}
            />
          ) : null}
          {activeTab === "finance-review" ? (
            <FinanceReviewTab
              record={record}
              assignmentLabel={assignmentLabel}
              canManageInstallments={canManageInstallments}
            />
          ) : null}
          {activeTab === "certificates" ? (
            <CertificatesTab projectId={record.projectId} record={record} />
          ) : null}
          {activeTab === "audit" ? (
            <AuditTrailTab
              auditTrail={record.auditTrail}
              canViewTechnicalAuditDetails={canViewTechnicalAuditDetails}
            />
          ) : null}
          {activeTab === "notes" ? (
            <NotesTab record={record} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function getPaymentTab(value: string | undefined): PaymentTabKey {
  if (PAYMENT_TABS.some((tab) => tab.key === value)) {
    return value as PaymentTabKey;
  }

  return "overview";
}

function PaymentNoticeBanner({ notice }: { notice?: string }) {
  switch (notice) {
    case "payment-saved":
      return (
        <PageNotice
          title="Payment workflow updated"
          body="The installment workflow was updated successfully and the finance record has been refreshed."
        />
      );
    case "payment-fully-paid":
      return (
        <PageNotice
          title="Payment record fully paid"
          body="Paid installments now cover the full PO amount for this assignment."
        />
      );
    case "payment-record-updated":
      return (
        <PageNotice
          title="Finance governance updated"
          body="Ownership, notes, and workflow override settings were saved successfully."
        />
      );
    case "payment-record-closed":
      return (
        <PageNotice
          title="Payment record closed"
          body="The payment record has been closed successfully."
        />
      );
    case "payment-record-reopened":
      return (
        <PageNotice
          title="Payment record reopened"
          body="The finance workflow is active again and ready for follow-up."
        />
      );
    default:
      return null;
  }
}

function buildWorkflowSteps(record: PaymentRecordView) {
  const currentStep = getCurrentWorkflowStep(record);

  return [
    {
      label: "PO Amount Confirmed",
      helper: getWorkflowStepSubtitle(record, currentStep, 1),
      state: getStepState(currentStep, 1),
    },
    {
      label: "Invoice Received",
      helper: getWorkflowStepSubtitle(record, currentStep, 2),
      state: getStepState(currentStep, 2),
    },
    {
      label: "Finance Review",
      helper: getWorkflowStepSubtitle(record, currentStep, 3),
      state: getStepState(currentStep, 3),
    },
    {
      label: "Payment Scheduled",
      helper: getWorkflowStepSubtitle(record, currentStep, 4),
      state: getStepState(currentStep, 4),
    },
    {
      label: "Paid",
      helper: getWorkflowStepSubtitle(record, currentStep, 5),
      state: getStepState(currentStep, 5),
    },
    {
      label: "Closed",
      helper: getWorkflowStepSubtitle(record, currentStep, 6),
      state: getStepState(currentStep, 6),
    },
  ] as const;
}

function getCurrentWorkflowStep(record: PaymentRecordView) {
  switch (record.status) {
    case "PO_AMOUNT_REQUIRED":
      return 0;
    case "READY_FOR_INVOICE":
    case "AWAITING_INVOICE":
      return 1;
    case "INVOICE_RECEIVED":
      return 2;
    case "UNDER_FINANCE_REVIEW":
      return 2;
    case "PAYMENT_SCHEDULED":
      return 4;
    case "PARTIALLY_PAID":
      return 4;
    case "FULLY_PAID":
      return 5;
    case "CLOSED":
      return 6;
    case "ON_HOLD":
    case "DISPUTED":
      if (record.scheduledInstallmentCount > 0) {
        return 4;
      }

      if (record.approvedInvoiceCount > 0) {
        return 3;
      }

      if (record.invoiceReceivedCount > 0) {
        return 2;
      }

      return record.amountMissing ? 0 : 1;
    default:
      return record.amountMissing ? 0 : 1;
  }
}

function getStepState(currentStep: number, stepIndex: number) {
  if (stepIndex <= currentStep) {
    return "complete";
  }

  return "pending";
}

function getWorkflowStepSubtitle(
  record: PaymentRecordView,
  currentStep: number,
  stepIndex: number,
) {
  if (stepIndex <= currentStep) {
    return getCompletedWorkflowStepSubtitle(record, stepIndex);
  }

  if (stepIndex === currentStep + 1) {
    return getActiveWorkflowStepSubtitle(record, stepIndex);
  }

  return "Pending";
}

function getCompletedWorkflowStepSubtitle(
  record: PaymentRecordView,
  stepIndex: number,
) {
  switch (stepIndex) {
    case 1:
      return "Amount confirmed";
    case 2:
      return hasOdooInvoice(record)
        ? "Odoo invoice confirmed"
        : "Invoice received";
    case 3:
      return "Finance reviewed";
    case 4:
      return "Payment scheduled";
    case 5:
      return "Installments paid";
    case 6:
      return "Closed";
    default:
      return "Completed";
  }
}

function getActiveWorkflowStepSubtitle(
  record: PaymentRecordView,
  stepIndex: number,
) {
  switch (stepIndex) {
    case 1:
      return record.amountMissing ? "Set PO amount" : "Amount confirmed";
    case 2:
      return "Awaiting invoice";
    case 3:
      return "Under finance review";
    case 4:
      return "Scheduling pending";
    case 5:
      return "Payment pending";
    case 6:
      return "Closure pending";
    default:
      return "Pending";
  }
}

function hasOdooInvoice(record: PaymentRecordView) {
  return record.installments.some((installment) => installment.invoiceExistsInOdoo);
}

function WorkflowStepTile({
  index,
  step,
}: {
  index: number;
  step: {
    label: string;
    helper: string;
    state: "complete" | "current" | "pending";
  };
}) {
  const toneClass =
    step.state === "complete"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : step.state === "current"
        ? "border-[var(--color-primary)] bg-[var(--color-panel-soft)] text-[var(--color-ink)]"
        : "border-[var(--color-border)] bg-white text-[var(--color-muted)]";

  const counterClass =
    step.state === "complete"
      ? "bg-emerald-600 text-white"
      : step.state === "current"
        ? "bg-[var(--color-primary)] text-white"
        : "bg-[var(--color-panel-soft)] text-[var(--color-muted)]";

  return (
    <div className={`rounded-[24px] border px-5 py-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${counterClass}`}>
          {index}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-5">{step.label}</p>
          <p className="mt-1 text-[13px] leading-5">{step.helper}</p>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  valueTitle,
  helper,
  variant = "metric",
}: {
  label: string;
  value: string;
  valueTitle?: string;
  helper?: string;
  variant?: "metric" | "text";
}) {
  return (
    <div className="flex min-h-[152px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(17,17,17,0.04)]">
      <p className={getAdaptiveCapsLabelClass(label, "metric")}>
        {label}
      </p>
      <p
        title={valueTitle ?? value}
        className={`mt-4 min-w-0 flex-1 font-semibold text-[var(--color-ink)] ${getAdaptiveMetricValueClass(value, variant)}`}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">{helper}</p>
      ) : null}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
      <p className={getAdaptiveCapsLabelClass(label, "summary")}>
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function OverviewTab({
  record,
  assignmentLabel,
  canManageInstallments,
  canCloseRecord,
}: {
  record: PaymentRecordView;
  assignmentLabel: string;
  canManageInstallments: boolean;
  canCloseRecord: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
            Current Workflow Status
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PaymentRecordStatusBadge status={record.status} />
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              {getRecommendedActionDescription(record)}
            </p>
          </div>
        </div>
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
            Guided Next Action
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <RecommendedActionButton
              record={record}
              assignmentLabel={assignmentLabel}
              canManageInstallments={canManageInstallments}
              canCloseRecord={canCloseRecord}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryLine label="Invoice Readiness" value={`${record.invoiceReceivedCount} received`} />
        <SummaryLine label="Finance Approval" value={`${record.approvedInvoiceCount} approved`} />
        <SummaryLine label="Scheduled Installments" value={`${record.scheduledInstallmentCount}`} />
      </div>
    </div>
  );
}

function InstallmentsTab({
  record,
  assignmentLabel,
  canManageInstallments,
}: {
  record: PaymentRecordView;
  assignmentLabel: string;
  canManageInstallments: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">
            Installment workflow
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            Each installment moves through invoice intake, finance review, scheduling,
            payment, and final completion.
          </p>
        </div>
        {canManageInstallments ? (
          <PaymentInstallmentModalLauncher
            projectId={record.projectId}
            projectVendorId={record.projectVendorId}
            assignmentLabel={assignmentLabel}
            redirectTo={`/admin/payments/${record.projectVendorId}?tab=installments`}
            buttonLabel="Add Installment"
            buttonSize="default"
            assignmentAmount={record.activeAmount}
            plannedAmount={record.plannedAmount}
            mode="create"
          />
        ) : null}
      </div>

      {record.installments.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-sm leading-7 text-[var(--color-muted)]">
          No installments have been added to this payment record yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-[var(--color-panel-soft)] text-left text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Installment</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Amount</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Due Date</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Invoice</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Scheduled / Paid</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Status</TableHeaderLabel>
                </th>
                <th className="px-4 py-3 text-right">
                  <TableHeaderLabel className="text-right">Actions</TableHeaderLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {record.installments.map((installment, index) => (
                <tr
                  key={installment.id}
                  className="border-t border-[var(--color-border)] align-top"
                >
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Installment {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {installment.condition}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-medium text-[var(--color-ink)]">
                    {formatSarAmount(installment.amount)}
                  </td>
                  <td className="px-4 py-4">{formatDate(installment.dueDate)}</td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[var(--color-ink)]">
                      {installment.invoiceNumber ?? "Awaiting invoice"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {formatDate(installment.invoiceReceivedDate)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[var(--color-ink)]">
                      {formatDate(installment.scheduledPaymentDate)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Paid {formatDate(installment.paymentDate)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <PaymentInstallmentStatusBadge status={installment.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {canManageInstallments ? (
                        <PaymentInstallmentModalLauncher
                          projectId={record.projectId}
                          projectVendorId={record.projectVendorId}
                          assignmentLabel={assignmentLabel}
                          redirectTo={`/admin/payments/${record.projectVendorId}?tab=installments`}
                          buttonLabel="Edit"
                          assignmentAmount={record.activeAmount}
                          plannedAmount={record.plannedAmount}
                          installment={installment}
                          mode="edit"
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvoicesTab({
  record,
  assignmentLabel,
  canManageInstallments,
}: {
  record: PaymentRecordView;
  assignmentLabel: string;
  canManageInstallments: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Invoices</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Capture invoice numbers, tax validation, received dates, and document links before finance review.
        </p>
      </div>

      {record.installments.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-sm leading-7 text-[var(--color-muted)]">
          No installments are available yet. Add an installment before recording invoice activity.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-[var(--color-panel-soft)] text-left text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Installment</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Invoice Number</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Invoice Date</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Invoice Amount</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Received</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Tax Validation</TableHeaderLabel>
                </th>
                <th className="px-4 py-3">
                  <TableHeaderLabel>Status</TableHeaderLabel>
                </th>
                <th className="px-4 py-3 text-right">
                  <TableHeaderLabel className="text-right">Actions</TableHeaderLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {record.installments.map((installment, index) => (
                <tr key={installment.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-4">
                    <p className="font-medium text-[var(--color-ink)]">
                      Installment {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {installment.condition}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{installment.invoiceNumber ?? "-"}</p>
                    {installment.invoiceExistsInOdoo ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Odoo: {installment.odooInvoiceReference ?? "Uploaded"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">{formatDate(installment.invoiceDate)}</td>
                  <td className="px-4 py-4">
                    {installment.invoiceAmount !== null
                      ? formatSarAmount(installment.invoiceAmount)
                      : "-"}
                  </td>
                  <td className="px-4 py-4">{formatDate(installment.invoiceReceivedDate)}</td>
                  <td className="px-4 py-4">
                    {installment.taxInvoiceValidated ? "Validated" : "Pending"}
                  </td>
                  <td className="px-4 py-4">
                    <p>{formatInvoiceStatusLabel(installment.invoiceStatus)}</p>
                    {installment.odooInvoiceStatus ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Uploaded to Odoo
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {canManageInstallments ? (
                        <PaymentInstallmentModalLauncher
                          projectId={record.projectId}
                          projectVendorId={record.projectVendorId}
                          assignmentLabel={assignmentLabel}
                          redirectTo={`/admin/payments/${record.projectVendorId}?tab=invoices`}
                          buttonLabel={
                            installment.invoiceStatus === "MISSING" ? "Add Invoice" : "Update Invoice"
                          }
                          assignmentAmount={record.activeAmount}
                          plannedAmount={record.plannedAmount}
                          installment={installment}
                          mode="invoice"
                        />
                      ) : null}
                      {installment.invoiceStoragePath ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/api/payments/installments/${installment.id}/invoice`}>
                            Open File
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinanceReviewTab({
  record,
  assignmentLabel,
  canManageInstallments,
}: {
  record: PaymentRecordView;
  assignmentLabel: string;
  canManageInstallments: boolean;
}) {
  const reviewQueue = record.installments.filter(
    (installment) =>
      installment.invoiceStatus !== "MISSING" && installment.status !== "PAID" && installment.status !== "CANCELLED",
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
            Finance Owner
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
            {record.financeOwner?.name ?? "Finance owner not assigned"}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            {record.financeOwner?.title ?? "Assign a finance owner from governance before closure."}
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
            Closure Readiness
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
            {record.status === "FULLY_PAID" ? "Ready for closure review" : "Workflow still in progress"}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            Closure requires PO amount confirmation, full payment coverage, no pending installments, and finance ownership.
          </p>
        </div>
      </div>

      {reviewQueue.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-sm leading-7 text-[var(--color-muted)]">
          No installments are waiting for finance review or scheduling.
        </div>
      ) : (
        <div className="space-y-4">
          {reviewQueue.map((installment, index) => (
            <div
              key={installment.id}
              className="rounded-[24px] border border-[var(--color-border)] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--color-ink)]">
                    Installment {index + 1}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {installment.condition} | {formatSarAmount(installment.amount)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Invoice {installment.invoiceNumber ?? "not registered"} | {formatInvoiceStatusLabel(installment.invoiceStatus)}
                    {installment.invoiceExistsInOdoo
                      ? ` | Odoo ${installment.odooInvoiceReference ?? "uploaded"}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PaymentInstallmentStatusBadge status={installment.status} />
                  {installment.invoiceStatus !== "MISSING" ? (
                    <StatusBadge
                      label={formatInvoiceStatusLabel(installment.invoiceStatus)}
                      tone="purple"
                    />
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SummaryLine label="Invoice Amount" value={installment.invoiceAmount !== null ? formatSarAmount(installment.invoiceAmount) : "-"} />
                <SummaryLine
                  label="Odoo Invoice"
                  value={
                    installment.invoiceExistsInOdoo
                      ? installment.odooInvoiceReference ?? "Uploaded to Odoo"
                      : "Not marked in Odoo"
                  }
                />
                <SummaryLine label="Finance Notes" value={installment.financeReviewNotes ?? "No finance review notes yet."} />
              </div>
              {canManageInstallments ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {installment.status === "INVOICE_RECEIVED" || installment.invoiceStatus === "RECEIVED" || installment.invoiceStatus === "REJECTED" ? (
                    <PaymentInstallmentModalLauncher
                      projectId={record.projectId}
                      projectVendorId={record.projectVendorId}
                      assignmentLabel={assignmentLabel}
                      redirectTo={`/admin/payments/${record.projectVendorId}?tab=finance-review`}
                      buttonLabel="Review Invoice"
                      assignmentAmount={record.activeAmount}
                      plannedAmount={record.plannedAmount}
                      installment={installment}
                      mode="review"
                    />
                  ) : null}
                  {installment.invoiceStatus === "APPROVED_FOR_PAYMENT" || installment.status === "UNDER_REVIEW" ? (
                    <PaymentInstallmentModalLauncher
                      projectId={record.projectId}
                      projectVendorId={record.projectVendorId}
                      assignmentLabel={assignmentLabel}
                      redirectTo={`/admin/payments/${record.projectVendorId}?tab=finance-review`}
                      buttonLabel="Schedule Payment"
                      assignmentAmount={record.activeAmount}
                      plannedAmount={record.plannedAmount}
                      installment={installment}
                      mode="schedule"
                    />
                  ) : null}
                  {installment.status === "SCHEDULED" ? (
                    <PaymentInstallmentModalLauncher
                      projectId={record.projectId}
                      projectVendorId={record.projectVendorId}
                      assignmentLabel={assignmentLabel}
                      redirectTo={`/admin/payments/${record.projectVendorId}?tab=finance-review`}
                      buttonLabel="Mark Paid"
                      assignmentAmount={record.activeAmount}
                      plannedAmount={record.plannedAmount}
                      installment={installment}
                      mode="mark-paid"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CertificatesTab({
  projectId,
  record,
}: {
  projectId: string;
  record: PaymentRecordView;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Linked certificates</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Completion certificates remain visible here as execution references for the assignment.
        </p>
      </div>

      {record.certificates.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-sm leading-7 text-[var(--color-muted)]">
          No completion certificates are linked to this assignment yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {record.certificates.map((certificate) => (
            <div
              key={certificate.id}
              className="rounded-[24px] border border-[var(--color-border)] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--color-ink)]">
                    {certificate.certificateCode}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {formatSarAmount(certificate.totalAmount)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Updated {formatDateTime(certificate.updatedAt)}
                  </p>
                </div>
                <CertificateStatusBadge status={certificate.status} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
                    {certificate.status.replaceAll("_", " ")}
                  </p>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/admin/projects/${projectId}/certificates/${certificate.id}`}>
                    Open Certificate
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditTrailTab({
  auditTrail,
  canViewTechnicalAuditDetails,
}: {
  auditTrail: PaymentRecordView["auditTrail"];
  canViewTechnicalAuditDetails: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Audit trail</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Business-readable audit history for finance workflow actions, amount changes, invoice decisions, and closure controls.
        </p>
      </div>

      {auditTrail.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-sm leading-7 text-[var(--color-muted)]">
          No payment audit entries have been recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {auditTrail.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[24px] border border-[var(--color-border)] bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">
                    {formatAuditHeading(entry.action, entry.entityType)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {entry.actorName ?? "System"}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>

              <div className="mt-4 space-y-4">
                {getAuditSummaryRows(entry.details).length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {getAuditSummaryRows(entry.details).map((row) => (
                      <SummaryLine
                        key={`${entry.id}-${row.label}`}
                        label={row.label}
                        value={row.value}
                      />
                    ))}
                  </div>
                ) : null}

                {getAuditComparisonRows(entry.details).length > 0 ? (
                  <div className="overflow-hidden rounded-[18px] border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-panel-soft)] text-left text-[var(--color-muted)]">
                        <tr>
                          <th className="px-4 py-3">
                            <TableHeaderLabel>Field</TableHeaderLabel>
                          </th>
                          <th className="px-4 py-3">
                            <TableHeaderLabel>Previous Value</TableHeaderLabel>
                          </th>
                          <th className="px-4 py-3">
                            <TableHeaderLabel>New Value</TableHeaderLabel>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getAuditComparisonRows(entry.details).map((row) => (
                          <tr
                            key={`${entry.id}-${row.field}`}
                            className="border-t border-[var(--color-border)] align-top"
                          >
                            <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                              {row.field}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-muted)]">
                              {row.previousValue}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-ink)]">
                              {row.newValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {canViewTechnicalAuditDetails ? (
                  <details className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-3">
                    <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
                      View technical details
                    </summary>
                    <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[var(--color-muted)]">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({
  record,
}: {
  record: PaymentRecordView;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">Notes</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Keep finance coordination and closure rationale in a governed notes surface.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryLine
          label="Finance Notes"
          value={record.paymentNotes?.trim() ? record.paymentNotes : "No finance notes recorded yet."}
        />
        <SummaryLine
          label="Workflow Override"
          value={
            record.workflowOverrideStatus
              ? `${record.workflowOverrideStatus.replaceAll("_", " ")}${record.workflowOverrideReason ? ` | ${record.workflowOverrideReason}` : ""}`
              : "No active override"
          }
        />
      </div>
    </div>
  );
}

function RecommendedActionButton({
  record,
  assignmentLabel,
  canManageInstallments,
  canCloseRecord,
  hidePassiveAction = false,
}: {
  record: PaymentRecordView;
  assignmentLabel: string;
  canManageInstallments: boolean;
  canCloseRecord: boolean;
  hidePassiveAction?: boolean;
}) {
  const redirectTo = `/admin/payments/${record.projectVendorId}?tab=overview`;

  if (record.recommendedAction === "SET_PO_AMOUNT") {
    return (
      <Button asChild>
        <Link href={getSetPoAmountHref(record)}>Set PO Amount</Link>
      </Button>
    );
  }

  if (record.recommendedAction === "CLOSE_PAYMENT") {
    if (!canCloseRecord) {
      return hidePassiveAction ? null : (
        <Button asChild variant="secondary">
          <Link href={`/admin/payments/${record.projectVendorId}?tab=notes#payment-governance`}>
            Review Closure
          </Link>
        </Button>
      );
    }

    return (
      <PaymentCloseActionButton
        projectVendorId={record.projectVendorId}
        disabled={!record.canClosePayment}
        disabledReason="Payment cannot be closed until all installments are fully paid"
        label="Close Payment"
      />
    );
  }

  if (!canManageInstallments) {
    if (hidePassiveAction) {
      return null;
    }

    return (
      <Button asChild variant="secondary">
        <Link href={`/admin/payments/${record.projectVendorId}?tab=overview`}>
          Review Record
        </Link>
      </Button>
    );
  }

  if (record.recommendedAction === "ADD_INSTALLMENT") {
    return (
      <PaymentInstallmentModalLauncher
        projectId={record.projectId}
        projectVendorId={record.projectVendorId}
        assignmentLabel={assignmentLabel}
        redirectTo={redirectTo}
        buttonLabel="Add Installment"
        buttonSize="default"
        assignmentAmount={record.activeAmount}
        plannedAmount={record.plannedAmount}
        mode="create"
      />
    );
  }

  if (record.recommendedAction === "ADD_INVOICE" && record.nextActionInstallment) {
    return (
      <PaymentInstallmentModalLauncher
        projectId={record.projectId}
        projectVendorId={record.projectVendorId}
        assignmentLabel={assignmentLabel}
        redirectTo={redirectTo}
        buttonLabel="Add Invoice"
        buttonSize="default"
        assignmentAmount={record.activeAmount}
        plannedAmount={record.plannedAmount}
        installment={record.nextActionInstallment}
        mode="invoice"
      />
    );
  }

  if (record.recommendedAction === "REVIEW_INVOICE" && record.nextActionInstallment) {
    return (
      <PaymentInstallmentModalLauncher
        projectId={record.projectId}
        projectVendorId={record.projectVendorId}
        assignmentLabel={assignmentLabel}
        redirectTo={redirectTo}
        buttonLabel="Review Invoice"
        buttonSize="default"
        assignmentAmount={record.activeAmount}
        plannedAmount={record.plannedAmount}
        installment={record.nextActionInstallment}
        mode="review"
      />
    );
  }

  if (record.recommendedAction === "SCHEDULE_PAYMENT" && record.nextActionInstallment) {
    return (
      <PaymentInstallmentModalLauncher
        projectId={record.projectId}
        projectVendorId={record.projectVendorId}
        assignmentLabel={assignmentLabel}
        redirectTo={redirectTo}
        buttonLabel="Schedule Payment"
        buttonSize="default"
        assignmentAmount={record.activeAmount}
        plannedAmount={record.plannedAmount}
        installment={record.nextActionInstallment}
        mode="schedule"
      />
    );
  }

  if (record.recommendedAction === "MARK_PAID" && record.nextActionInstallment) {
    return (
      <PaymentInstallmentModalLauncher
        projectId={record.projectId}
        projectVendorId={record.projectVendorId}
        assignmentLabel={assignmentLabel}
        redirectTo={redirectTo}
        buttonLabel="Mark Paid"
        buttonSize="default"
        assignmentAmount={record.activeAmount}
        plannedAmount={record.plannedAmount}
        installment={record.nextActionInstallment}
        mode="mark-paid"
      />
    );
  }

  if (hidePassiveAction) {
    return null;
  }

  return (
    <Button asChild variant="secondary">
      <Link href={`/admin/payments/${record.projectVendorId}?tab=overview`}>
        View Record
      </Link>
    </Button>
  );
}

function getRecommendedActionLabel(action: PaymentRecordView["recommendedAction"]) {
  switch (action) {
    case "SET_PO_AMOUNT":
      return "Set PO Amount";
    case "ADD_INSTALLMENT":
      return "Add Installment";
    case "ADD_INVOICE":
      return "Add Invoice";
    case "REVIEW_INVOICE":
      return "Review Invoice";
    case "SCHEDULE_PAYMENT":
      return "Schedule Payment";
    case "MARK_PAID":
      return "Mark Paid";
    case "CLOSE_PAYMENT":
      return "Close Payment";
    case "VIEW_RECORD":
    default:
      return "Review Record";
  }
}

function getRecommendedActionDescription(record: PaymentRecordView) {
  switch (record.recommendedAction) {
    case "SET_PO_AMOUNT":
      return "Payment tracking cannot start until the PO or contract amount is confirmed on the assignment.";
    case "ADD_INSTALLMENT":
      return "Define the installment plan for this assignment before invoice processing begins.";
    case "ADD_INVOICE":
      return "The next installment is waiting for invoice intake and document registration.";
    case "REVIEW_INVOICE":
      return "Finance review is required before the invoice can move to payment scheduling.";
    case "SCHEDULE_PAYMENT":
      return "The invoice is approved and now needs a scheduled payment date.";
    case "MARK_PAID":
      return "The installment is scheduled and ready for payment confirmation.";
    case "CLOSE_PAYMENT":
      return "The PO amount is fully paid. Review closure readiness and close the record.";
    case "VIEW_RECORD":
    default:
      return "Review the full finance record, audit, and governance notes.";
  }
}

function BadgeTone({ label, tone }: { label: string; tone: "purple" | "green" | "orange" | "red" | "neutral" }) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "orange"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-rose-50 text-rose-700"
          : tone === "purple"
            ? "bg-[var(--color-panel-soft)] text-[var(--color-primary)]"
            : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}>
      {label}
    </span>
  );
}

function formatAuditHeading(action: string, entityType: string) {
  return `${action.replaceAll("_", " ")} · ${entityType
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")}`;
}

type AuditDetailsRecord = Record<string, unknown>;

function asAuditDetailsRecord(value: unknown): AuditDetailsRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as AuditDetailsRecord;
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (typeof value === "string") {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate) && /T|\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatDateTime(new Date(parsedDate));
    }

    return value.replaceAll("_", " ");
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return JSON.stringify(value);
}

function formatAuditFieldValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (
    field === "PO Amount" ||
    field === "Installment Amount" ||
    field === "Payment Amount" ||
    field === "Invoice Amount"
  ) {
    return formatSarAmount(Number(value));
  }

  return formatAuditValue(value);
}

function getAuditSummaryRows(details: unknown) {
  const record = asAuditDetailsRecord(details);

  if (!record) {
    return [];
  }

  const summaryFieldMap: Array<[string, string]> = [
    ["poNumber", "PO Number"],
    ["contractNumber", "Contract Number"],
    ["vendorId", "Vendor ID"],
    ["vendorName", "Vendor Name"],
    ["projectName", "Project"],
    ["reason", "Reason"],
    ["workflowIntent", "Workflow Step"],
    ["sourceSyncReason", "Sync Reason"],
  ];

  return summaryFieldMap
    .filter(([key]) => record[key] !== undefined && record[key] !== null && record[key] !== "")
    .map(([key, label]) => ({
      label,
      value: formatAuditValue(record[key]),
    }));
}

function getAuditComparisonRows(details: unknown) {
  const record = asAuditDetailsRecord(details);

  if (!record) {
    return [];
  }

  const comparisonFieldMap: Array<{
    label: string;
    previousKey: string;
    nextKey: string;
  }> = [
    {
      label: "Finance Owner",
      previousKey: "previousFinanceOwnerName",
      nextKey: "nextFinanceOwnerName",
    },
    {
      label: "Payment Notes",
      previousKey: "previousPaymentNotes",
      nextKey: "nextPaymentNotes",
    },
    {
      label: "Workflow Override",
      previousKey: "previousWorkflowOverrideStatus",
      nextKey: "nextWorkflowOverrideStatus",
    },
    {
      label: "PO Number",
      previousKey: "previousPoNumber",
      nextKey: "nextPoNumber",
    },
    {
      label: "Contract Number",
      previousKey: "previousContractNumber",
      nextKey: "nextContractNumber",
    },
    {
      label: "PO Amount",
      previousKey: "previousPoAmount",
      nextKey: "nextPoAmount",
    },
    {
      label: "Installment Amount",
      previousKey: "previousAmount",
      nextKey: "nextAmount",
    },
    {
      label: "Installment Status",
      previousKey: "previousStatus",
      nextKey: "nextStatus",
    },
    {
      label: "Invoice Status",
      previousKey: "previousInvoiceStatus",
      nextKey: "nextInvoiceStatus",
    },
    {
      label: "Invoice Exists In Odoo",
      previousKey: "previousInvoiceExistsInOdoo",
      nextKey: "nextInvoiceExistsInOdoo",
    },
    {
      label: "Odoo Invoice Status",
      previousKey: "previousOdooInvoiceStatus",
      nextKey: "nextOdooInvoiceStatus",
    },
    {
      label: "Odoo Invoice Reference",
      previousKey: "previousOdooInvoiceReference",
      nextKey: "nextOdooInvoiceReference",
    },
    {
      label: "Odoo Upload Date",
      previousKey: "previousOdooInvoiceUploadedAt",
      nextKey: "nextOdooInvoiceUploadedAt",
    },
    {
      label: "Odoo Notes",
      previousKey: "previousOdooInvoiceNotes",
      nextKey: "nextOdooInvoiceNotes",
    },
    {
      label: "Invoice Number",
      previousKey: "previousInvoiceNumber",
      nextKey: "nextInvoiceNumber",
    },
    {
      label: "Invoice Date",
      previousKey: "previousInvoiceDate",
      nextKey: "nextInvoiceDate",
    },
    {
      label: "Invoice Amount",
      previousKey: "previousInvoiceAmount",
      nextKey: "nextInvoiceAmount",
    },
    {
      label: "Scheduled Payment Date",
      previousKey: "previousScheduledPaymentDate",
      nextKey: "nextScheduledPaymentDate",
    },
    {
      label: "Closed At",
      previousKey: "previousClosedAt",
      nextKey: "nextClosedAt",
    },
  ];

  return comparisonFieldMap
    .filter(
      ({ previousKey, nextKey }) =>
        record[previousKey] !== undefined || record[nextKey] !== undefined,
    )
    .map(({ label, previousKey, nextKey }) => ({
      field: label,
      previousValue: formatAuditFieldValue(label, record[previousKey]),
      newValue: formatAuditFieldValue(label, record[nextKey]),
    }));
}

function getAmountDisplay(record: PaymentRecordView) {
  return record.amountMissing
    ? "PO amount not set"
    : formatSarAmount(record.totalAmount);
}

function formatInvoiceStatusLabel(status: PaymentRecordView["installments"][number]["invoiceStatus"]) {
  switch (status) {
    case "APPROVED_FOR_PAYMENT":
      return "Approved";
    case "VALIDATED":
      return "Validated";
    case "RECEIVED":
      return "Received";
    case "REJECTED":
      return "Rejected";
    case "MISSING":
    default:
      return "Missing";
  }
}

function getSetPoAmountHref(
  record: Pick<PaymentRecordView, "projectId" | "projectVendorId">,
) {
  return `/admin/projects/${record.projectId}?editAssignment=${record.projectVendorId}#assignment-${record.projectVendorId}`;
}

function getAdaptiveCapsLabelClass(
  label: string,
  variant: "metric" | "summary" = "metric",
) {
  const normalizedLength = label.replace(/\s+/g, " ").trim().length;

  if (variant === "summary") {
    if (normalizedLength > 16) {
      return "whitespace-nowrap overflow-hidden text-ellipsis text-[10px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]";
    }

    return "whitespace-nowrap overflow-hidden text-ellipsis text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]";
  }

  if (normalizedLength > 16) {
    return "whitespace-nowrap overflow-hidden text-ellipsis text-[10px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]";
  }

  if (normalizedLength > 12) {
    return "whitespace-nowrap overflow-hidden text-ellipsis text-[10.5px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]";
  }

  return "whitespace-nowrap overflow-hidden text-ellipsis text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]";
}

function getAdaptiveMetricValueClass(value: string, variant: "metric" | "text" = "metric") {
  const normalizedLength = value.trim().length;

  if (variant === "text") {
    if (normalizedLength > 16) {
      return "line-clamp-2 text-[clamp(1.15rem,1.35vw,1.55rem)] leading-tight tracking-[-0.025em]";
    }

    return "line-clamp-2 text-[clamp(1.3rem,1.55vw,1.75rem)] leading-tight tracking-[-0.03em]";
  }

  if (normalizedLength > 14) {
    return "whitespace-nowrap tabular-nums text-[clamp(1.35rem,1.45vw,1.75rem)] leading-none tracking-[-0.045em]";
  }

  if (normalizedLength > 10) {
    return "whitespace-nowrap tabular-nums text-[clamp(1.55rem,1.65vw,1.95rem)] leading-none tracking-[-0.04em]";
  }

  return "whitespace-nowrap tabular-nums text-[clamp(1.7rem,1.8vw,2.1rem)] leading-none tracking-tight";
}

function formatCompactSarAmount(amount: number) {
  if (amount === 0) {
    return "SAR 0";
  }

  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount >= 1_000_000) {
    return `SAR ${trimCompactDecimal(amount / 1_000_000)}M`;
  }

  if (absoluteAmount >= 1_000) {
    return `SAR ${trimCompactDecimal(amount / 1_000)}K`;
  }

  return `SAR ${trimCompactDecimal(amount)}`;
}

function trimCompactDecimal(value: number) {
  const fixed =
    Math.abs(value) >= 100 ? value.toFixed(0) : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);

  return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}
