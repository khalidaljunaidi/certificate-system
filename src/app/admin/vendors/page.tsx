import Form from "next/form";
import Link from "next/link";

import { PageNotice } from "@/components/admin/page-notice";
import {
  VendorEvaluationGradeBadge,
  VendorEvaluationStatusBadge,
  VendorStatusBadge,
} from "@/components/admin/status-badges";
import { VendorRowActions } from "@/components/admin/vendor-row-actions";
import { SupplierInvitationLauncher } from "@/components/forms/supplier-invitation-launcher";
import {
  PageHeader,
  PageHeroMetric,
  PageHeroMetrics,
  PageShell,
} from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TableHeaderLabel } from "@/components/ui/table-header-label";
import { requireAdminSession } from "@/lib/auth";
import {
  VENDOR_EVALUATION_GRADE_OPTIONS,
  VENDOR_STATUS_OPTIONS,
} from "@/lib/constants";
import {
  canManageVendorGovernance,
  canRequestVendorEvaluation,
  canViewPayments,
} from "@/lib/permissions";
import { absoluteUrl, formatDate } from "@/lib/utils";
import { getSupplierInvitations } from "@/server/queries/supplier-invitation-queries";
import {
  getVendorGovernanceOptions,
  getVendorRegistry,
} from "@/server/queries/vendor-queries";
import { getVendorRegistrationRequestSummaries } from "@/server/queries/vendor-registration-queries";

