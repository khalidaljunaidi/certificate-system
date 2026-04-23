import Link from "next/link";
import { notFound } from "next/navigation";
import type { CertificateStatus } from "@prisma/client";

import { ActivityFeed } from "@/components/admin/activity-feed";
import { PageNotice } from "@/components/admin/page-notice";
import {
  CertificateStatusBadge,
  ProjectStatusBadge,
} from "@/components/admin/status-badges";
import { ProjectStatusForm } from "@/components/forms/project-status-form";
import { ProjectVendorForm } from "@/components/forms/project-vendor-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { canManageProjectStatus } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { getProjectWorkspace } from "@/server/queries/project-queries";
import { getVendorPickerOptions } from "@/server/queries/vendor-queries";

type ProjectDetailPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const [session, workspace, vendorOptions] = await Promise.all([
    requireAdminSession(),
    getProjectWorkspace(projectId),
    getVendorPickerOptions(),
  ]);

  if (!workspace) {
    notFound();
  }

  const canUpdateProjectStatus = canManageProjectStatus(session.user.role);

  const uniqueVendorCount = new Set(
    workspace.vendors.map((vendor) => vendor.vendorId),
  ).size;
  const vendorGroups = workspace.vendors.reduce<
    Array<{
      vendorId: string;
      vendorName: string;
      vendorEmail: string;
      assignments: typeof workspace.vendors;
    }>
  >((groups, assignment) => {
    const existingGroup = groups.find(
      (group) => group.vendorId === assignment.vendorId,
    );

    if (existingGroup) {
      existingGroup.assignments.push(assignment);
      return groups;
    }

    groups.push({
      vendorId: assignment.vendorId,
      vendorName: assignment.vendorName,
      vendorEmail: assignment.vendorEmail,
      assignments: [assignment],
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
          )}. Historical records remain viewable, but new vendor and certificate updates should stay paused.`}
        />
      ) : null}

      <section className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 shadow-[0_20px_60px_rgba(17,17,17,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Project Workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
              {workspace.project.projectName}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              {workspace.project.projectCode} | {workspace.project.projectLocation} |{" "}
              {workspace.project.clientName}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ProjectStatusBadge status={workspace.project.status} />
            <Button
              asChild
              variant="secondary"
              className="border-[rgba(49,19,71,0.14)] px-6"
            >
              <Link href={`/admin/projects/${projectId}/certificates`}>
                Manage Certificates
              </Link>
            </Button>
            {!workspace.project.isArchived ? (
              <Button
                asChild
                className="px-6 shadow-[0_18px_36px_rgba(49,19,71,0.18)]"
              >
                <Link href={`/admin/projects/${projectId}/certificates/new`}>
                  Issue Certificate
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <InfoTile label="Start Date" value={formatDate(workspace.project.startDate)} />
          <InfoTile label="End Date" value={formatDate(workspace.project.endDate)} />
          <InfoTile label="Vendors" value={String(uniqueVendorCount)} />
          <InfoTile
            label="Certificates"
            value={String(workspace.certificates.length)}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Assignment Families</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm leading-7 text-[var(--color-muted)]">
              Vendors are grouped first, and each group contains the separate PO
              and contract assignments linked to this project.
            </p>
            {vendorGroups.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No vendor PO records linked to this project yet.
              </div>
            ) : (
              <div className="space-y-5">
                {vendorGroups.map((group) => (
                  <div
                    key={group.vendorId}
                    className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white"
                  >
                    <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-panel-soft)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-[var(--color-ink)]">
                          {group.vendorName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {group.vendorId} | {group.vendorEmail}
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                        {group.assignments.length} assignment
                        {group.assignments.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <table className="w-full">
                      <thead className="text-left text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        <tr>
                          <th className="px-4 py-3">PO Number</th>
                          <th className="px-4 py-3">Contract Number</th>
                          <th className="px-4 py-3">Certificate Count</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.assignments.map((assignment) => (
                          <tr
                            key={assignment.id}
                            className="border-t border-[var(--color-border)] text-sm"
                          >
                            <td className="px-4 py-4">
                              <p className="font-medium text-[var(--color-ink)]">
                                {assignment.poNumber ?? "Not provided"}
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                Assignment record
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-[var(--color-ink)]">
                                {assignment.contractNumber ?? "Not provided"}
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                Contract reference
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-[var(--color-ink)]">
                                {assignment.certificateCount}
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                Linked certificates
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              {assignment.latestCertificateStatus ? (
                                <CertificateStatusBadge
                                  status={assignment.latestCertificateStatus}
                                />
                              ) : (
                                <span className="inline-flex rounded-full bg-[rgba(49,19,71,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                                  Ready for certificate
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {renderAssignmentAction({
                                assignment,
                                projectId,
                                projectArchived: workspace.project.isArchived,
                              })}
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Status Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                Update the lifecycle state for this project without changing the
                rest of the project record. Status changes are recorded in the
                audit trail and refresh the main admin views.
              </p>
              {canUpdateProjectStatus ? (
                <ProjectStatusForm
                  projectId={projectId}
                  currentStatus={workspace.project.status}
                />
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                  Project status changes are limited to Procurement leadership
                  and administrators.
                </div>
              )}
            </CardContent>
          </Card>

          {workspace.project.isArchived ? (
            <Card>
              <CardHeader>
                <CardTitle>Vendor Changes Locked</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-[var(--color-muted)]">
                Archived projects remain available for safe historical access.
                Add or update vendor links only after the project is restored to
                the active workspace.
              </CardContent>
            </Card>
          ) : (
            <ProjectVendorForm projectId={projectId} vendorOptions={vendorOptions} />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Certificates</CardTitle>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/projects/${projectId}/certificates`}>View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.certificates.slice(0, 5).map((certificate) => (
              <Link
                key={certificate.id}
                href={`/admin/projects/${projectId}/certificates/${certificate.id}`}
                className="block rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition-colors hover:bg-[var(--color-panel-soft)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">
                      {certificate.certificateCode}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {certificate.vendorName}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                      PO {certificate.poNumber}
                      {certificate.contractNumber
                        ? ` | Contract ${certificate.contractNumber}`
                        : ""}
                      {` | Issue Date ${formatDate(certificate.issueDate)}`}
                    </p>
                  </div>
                  <CertificateStatusBadge status={certificate.status} />
                </div>
              </Link>
            ))}
            {workspace.certificates.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No certificates have been created from this project yet.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity / Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              items={workspace.activity.map((item) => ({
                id: item.id,
                action: item.action,
                entityType: item.entityType,
                actorName: item.actorName,
                createdAt: item.createdAt,
              }))}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function renderAssignmentAction({
  assignment,
  projectId,
  projectArchived,
}: {
  assignment: ProjectDetailVendorAssignment;
  projectId: string;
  projectArchived: boolean;
}) {
  if (projectArchived) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled>
        Project Archived
      </Button>
    );
  }

  const latestCertificateHref = assignment.latestCertificateId
    ? `/admin/projects/${projectId}/certificates/${assignment.latestCertificateId}`
    : null;

  switch (assignment.latestCertificateStatus) {
    case null:
      return (
        <Button asChild size="sm">
          <Link
            href={`/admin/projects/${projectId}/certificates/new?projectVendorId=${assignment.id}`}
          >
            Issue Certificate
          </Link>
        </Button>
      );
    case "DRAFT":
    case "PM_REJECTED":
      return latestCertificateHref ? (
        <Button asChild size="sm">
          <Link href={`${latestCertificateHref}?mode=edit`}>Continue Draft</Link>
        </Button>
      ) : null;
    case "PENDING_PM_APPROVAL":
      return (
        <Button type="button" variant="secondary" size="sm" disabled>
          Pending Approval
        </Button>
      );
    case "PM_APPROVED":
      return latestCertificateHref ? (
        <Button asChild size="sm">
          <Link href={latestCertificateHref}>Issue Certificate</Link>
        </Button>
      ) : null;
    case "ISSUED":
      return latestCertificateHref ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={latestCertificateHref}>View Certificate</Link>
        </Button>
      ) : null;
    case "REOPENED":
      return latestCertificateHref ? (
        <Button asChild size="sm">
          <Link href={`${latestCertificateHref}?mode=edit`}>Resume Revision</Link>
        </Button>
      ) : null;
    case "REVOKED":
      return latestCertificateHref ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={latestCertificateHref}>View Certificate</Link>
        </Button>
      ) : null;
    default:
      return latestCertificateHref ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={latestCertificateHref}>Open Record</Link>
        </Button>
      ) : (
        <Button asChild size="sm">
          <Link
            href={`/admin/projects/${projectId}/certificates/new?projectVendorId=${assignment.id}`}
          >
            Issue Certificate
          </Link>
        </Button>
      );
  }
}

type ProjectDetailVendorAssignment = {
  id: string;
  latestCertificateId: string | null;
  latestCertificateStatus: CertificateStatus | null;
};
