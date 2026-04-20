import Link from "next/link";
import { notFound } from "next/navigation";

import { PageNotice } from "@/components/admin/page-notice";
import { CreateCertificateForm } from "@/components/forms/certificate-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getProjectVendorOptions,
  getProjectWorkspace,
} from "@/server/queries/project-queries";

type NewCertificatePageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    projectVendorId?: string;
  }>;
};

export default async function NewCertificatePage({
  params,
  searchParams,
}: NewCertificatePageProps) {
  const { projectId } = await params;
  const { projectVendorId } = await searchParams;
  const [workspace, vendors] = await Promise.all([
    getProjectWorkspace(projectId),
    getProjectVendorOptions(projectId),
  ]);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {workspace.project.isArchived ? (
        <PageNotice
          tone="warning"
          title="Archived project"
          body={`This project was archived on ${new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
          }).format(workspace.project.archivedAt ?? new Date())}. Restore the project before creating new certificates.`}
        />
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            New Completion Certificate
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            {workspace.project.projectName}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            Create a vendor-linked completion certificate directly from the
            project workspace.
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            Saving from this page always creates a new certificate record, even
            when the same vendor already has other certificates on the project.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/admin/projects/${projectId}/certificates`}>
            Back to Certificates
          </Link>
        </Button>
      </section>

      {workspace.project.isArchived ? (
        <Card>
          <CardContent className="p-8 text-sm leading-7 text-[var(--color-muted)]">
            Archived projects stay available for historical review only. Restore
            the project before issuing new completion certificates.
          </CardContent>
        </Card>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm leading-7 text-[var(--color-muted)]">
            Add at least one vendor PO record to the project before issuing a
            completion certificate.
          </CardContent>
        </Card>
      ) : (
        <CreateCertificateForm
          projectId={projectId}
          vendors={vendors}
          preferredProjectVendorId={projectVendorId}
          submitLabel="Create Draft"
        />
      )}
    </div>
  );
}
