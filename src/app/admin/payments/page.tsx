import Link from "next/link";
import type { ReactNode } from "react";

import { PaymentsRowActions } from "@/components/admin/payments-row-actions";
import {
  PaymentRecordStatusBadge,
} from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { requireAdminSession } from "@/lib/auth";
import {
  canClosePayments,
  canCreatePaymentPlan,
  canExportPayments,
  canUpdatePayments,
  canViewPayments,
} from "@/lib/permissions";
import type { PaymentRecordListItemView, PaymentRecordStatusView } from "@/lib/types";
import { formatDate, formatSarAmount } from "@/lib/utils";
import { getPaymentsWorkspace } from "@/server/queries/payment-queries";

type PaymentsPageProps = {
  searchParams: Promise<{
    search?: string;
    projectId?: string;
    vendorId?: string;
    reference?: string;
    paymentStatus?: PaymentRecordStatusView | "";
    financeOwnerUserId?: string;
    dueFrom?: string;
    dueTo?: string;
    overdueOnly?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 12;

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const session = await requireAdminSession();

  if (!canViewPayments(session.user)) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Payments"
          title="Payments workspace"
          description="You do not have permission to access the payments workspace."
        />
      </PageShell>
    );
  }

  const filters = await searchParams;
  const data = await getPaymentsWorkspace(session.user, filters);
  const canManageInstallments =
    canCreatePaymentPlan(session.user) || canUpdatePayments(session.user);
  const canExport = canExportPayments(session.user);
  const canClose = canClosePayments(session.user);
  const currentPage = normalizePage(filters.page, data.records.length);
  const totalPages = Math.max(1, Math.ceil(data.records.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = data.records.slice(pageStart, pageStart + PAGE_SIZE);

  const buildHref = (overrides: Record<string, string | null | undefined>) =>
    buildSearchHref(filters, overrides);
  const exportHref = (format: "csv" | "excel" | "pdf") =>
    buildSearchHref(filters, {
      format,
      page: undefined,
    }, "/admin/payments/export");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Payments"
        title="Finance operations workspace"
        description="Track PO-backed payment exposure, installment timelines, finance ownership, and payment closure across every project assignment from one enterprise-grade workspace."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/payments">Reset Filters</Link>
            </Button>
            {canExport ? (
              <>
                <Button asChild variant="secondary">
                  <Link href={exportHref("csv")}>Export CSV</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={exportHref("excel")}>Export Excel</Link>
                </Button>
                <Button asChild>
                  <Link href={exportHref("pdf")}>Export PDF</Link>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Total PO Value"
          value={formatCompactSarAmount(data.kpis.totalPoAmount)}
          valueTitle={formatSarAmount(data.kpis.totalPoAmount)}
          hint="Active finance totals"
        />
        <MetricCard
          label="Paid Amount"
          value={formatCompactSarAmount(data.kpis.totalPaid)}
          valueTitle={formatSarAmount(data.kpis.totalPaid)}
          hint="Paid installments"
        />
        <MetricCard
          label="Remaining Amount"
          value={formatCompactSarAmount(data.kpis.totalRemaining)}
          valueTitle={formatSarAmount(data.kpis.totalRemaining)}
          hint="Outstanding finance exposure"
        />
        <MetricCard
          label="Overdue"
          value={String(data.kpis.overduePayments)}
          hint="Overdue installments"
        />
        <MetricCard
          label="Due This Month"
          value={String(data.kpis.dueThisMonth)}
          hint="Open installments due this month"
        />
        <MetricCard
          label="Closed"
          value={String(data.kpis.closedPayments)}
          hint="Closed payment records"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 xl:grid-cols-6" method="get">
            <FilterField className="xl:col-span-2" label="Search">
              <input
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Project, vendor, PO, contract"
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              />
            </FilterField>
            <FilterField label="Project">
              <select
                name="projectId"
                defaultValue={filters.projectId ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All projects</option>
                {data.filters.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName} ({project.projectCode})
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Vendor">
              <select
                name="vendorId"
                defaultValue={filters.vendorId ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All vendors</option>
                {data.filters.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendorName} ({vendor.vendorId})
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select
                name="paymentStatus"
                defaultValue={filters.paymentStatus ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All statuses</option>
                {data.filters.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Finance Owner">
              <select
                name="financeOwnerUserId"
                defaultValue={filters.financeOwnerUserId ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              >
                <option value="">All owners</option>
                {data.filters.financeOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="PO / Contract">
              <input
                name="reference"
                defaultValue={filters.reference ?? ""}
                placeholder="Specific reference"
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              />
            </FilterField>
            <FilterField label="Due From">
              <input
                type="date"
                name="dueFrom"
                defaultValue={filters.dueFrom ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              />
            </FilterField>
            <FilterField label="Due To">
              <input
                type="date"
                name="dueTo"
                defaultValue={filters.dueTo ?? ""}
                className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)]"
              />
            </FilterField>
            <div className="xl:col-span-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-4">
              <label className="inline-flex items-center gap-3 text-sm font-medium text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  name="overdueOnly"
                  value="true"
                  defaultChecked={filters.overdueOnly === "true"}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                Overdue only
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit">Apply Filters</Button>
                <Button asChild variant="secondary">
                  <Link href="/admin/payments">Clear</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Portfolio</CardTitle>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Payment totals follow the issued PO / contract assignment. If an
              amount is missing, use Set PO Amount to activate finance totals.
            </p>
          </div>
          <Chip tone="neutral" size="sm">
            {data.records.length} records
          </Chip>
        </CardHeader>
        <CardContent className="space-y-5">
          {pageRecords.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-8 text-sm leading-7 text-[var(--color-muted)]">
              No payment records match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {pageRecords.map((record) => (
                <PaymentPortfolioCard
                  key={record.projectVendorId}
                  record={record}
                  canManageInstallments={canManageInstallments}
                  canClose={canClose}
                  canExport={canExport}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
              <p className="text-sm text-[var(--color-muted)]">
                Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, data.records.length)} of{" "}
                {data.records.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                >
                  <Link href={buildHref({ page: String(currentPage - 1) })}>
                    Previous
                  </Link>
                </Button>
                <Chip tone="neutral" size="sm">
                  Page {currentPage} / {totalPages}
                </Chip>
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                >
                  <Link href={buildHref({ page: String(currentPage + 1) })}>
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function normalizePage(page: string | undefined, totalRecords: number) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const parsed = Number(page ?? "1");

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(totalPages, Math.floor(parsed));
}

function buildSearchHref(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | null | undefined>,
  pathname = "/admin/payments",
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function MetricCard({
  label,
  value,
  hint,
  valueTitle,
}: {
  label: string;
  value: string;
  hint: string;
  valueTitle?: string;
}) {
  return (
    <div className="flex min-h-[168px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(17,17,17,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </p>
      <p
        title={valueTitle ?? value}
        className={`mt-4 min-w-0 flex-1 whitespace-nowrap font-semibold leading-none text-[var(--color-ink)] tabular-nums ${getAdaptiveMetricValueClass(value)}`}
      >
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">{hint}</p>
    </div>
  );
}

function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className={`mb-2 block ${getAdaptiveCapsLabelClass(label, "field")}`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PaymentPortfolioCard({
  record,
  canManageInstallments,
  canClose,
  canExport,
}: {
  record: PaymentRecordListItemView;
  canManageInstallments: boolean;
  canClose: boolean;
  canExport: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[0_16px_40px_rgba(17,17,17,0.04)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(260px,1.6fr)_minmax(220px,1fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <IdentityBlock label="Project" title={record.projectName} meta={record.projectCode} />
          <IdentityBlock label="Vendor" title={record.vendorName} meta={record.vendorId} />
        </div>

        <div className="min-w-0 space-y-4 md:border-l md:border-[var(--color-border)] md:pl-6 xl:border-r xl:pr-6">
          <div className="space-y-3">
            <SectionLabel>PO / Contract</SectionLabel>
            <DetailLine label="PO" value={record.poNumber ?? "Not set"} />
            <DetailLine label="Contract" value={record.contractNumber ?? "Not set"} />
          </div>

          <div className="space-y-3">
            <SectionLabel>Amounts</SectionLabel>
            <DetailLine
              label="Total"
              value={record.amountMissing ? "Not set" : formatSarAmount(record.totalAmount)}
            />
            <DetailLine label="Paid" value={formatSarAmount(record.paidAmount)} />
            <DetailLine
              label="Remaining"
              value={record.amountMissing ? "Pending" : formatSarAmount(record.remainingAmount)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Progress</SectionLabel>
              <span className="whitespace-nowrap text-sm font-medium text-[var(--color-ink)]">
                {record.amountMissing ? "Pending" : `${Math.round(record.progressPercent)}%`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-panel-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width]"
                style={{
                  width: `${record.amountMissing ? 0 : Math.min(record.progressPercent, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4 md:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <PaymentRecordStatusBadge status={record.status} />
            <PaymentsRowActions
              record={record}
              canManageInstallments={canManageInstallments}
              canClose={canClose}
              canExport={canExport}
            />
          </div>

          <div className="space-y-3">
            <MetaBlock
              label="Finance Owner"
              value={record.financeOwner?.name ?? "Unassigned"}
              helper={record.financeOwner?.title ?? "Finance owner pending"}
            />
            <MetaBlock
              label="Next Due"
              value={formatDate(record.nextDueDate)}
              helper={getDueHelperText(record)}
            />
            <MetaBlock
              label="Installments"
              value={`${record.installmentCount} total`}
              helper={`${record.overdueInstallmentCount} overdue`}
            />
            <MetaBlock
              label="Primary Next Action"
              value={getRecommendedActionLabel(record)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentityBlock({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-[var(--color-ink)]">
        {title}
      </p>
      <p className="mt-1 truncate text-xs leading-5 text-[var(--color-muted)]">{meta}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
      {children}
    </p>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </span>
      <span className="min-w-0 whitespace-nowrap text-sm font-medium text-[var(--color-ink)]">
        {value}
      </span>
    </div>
  );
}

function MetaBlock({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-[var(--color-ink)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{helper}</p>
      ) : null}
    </div>
  );
}

function getAdaptiveCapsLabelClass(label: string, variant: "metric" | "field" | "mini" = "metric") {
  const normalizedLength = label.replace(/\s+/g, " ").trim().length;

  if (variant === "field") {
    if (normalizedLength > 16) {
      return "whitespace-nowrap overflow-hidden text-ellipsis text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";
    }

    return "whitespace-nowrap overflow-hidden text-ellipsis text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]";
  }

  if (variant === "mini") {
    if (normalizedLength > 14) {
      return "whitespace-nowrap overflow-hidden text-ellipsis text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)]";
    }

    return "whitespace-nowrap overflow-hidden text-ellipsis text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[var(--color-muted)]";
  }

  if (normalizedLength > 16) {
    return "whitespace-nowrap overflow-hidden text-ellipsis text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]";
  }

  if (normalizedLength > 12) {
    return "whitespace-nowrap overflow-hidden text-ellipsis text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";
  }

  return "whitespace-nowrap overflow-hidden text-ellipsis text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]";
}

function getAdaptiveMetricValueClass(value: string) {
  const normalizedLength = value.trim().length;

  if (normalizedLength > 12) {
    return "text-[clamp(1.7rem,1.8vw,2.15rem)] tracking-[-0.045em]";
  }

  if (normalizedLength > 8) {
    return "text-[clamp(1.85rem,1.95vw,2.3rem)] tracking-[-0.035em]";
  }

  return "text-[clamp(2rem,2.1vw,2.45rem)] tracking-tight";
}

function getRecommendedActionLabel(record: PaymentRecordListItemView) {
  if (record.amountMissing) {
    return "Set amount";
  }

  switch (record.recommendedAction) {
    case "ADD_INSTALLMENT":
      return "Add installment";
    case "ADD_INVOICE":
      return "Add invoice";
    case "REVIEW_INVOICE":
      return "Review invoice";
    case "SCHEDULE_PAYMENT":
      return "Schedule payment";
    case "MARK_PAID":
      return "Mark paid";
    case "CLOSE_PAYMENT":
      return "Close payment";
    case "SET_PO_AMOUNT":
      return "Set amount";
    default:
      return "View details";
  }
}

function getDueHelperText(record: PaymentRecordListItemView) {
  if (record.overdueInstallmentCount > 0) {
    return `${record.overdueInstallmentCount} overdue`;
  }

  if (record.upcomingInstallmentCount > 0) {
    return `${record.upcomingInstallmentCount} upcoming`;
  }

  return `${record.installmentCount} items`;
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
