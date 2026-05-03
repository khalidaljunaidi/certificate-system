import Form from "next/form";
import Link from "next/link";

import { PageNotice } from "@/components/admin/page-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SupplierInvitationLauncher } from "@/components/forms/supplier-invitation-launcher";
import {
  PageHeader,
  PageHeroMetric,
  PageHeroMetrics,
  PageShell,
} from "@/components/layout/page-shell";
import { requireAdminSession } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { absoluteUrl, formatDateTime } from "@/lib/utils";
import {
  getVendorRegistrationFilterOptions,
  getVendorRegistrationRequestList,
  getVendorRegistrationStatusCounts,
} from "@/server/queries/vendor-registration-queries";
import { getSupplierInvitations } from "@/server/queries/supplier-invitation-queries";

type VendorRegistrationsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    countryCode?: string;
    categoryId?: string;
    notice?: string;
    page?: string;
  }>;
};

export default async function VendorRegistrationsPage({
  searchParams,
}: VendorRegistrationsPageProps) {
  const session = await requireAdminSession();

  if (!canManageVendorGovernance(session.user)) {
    return (
      <PageNotice
        tone="error"
        title="Access denied"
        body="You do not have permission to review supplier registrations."
      />
    );
  }

  const search = await searchParams;
  const { page: pageParam, ...filters } = search;
  const page = Math.max(Number(pageParam ?? "1") || 1, 1);
  const [listData, options, counts, invitations] = await Promise.all([
    getVendorRegistrationRequestList(filters, { limit: 30, page }),
    getVendorRegistrationFilterOptions(),
    getVendorRegistrationStatusCounts(filters),
    getSupplierInvitations(5),
  ]);
  const { requests, pagination } = listData;
  const registrationUrl = absoluteUrl("/supplier-registration");

  return (
    <PageShell>
      {renderInvitationNotice(filters.notice)}

      <PageHeader
        eyebrow="Vendor Registrations"
        title="Approval queue and supplier intake."
        description="Review incoming supplier registration requests, validate the form and attachments, then approve or reject the request from a single governed workspace."
        variant="feature"
        metrics={
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f7c08b]">
                Quick Actions
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                Invite suppliers to register
              </p>
              <div className="mt-4">
                <SupplierInvitationLauncher
                  categories={options.categories}
                  registrationUrl={registrationUrl}
                />
              </div>
            </div>
            <PageHeroMetrics className="md:grid-cols-3">
              <PageHeroMetric
                label="Pending Review"
                value={String(counts.PENDING_REVIEW)}
                accent
              />
              <PageHeroMetric
                label="Approved"
                value={String(counts.APPROVED)}
                accent
              />
              <PageHeroMetric
                label="Rejected"
                value={String(counts.REJECTED)}
                accent
              />
            </PageHeroMetrics>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent Invitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.length === 0 ? (
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              No supplier invitations have been sent yet.
            </p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {invitation.supplierContactEmail}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                      {invitation.supplierCompanyName ?? "No company name"}{" "}
                      {invitation.supplierContactName ? `| ${invitation.supplierContactName}` : ""}
                    </p>
                  </div>
                  <InvitationStatusBadge status={invitation.emailDeliveryStatus} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="neutral">
                    Invited {formatDateTime(invitation.invitedAt)}
                  </Badge>
                  <Badge variant="neutral">
                    By {invitation.invitedByName ?? "System"}
                  </Badge>
                  {invitation.suggestedCategoryName ? (
                    <Badge variant="purple">{invitation.suggestedCategoryName}</Badge>
                  ) : null}
                </div>
                {invitation.customMessage ? (
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {invitation.customMessage}
                  </p>
                ) : null}
                {invitation.emailDeliveryError ? (
                  <p className="mt-3 text-xs leading-6 text-[#991b1b]">
                    {invitation.emailDeliveryError}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Form action="/admin/vendor-registrations" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-4">
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Search company, email, CR, VAT, request number"
                className="h-11 min-w-0 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <SelectField
                name="status"
                defaultValue={filters.status ?? ""}
                label="Status"
                options={[
                  { value: "", label: "All statuses" },
                  { value: "PENDING_REVIEW", label: "Pending review" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
              <SelectField
                name="countryCode"
                defaultValue={filters.countryCode ?? ""}
                label="Country"
                options={[
                  { value: "", label: "All countries" },
                  ...options.countries.map((country) => ({
                    value: country.code,
                    label: `${country.name} (${country.code})`,
                  })),
                ]}
              />
              <SelectField
                name="categoryId"
                defaultValue={filters.categoryId ?? ""}
                label="Category"
                options={[
                  { value: "", label: "All categories" },
                  ...options.categories.map((category) => ({
                    value: category.id,
                    label: category.code
                      ? `${category.name} (${category.code})`
                      : category.name,
                  })),
                ]}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">Apply Filters</Button>
              <Button asChild variant="secondary">
                <Link href="/admin/vendor-registrations">Reset</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No supplier registration requests match the selected filters.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr_auto]">
                  <div className="min-w-0 border-b border-[var(--color-border)] p-6 xl:border-b-0 xl:border-r">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/vendor-registrations/${request.id}`}
                          className="truncate text-xl font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          {request.companyName}
                        </Link>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                          {request.requestNumber} | {request.legalName}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-[var(--color-muted)]">
                          {request.countryName} | {request.categoryName}
                          {request.primarySubcategoryName
                            ? ` | ${request.primarySubcategoryName}`
                            : ""}
                        </p>
                      </div>
                      <RegistrationStatusBadge status={request.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="neutral">{request.companyEmail}</Badge>
                      <Badge variant="neutral">{request.crNumber}</Badge>
                      <Badge variant="neutral">{request.vatNumber}</Badge>
                    </div>
                  </div>

                  <div className="min-w-0 border-b border-[var(--color-border)] p-6 xl:border-b-0 xl:border-r">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Review timing
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                      Submitted {request.submittedAt.toLocaleDateString("en-GB")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                      {request.reviewedAt
                        ? `Reviewed ${request.reviewedAt.toLocaleDateString("en-GB")} by ${request.reviewedByName ?? "System"}`
                        : "Awaiting review"}
                    </p>
                    {request.supplierId ? (
                      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                        Supplier ID: {request.supplierId}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 p-6">
                    <Button asChild>
                      <Link href={`/admin/vendor-registrations/${request.id}`}>
                        Open Request
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Page {pagination.page} | Showing up to {pagination.limit} requests
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link
              aria-disabled={!pagination.hasPrevious}
              href={
                pagination.hasPrevious
                  ? buildVendorRegistrationPageHref(filters, pagination.page - 1)
                  : buildVendorRegistrationPageHref(filters, pagination.page)
              }
              className={!pagination.hasPrevious ? "pointer-events-none opacity-50" : ""}
            >
              Previous
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link
              aria-disabled={!pagination.hasNext}
              href={
                pagination.hasNext
                  ? buildVendorRegistrationPageHref(filters, pagination.page + 1)
                  : buildVendorRegistrationPageHref(filters, pagination.page)
              }
              className={!pagination.hasNext ? "pointer-events-none opacity-50" : ""}
            >
              Next
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

function buildVendorRegistrationPageHref(
  filters: {
    search?: string;
    status?: string;
    countryCode?: string;
    categoryId?: string;
    notice?: string;
  },
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "notice") {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/admin/vendor-registrations?${query}` : "/admin/vendor-registrations";
}

function renderInvitationNotice(notice?: string) {
  if (notice === "supplier-invitation-sent") {
    return (
      <PageNotice
        title="Supplier invitation sent"
        body="The registration link was sent successfully and the invitation is now logged in the queue."
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
        body="The supplier invitation is logged, but the outbound email could not be delivered. Review the recent invitations panel for details."
      />
    );
  }

  return null;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{value}</p>
      </CardContent>
    </Card>
  );
}

function SelectField({
  name,
  defaultValue,
  label,
  options,
}: {
  name: string;
  defaultValue: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <Label className="sr-only" htmlFor={name}>
        {label}
      </Label>
      <Select id={name} name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
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

function InvitationStatusBadge({
  status,
}: {
  status:
    | "NOT_REQUESTED"
    | "SKIPPED"
    | "SENT"
    | "FAILED"
    | "PARTIAL";
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