type VendorsPageProps = {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    finalGrade?: string;
    evaluationYear?: string;
    status?: string;
    activeProject?: string;
    notice?: string;
  }>;
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const filters = await searchParams;
  const session = await requireAdminSession();
  const canManageVendor = canManageVendorGovernance(session.user);
  const canRequestEvaluation = canRequestVendorEvaluation(session.user);
  const canOpenPayments = canViewPayments(session.user);

  const [vendors, options, recentRequests, recentInvitations] = await Promise.all([
    getVendorRegistry(filters, { limit: 25 }),
    getVendorGovernanceOptions(),
    canManageVendor
      ? getVendorRegistrationRequestSummaries({}, { limit: 4 })
      : Promise.resolve([]),
    canManageVendor ? getSupplierInvitations(3) : Promise.resolve([]),
  ]);

  const exportParams = new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] =>
        entry[0] !== "notice" && Boolean(entry[1]),
    ),
  );
  const yearOptions = Array.from(
    new Set([
      new Date().getFullYear(),
      ...vendors
        .map((vendor) => vendor.latestEvaluationYear)
        .filter((value): value is number => Boolean(value)),
    ]),
  ).sort((left, right) => right - left);
  const subcategoryOptions = options.categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      ...subcategory,
      categoryName: category.name,
    })),
  );
  const invitationCategories = options.categories.map((category) => ({
    id: category.id,
    name: category.name,
    code: category.externalKey,
  }));
  const activeVendors = vendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const evaluatedVendors = vendors.filter((vendor) => vendor.latestEvaluationYear).length;
  const issuedCertificates = vendors.reduce(
    (sum, vendor) => sum + vendor.issuedCertificateCount,
    0,
  );
  const registrationUrl = absoluteUrl("/supplier-registration");

  return (
    <PageShell>
      {renderVendorNotice(filters.notice)}

      <PageHeader
        eyebrow="Vendors"
        title="Vendor master and supplier onboarding hub."
        description="Run vendor master governance, supplier invitations, and registration intake from one clear workspace without leaving the registry view."
        variant="feature"
        className="tg-reveal"
        metrics={
          <PageHeroMetrics>
            <PageHeroMetric
              label="Registry Size"
              value={String(vendors.length)}
              hint="Vendor master records"
              accent
            />
            <PageHeroMetric
              label="Active Vendors"
              value={String(activeVendors)}
              hint="Currently active in governance"
              accent
            />
            <PageHeroMetric
              label="Issued Certificates"
              value={String(issuedCertificates)}
              hint="Across all vendor-linked assignments"
              accent
            />
          </PageHeroMetrics>
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Supplier Onboarding Hub
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
              Keep vendor master records, supplier invitations, and registration review in one operational home.
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Procurement teams can invite suppliers, review incoming
              registrations, and manage live vendor records from the same
              screen without hunting through separate modules.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip tone="purple">Vendor Master</Chip>
              <Chip tone="orange">Public Registration</Chip>
              <Chip tone="green">Invitation Email</Chip>
              <Chip tone="neutral">Approval Queue</Chip>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 xl:justify-end">
            {canManageVendor ? (
              <>
                <Button asChild>
                  <Link href="/admin/vendors/new">Add Vendor</Link>
                </Button>
                <SupplierInvitationLauncher
                  categories={invitationCategories}
                  registrationUrl={registrationUrl}
                  postSubmitRedirect="/admin/vendors"
                />
                <Button asChild variant="secondary">
                  <Link href="/admin/vendor-registrations">
                    Open Registration Requests
                  </Link>
                </Button>
              </>
            ) : null}
            <Button asChild variant="secondary">
              <Link href={`/admin/vendors/export?format=csv&${exportParams.toString()}`}>
                Export CSV
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/admin/vendors/export?format=excel&${exportParams.toString()}`}>
                Export Excel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {canManageVendor ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Registration Requests</CardTitle>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  Review recent supplier submissions and jump straight into the
                  approval queue when action is needed.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/vendor-registrations">View Registration Queue</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentRequests.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                  No supplier registration requests are waiting in the queue right now.
                </div>
              ) : (
                recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/vendor-registrations/${request.id}`}
                          className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          {request.companyName}
                        </Link>
                        <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                          {request.requestNumber} • {request.country.name} • {request.primaryCategory.name}
                        </p>
                      </div>
                      <RegistrationStatusBadge status={request.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="neutral">
                        Submitted {formatDate(request.submittedAt)}
                      </Badge>
                      <Badge variant="neutral">{request.companyEmail}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Recent Invitations</CardTitle>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                Keep the latest supplier invitation activity visible directly
                from the Vendors hub.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentInvitations.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                  No supplier invitations have been sent yet.
                </div>
              ) : (
                recentInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                          {invitation.supplierContactEmail}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                          {invitation.supplierCompanyName ?? "No company name"}
                          {invitation.supplierContactName
                            ? ` • ${invitation.supplierContactName}`
                            : ""}
                        </p>
                      </div>
                      <InvitationDeliveryBadge
                        status={invitation.emailDeliveryStatus}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="neutral">
                        Invited {formatDate(invitation.invitedAt)}
                      </Badge>
                      {invitation.suggestedCategoryName ? (
                        <Badge variant="purple">{invitation.suggestedCategoryName}</Badge>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="space-y-3">
          <CardTitle>Registry Filters</CardTitle>
          <p className="text-sm leading-7 text-[var(--color-muted)]">
            Filter the registry by governance classification, evaluation
            performance, and live project activity. Results are capped for
            responsiveness; use export for the full dataset.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form action="" className="space-y-4">
            <input
              name="search"
              defaultValue={filters.search}
              placeholder="Search vendor, identifier, email"
              className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <select
                name="categoryId"
                defaultValue={filters.categoryId ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All categories</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.externalKey
                      ? `${category.name} (${category.externalKey})`
                      : category.name}
                  </option>
                ))}
              </select>
              <select
                name="subcategoryId"
                defaultValue={filters.subcategoryId ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All subcategories</option>
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.categoryName} |{" "}
                    {subcategory.externalKey
                      ? `${subcategory.name} (${subcategory.externalKey})`
                      : subcategory.name}
                  </option>
                ))}
              </select>
              <select
                name="finalGrade"
                defaultValue={filters.finalGrade ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All grades</option>
                {VENDOR_EVALUATION_GRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                name="evaluationYear"
                defaultValue={filters.evaluationYear ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All evaluation years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All statuses</option>
                {VENDOR_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                name="activeProject"
                defaultValue={filters.activeProject ?? ""}
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All activity</option>
                <option value="active">With active projects</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">Apply Filters</Button>
              <Button asChild variant="secondary">
                <Link href="/admin/vendors">Reset</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Evaluated Vendors"
          value={String(evaluatedVendors)}
          hint="Vendor records with at least one annual evaluation cycle"
        />
        <MetricCard
          label="Open Governance"
          value={String(
            vendors.filter(
              (vendor) => !vendor.latestEvaluationYear || !vendor.latestFinalGrade,
            ).length,
          )}
          hint="Vendors still awaiting a finalized evaluation outcome"
        />
        <MetricCard
          label="Active Project Footprint"
          value={String(
            vendors.reduce((sum, vendor) => sum + vendor.activeProjectCount, 0),
          )}
          hint="Total active project relationships across the registry"
        />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Vendor Master Registry</CardTitle>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Use the Vendors page as the operational hub for onboarding,
              evaluation follow-up, assignment visibility, and payment access.
            </p>
          </div>
          <Chip tone="neutral" size="sm">
            {vendors.length} records
          </Chip>
        </CardHeader>
        <CardContent className="space-y-5">
          {vendors.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
              No vendors match the current filters.
            </div>
          ) : (
            <>
              <div className="hidden xl:block">
                <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-[var(--color-panel-soft)] text-left text-[var(--color-muted)]">
                      <tr>
                        <th className="px-4 py-3">
                          <TableHeaderLabel>Vendor</TableHeaderLabel>
                        </th>
                        <th className="px-4 py-3">
                          <TableHeaderLabel>Status</TableHeaderLabel>
                        </th>
                        <th className="px-4 py-3">
                          <TableHeaderLabel>Taxonomy</TableHeaderLabel>
                        </th>
                        <th className="px-4 py-3">
                          <TableHeaderLabel>Projects</TableHeaderLabel>
                        </th>
                        <th className="px-4 py-3">
                          <TableHeaderLabel>Certificates</TableHeaderLabel>
                        </th>
                        <th className="px-4 py-3">
                          <TableHeaderLabel>Evaluation</TableHeaderLabel>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <TableHeaderLabel className="text-right">
                            Actions
                          </TableHeaderLabel>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((vendor) => (
                        <tr
                          key={vendor.id}
                          className="border-t border-[var(--color-border)] align-top"
                        >
                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <Link
                                href={`/admin/vendors/${vendor.id}`}
                                className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                              >
                                {vendor.vendorName}
                              </Link>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                {vendor.vendorId}
                                {vendor.supplierId ? ` • ${vendor.supplierId}` : ""}
                              </p>
                              <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                                {vendor.vendorEmail}
                                {vendor.vendorPhone ? ` • ${vendor.vendorPhone}` : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <VendorStatusBadge status={vendor.status} />
                              {vendor.classification ? (
                                <Chip
                                  tone="neutral"
                                  size="sm"
                                  title={vendor.classification}
                                >
                                  {vendor.classification}
                                </Chip>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-ink)]">
                                {vendor.categoryName ?? "Unassigned category"}
                              </p>
                              <SubcategoryChips
                                subcategories={vendor.subcategorySelections}
                                className="mt-2"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                              {vendor.projectCount} projects
                            </p>
                            <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                              {vendor.activeProjectCount} active • {vendor.assignmentCount} assignments
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                              {vendor.issuedCertificateCount} issued
                            </p>
                            <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                              {vendor.certificateCount} total • Latest {formatDate(vendor.latestIssuedAt)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              {vendor.latestFinalGrade ? (
                                <VendorEvaluationGradeBadge grade={vendor.latestFinalGrade} />
                              ) : vendor.latestEvaluationStatus ? (
                                <VendorEvaluationStatusBadge
                                  status={vendor.latestEvaluationStatus}
                                />
                              ) : (
                                <Chip tone="neutral" size="sm">
                                  Awaiting
                                </Chip>
                              )}
                              <p className="text-xs leading-6 text-[var(--color-muted)]">
                                {vendor.latestEvaluationYear
                                  ? `Cycle ${vendor.latestEvaluationYear}`
                                  : "No evaluation yet"}
                                {vendor.latestFinalScorePercent !== null
                                  ? ` • ${vendor.latestFinalScorePercent.toFixed(2)}%`
                                  : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              <VendorRowActions
                                vendorId={vendor.id}
                                canEditVendor={canManageVendor}
                                canRequestEvaluation={canRequestEvaluation}
                                canViewPayments={canOpenPayments}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 xl:hidden">
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[0_16px_40px_rgba(17,17,17,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="line-clamp-2 text-lg font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          {vendor.vendorName}
                        </Link>
                        <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                          {vendor.vendorId}
                          {vendor.supplierId ? ` • ${vendor.supplierId}` : ""}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                          {vendor.vendorEmail}
                          {vendor.vendorPhone ? ` • ${vendor.vendorPhone}` : ""}
                        </p>
                      </div>
                      <VendorStatusBadge status={vendor.status} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MobileStat
                        label="Taxonomy"
                        value={vendor.categoryName ?? "Unassigned category"}
                        meta={formatSubcategorySummary(vendor.subcategorySelections)}
                      />
                      <MobileStat
                        label="Projects"
                        value={`${vendor.projectCount} total`}
                        meta={`${vendor.activeProjectCount} active • ${vendor.assignmentCount} assignments`}
                      />
                      <MobileStat
                        label="Certificates"
                        value={`${vendor.issuedCertificateCount} issued`}
                        meta={`${vendor.certificateCount} total`}
                      />
                      <MobileStat
                        label="Evaluation"
                        value={
                          vendor.latestFinalGrade
                            ? `Grade ${vendor.latestFinalGrade}`
                            : vendor.latestEvaluationStatus
                              ? vendor.latestEvaluationStatus.replaceAll("_", " ")
                              : "Awaiting request"
                        }
                        meta={
                          vendor.latestEvaluationYear
                            ? `Cycle ${vendor.latestEvaluationYear}`
                            : "Not started"
                        }
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap gap-2">
                        {vendor.classification ? (
                          <Chip tone="neutral" size="sm">
                            {vendor.classification}
                          </Chip>
                        ) : null}
                        {vendor.latestFinalGrade ? (
                          <VendorEvaluationGradeBadge grade={vendor.latestFinalGrade} />
                        ) : null}
                      </div>
                      <VendorRowActions
                        vendorId={vendor.id}
                        canEditVendor={canManageVendor}
                        canRequestEvaluation={canRequestEvaluation}
                        canViewPayments={canOpenPayments}
                      />
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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="flex h-full min-w-0 flex-col justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            {value}
          </p>
        </div>
        <p className="text-xs leading-6 text-[var(--color-muted)]">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MobileStat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-ink)]">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-6 text-[var(--color-muted)]">
        {meta}
      </p>
    </div>
  );
}

function formatSubcategorySummary(
  subcategories: Array<{ name: string; externalKey: string | null }>,
) {
  if (subcategories.length === 0) {
    return "No subcategories";
  }

  const visible = subcategories.slice(0, 2).map((subcategory) => subcategory.name);
  const remaining = subcategories.length - visible.length;

  return remaining > 0
    ? `${visible.join(", ")} + ${remaining} more`
    : visible.join(", ");
}

function SubcategoryChips({
  subcategories,
  className,
}: {
  subcategories: Array<{
    id: string;
    name: string;
    externalKey: string | null;
  }>;
  className?: string;
}) {
  if (subcategories.length === 0) {
    return (
      <p className={`text-xs leading-6 text-[var(--color-muted)] ${className ?? ""}`}>
        No subcategories
      </p>
    );
  }

  const visible = subcategories.slice(0, 3);
  const remaining = subcategories.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {visible.map((subcategory) => (
        <Chip key={subcategory.id} tone="neutral" size="sm" title={subcategory.name}>
          {subcategory.name}
        </Chip>
      ))}
      {remaining > 0 ? (
        <Chip tone="purple" size="sm" title={subcategories.map((item) => item.name).join(", ")}>
          +{remaining} more
        </Chip>
      ) : null}
    </div>
  );
}

function RegistrationStatusBadge({
  status,
}: {
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}) {
  const variant =
    status === "APPROVED" ? "green" : status === "REJECTED" ? "red" : "orange";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function InvitationDeliveryBadge({
  status,
}: {
  status: "NOT_REQUESTED" | "SKIPPED" | "SENT" | "FAILED" | "PARTIAL";
}) {
  const variant =
    status === "SENT"
      ? "green"
      : status === "FAILED"
        ? "red"
        : status === "PARTIAL"
          ? "orange"
          : "purple";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function renderVendorNotice(notice?: string) {
  if (notice === "supplier-invitation-sent") {
    return (
      <PageNotice
        title="Supplier invitation sent"
        body="The registration link was sent successfully and the invitation was logged in the system."
      />
    );
  }

  if (notice === "supplier-invitation-skipped") {
    return (
      <PageNotice
        tone="warning"
        title="Invitation saved without email delivery"
        body="The supplier invitation was recorded, but email delivery was skipped in this environment."
      />
    );
  }

  if (notice === "supplier-invitation-failed") {
    return (
      <PageNotice
        tone="error"
        title="Invitation saved, but email delivery failed"
        body="The supplier invitation is logged, but the outbound email could not be delivered. Review the invitation log for details."
      />
    );
  }

  return null;
}
