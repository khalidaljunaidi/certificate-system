import Link from "next/link";
import { notFound } from "next/navigation";

import { PageNotice } from "@/components/admin/page-notice";
import { CertificateStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  getProjectVendorOptions,
  getProjectWorkspace,
} from "@/server/queries/project-queries";

type ProjectCertificatesPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    projectVendorId?: string;
    status?: string;
    archive?: string;
  }>;
};

export default async function ProjectCertificatesPage({
  params,
  searchParams,
}: ProjectCertificatesPageProps) {
  const { projectId } = await params;
  const filters = await searchParams;
  const [workspace, vendors] = await Promise.all([
    getProjectWorkspace(projectId, filters),
    getProjectVendorOptions(projectId),
  ]);
  const archiveView = filters.archive === "archived" ? "archived" : "active";

  const buildArchiveHref = (nextArchive: "active" | "archived") => {
    const params = new URLSearchParams();

    if (filters.projectVendorId) {
      params.set("projectVendorId", filters.projectVendorId);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (nextArchive === "archived") {
      params.set("archive", "archived");
    }

    const search = params.toString();
    return search
      ? `/admin/projects/${projectId}/certificates?${search}`
      : `/admin/projects/${projectId}/certificates`;
  };

  if (!workspace) {
    notFound();
  }

  const certificateGroups = workspace.certificates.reduce<
    Array<{
      vendorName: string;
      certificates: typeof workspace.certificates;
    }>
  >((groups, certificate) => {
    const existingGroup = groups.find(
      (group) => group.vendorName === certificate.vendorName,
    );

    if (existingGroup) {
      existingGroup.certificates.push(certificate);
      return groups;
    }

    groups.push({
      vendorName: certificate.vendorName,
      certificates: [certificate],
    });

    return groups;
  }, []);

  return (
    <div className="space-y-8">
      {workspace.project.isArchived ? (
        <PageNotice
          tone="warning"
          title="Archived project"
          body={`This project was archived on ${formatDate(
            workspace.project.archivedAt,
          )}. The certificate history remains available, but new certificate creation is hidden until the project is restored.`}
        />
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Project Certificates
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            {workspace.project.projectName}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            Review certificates by vendor group while keeping each PO and contract
            assignment as its own independent certificate record.
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            The same vendor can appear multiple times in this project. Each row
            below stays tied to its own PO reference, contract reference, status,
            and issue date.
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
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href={`/admin/projects/${projectId}`}>Back to Project</Link>
          </Button>
          {!workspace.project.isArchived ? (
            <Button asChild>
              <Link href={`/admin/projects/${projectId}/certificates/new`}>
                New Certificate
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {archiveView === "archived" ? "Archived Certificates" : "Certificates"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-[1fr_220px_220px_auto]">
            <input type="hidden" name="archive" value={archiveView} />
            <select
              name="projectVendorId"
              defaultValue={filters.projectVendorId ?? ""}
              className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">All vendor PO assignments</option>
              {vendors.map((vendorLink) => (
                <option key={vendorLink.id} value={vendorLink.id}>
                  {vendorLink.vendor.vendorName} - PO {vendorLink.poNumber ?? "No PO"}
                  {vendorLink.contractNumber
                    ? ` - Contract ${vendorLink.contractNumber}`
                    : ""}
                </option>
              ))}
            </select>
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
            <div />
            <Button type="submit">Apply</Button>
          </form>

          {workspace.certificates.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--color-border)] px-5 py-8 text-center text-sm text-[var(--color-muted)]">
              {archiveView === "archived"
                ? "No archived certificates match the current filters."
                : "No certificates match the current filters."}
            </div>
          ) : (
            <div className="space-y-5">
              {certificateGroups.map((group) => (
                <div
                  key={group.vendorName}
                  className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white"
                >
                  <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-panel-soft)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-ink)]">
                        {group.vendorName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {group.certificates.length} certificate record
                        {group.certificates.length === 1 ? "" : "s"} across separate
                        PO and contract assignments.
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                      Vendor Group
                    </div>
                  </div>
                  <table className="w-full">
                    <thead className="text-left text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      <tr>
                        <th className="px-4 py-3">Certificate</th>
                        <th className="px-4 py-3">PO</th>
                        <th className="px-4 py-3">Contract</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.certificates.map((certificate) => (
                        <tr
                          key={certificate.id}
                          className="border-t border-[var(--color-border)] text-sm"
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[var(--color-ink)]">
                              {certificate.certificateCode}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              Independent certificate record
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[var(--color-ink)]">
                              {certificate.poNumber}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              PO reference
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[var(--color-ink)]">
                              {certificate.contractNumber ?? "Not provided"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              Contract reference
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[var(--color-ink)]">
                              {formatDate(certificate.issueDate)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              Issue date
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <CertificateStatusBadge status={certificate.status} />
                              <p className="text-xs text-[var(--color-muted)]">
                                Current status
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button asChild variant="secondary" size="sm">
                              <Link
                                href={`/admin/projects/${projectId}/certificates/${certificate.id}`}
                              >
                                Open
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
