import Link from "next/link";

import { CertificateStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  getCertificateFilterOptions,
  getGlobalCertificates,
} from "@/server/queries/certificate-queries";

type CertificatesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    projectId?: string;
    vendorId?: string;
    archive?: string;
  }>;
};

export default async function CertificatesPage({
  searchParams,
}: CertificatesPageProps) {
  const filters = await searchParams;
  const [certificates, options] = await Promise.all([
    getGlobalCertificates(filters),
    getCertificateFilterOptions(),
  ]);
  const archiveView = filters.archive === "archived" ? "archived" : "active";
  const buildArchiveHref = (nextArchive: "active" | "archived") => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (filters.projectId) {
      params.set("projectId", filters.projectId);
    }

    if (filters.vendorId) {
      params.set("vendorId", filters.vendorId);
    }

    if (nextArchive === "archived") {
      params.set("archive", "archived");
    }

    return params.size > 0
      ? `/admin/certificates?${params.toString()}`
      : "/admin/certificates";
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Certificates
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
          Cross-project certificate search
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          Track every certificate across projects, vendors, statuses, and PO references.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant={archiveView === "active" ? "default" : "secondary"}>
            <Link href={buildArchiveHref("active")}>Active Certificates</Link>
          </Button>
          <Button
            asChild
            variant={archiveView === "archived" ? "default" : "secondary"}
          >
            <Link href={buildArchiveHref("archived")}>Archived Certificates</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {archiveView === "archived" ? "Archived Certificates" : "Certificates"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-4 xl:grid-cols-[1fr_220px_220px_220px_auto]">
            <input type="hidden" name="archive" value={archiveView} />
            <input
              name="search"
              defaultValue={filters.search}
              placeholder="Search certificate, project, vendor, PO"
              className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
            />
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_PM_APPROVAL">Pending PM Approval</option>
              <option value="PM_APPROVED">PM Approved</option>
              <option value="REOPENED">Reopened</option>
              <option value="PM_REJECTED">PM Rejected</option>
              <option value="ISSUED">Issued</option>
              <option value="REVOKED">Revoked</option>
            </select>
            <select
              name="projectId"
              defaultValue={filters.projectId ?? ""}
              className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All projects</option>
              {options.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.projectName}
                </option>
              ))}
            </select>
            <select
              name="vendorId"
              defaultValue={filters.vendorId ?? ""}
              className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All vendors</option>
              {options.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendorName}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>

          <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]">
            <table className="w-full bg-white">
              <thead className="bg-[var(--color-panel-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3">Certificate</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {certificates.map((certificate) => (
                  <tr key={certificate.id} className="border-t border-[var(--color-border)] text-sm">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {certificate.certificateCode}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        PO {certificate.poNumber}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {certificate.project.projectName}
                    </td>
                    <td className="px-4 py-4">{certificate.vendor.vendorName}</td>
                    <td className="px-4 py-4">{formatDate(certificate.issueDate)}</td>
                    <td className="px-4 py-4">
                      <CertificateStatusBadge status={certificate.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button asChild variant="secondary" size="sm">
                        <Link
                          href={`/admin/projects/${certificate.project.id}/certificates/${certificate.id}`}
                        >
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {certificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-[var(--color-muted)]"
                    >
                      {archiveView === "archived"
                        ? "No archived certificates match the current filters."
                        : "No certificates match the current filters."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
