import Form from "next/form";
import Link from "next/link";

import {
  VendorEvaluationGradeBadge,
  VendorStatusBadge,
} from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  VENDOR_EVALUATION_GRADE_OPTIONS,
  VENDOR_STATUS_OPTIONS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  getVendorGovernanceOptions,
  getVendorRegistry,
} from "@/server/queries/vendor-queries";

type VendorsPageProps = {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    finalGrade?: string;
    evaluationYear?: string;
    status?: string;
    activeProject?: string;
  }>;
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const filters = await searchParams;
  const [vendors, options] = await Promise.all([
    getVendorRegistry(filters),
    getVendorGovernanceOptions(),
  ]);
  const exportParams = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
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
  const activeVendors = vendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const evaluatedVendors = vendors.filter((vendor) => vendor.latestEvaluationYear).length;
  const issuedCertificates = vendors.reduce(
    (sum, vendor) => sum + vendor.issuedCertificateCount,
    0,
  );

  return (
    <div className="space-y-8">
      <section className="tg-reveal overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(70,34,102,0.96)_62%,rgba(215,132,57,0.92))] px-8 py-8 text-white">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c08b]">
              Vendors
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Vendor registry, governance, and evaluation workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#efe3f5]">
              Use the master registry as the single source of truth for vendor
              identity, category governance, project footprint, certificate
              history, and evaluation performance.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <HeroMetric label="Registry Size" value={String(vendors.length)} hint="Vendor master records" />
            <HeroMetric label="Active Vendors" value={String(activeVendors)} hint="Currently active in governance" />
            <HeroMetric label="Issued Certificates" value={String(issuedCertificates)} hint="Across all vendor-linked assignments" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-3">
            <CardTitle>Registry Filters</CardTitle>
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Filter the registry by governance classification, evaluation
              performance, and live project activity.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Form action="" className="space-y-3">
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
                      {category.name}
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
                      {subcategory.categoryName} | {subcategory.name}
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
                <Button type="submit">Apply</Button>
                <Button asChild variant="secondary">
                  <Link href="/admin/vendors">Reset</Link>
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        <div className="grid gap-3 xl:w-[240px]">
          <Button asChild>
            <Link href="/admin/vendors/new">Create Vendor</Link>
          </Button>
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Evaluated Vendors"
          value={String(evaluatedVendors)}
          hint="Vendor records with at least one annual evaluation cycle"
        />
        <MetricCard
          label="Open Governance"
          value={String(vendors.filter((vendor) => !vendor.latestEvaluationYear || !vendor.latestFinalGrade).length)}
          hint="Vendors still awaiting a finalized evaluation outcome"
        />
        <MetricCard
          label="Active Project Footprint"
          value={String(vendors.reduce((sum, vendor) => sum + vendor.activeProjectCount, 0))}
          hint="Total active project relationships across the registry"
        />
      </section>

      <section className="space-y-4">
        {vendors.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No vendors match the current filters.
            </CardContent>
          </Card>
        ) : (
          vendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
            >
              <CardContent className="p-0">
                <div className="grid gap-0 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_auto]">
                  <div className="min-w-0 border-b border-[var(--color-border)] p-6 xl:border-b-0 xl:border-r">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-3">
                          <Link
                            href={`/admin/vendors/${vendor.id}`}
                            className="truncate text-xl font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                          >
                            {vendor.vendorName}
                          </Link>
                          <VendorStatusBadge status={vendor.status} />
                        </div>
                        <p className="mt-2 break-words text-sm leading-7 text-[var(--color-muted)]">
                          {vendor.vendorId} | {vendor.vendorEmail}
                          {vendor.vendorPhone ? ` | ${vendor.vendorPhone}` : ""}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                            {vendor.categoryName ?? "Unassigned category"}
                          </span>
                          <span className="rounded-full bg-[rgba(215,132,57,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                            {vendor.subcategoryName ?? "No subcategory"}
                          </span>
                          {vendor.classification ? (
                            <span className="rounded-full bg-[rgba(17,17,17,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
                              {vendor.classification}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-4 border-b border-[var(--color-border)] p-6 xl:grid-cols-3 xl:border-b-0 xl:border-r">
                    <VendorInfoStack
                      title="Project Footprint"
                      lines={[
                        `${vendor.projectCount} projects`,
                        `${vendor.assignmentCount} assignment records`,
                        `${vendor.activeProjectCount} active projects`,
                      ]}
                    />
                    <VendorInfoStack
                      title="Certificate Output"
                      lines={[
                        `${vendor.certificateCount} certificates`,
                        `${vendor.issuedCertificateCount} issued`,
                        `Latest issued ${formatDate(vendor.latestIssuedAt)}`,
                      ]}
                    />
                    <VendorInfoStack
                      title="Evaluation"
                      lines={[
                        vendor.latestEvaluationYear
                          ? `Cycle ${vendor.latestEvaluationYear}`
                          : "No evaluation yet",
                        vendor.latestFinalScorePercent !== null
                          ? `Score ${vendor.latestFinalScorePercent.toFixed(2)}%`
                          : vendor.latestEvaluationStatus?.replaceAll("_", " ") ??
                            "Awaiting request",
                        vendor.notes ? "Governance notes available" : "No notes yet",
                      ]}
                      badge={
                        vendor.latestFinalGrade ? (
                          <VendorEvaluationGradeBadge grade={vendor.latestFinalGrade} />
                        ) : null
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-3 p-6 xl:w-[250px]">
                    <Button asChild>
                      <Link href={`/admin/vendors/${vendor.id}`}>Open Vendor</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/admin/vendors/${vendor.id}#profile-editor`}>
                        Edit Profile
                      </Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/admin/vendors/${vendor.id}#evaluation-history`}>
                        Evaluation History
                      </Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/admin/vendors/${vendor.id}#evaluation-request`}>
                        Request Evaluation
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
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
      <p className="mt-3 break-words text-3xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[#efe3f5]">{hint}</p>
    </div>
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-3 break-words text-3xl font-semibold text-[var(--color-ink)]">
            {value}
          </p>
        </div>
        <p className="break-words text-sm leading-7 text-[var(--color-muted)]">{hint}</p>
      </CardContent>
    </Card>
  );
}

function VendorInfoStack({
  title,
  lines,
  badge,
}: {
  title: string;
  lines: string[];
  badge?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          {title}
        </p>
        {badge}
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={line} className="break-words text-sm leading-6 text-[var(--color-ink)]">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
