import Link from "next/link";

import { ProjectStatusBadge } from "@/components/admin/status-badges";
import { ProjectForm } from "@/components/forms/project-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { getProjectList } from "@/server/queries/project-queries";

type ProjectsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    archive?: string;
  }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const filters = await searchParams;
  const projects = await getProjectList(filters);
  const archiveView = filters.archive === "archived" ? "archived" : "active";
  const buildArchiveHref = (nextArchive: "active" | "archived") => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (nextArchive === "archived") {
      params.set("archive", "archived");
    }

    return params.size > 0 ? `/admin/projects?${params.toString()}` : "/admin/projects";
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Projects"
        title="Project workspace directory"
        description="Browse project operations first, then move into vendor links and certificate workflows from the project context."
        actions={
          <>
            <Button
              asChild
              variant={archiveView === "active" ? "default" : "secondary"}
            >
              <Link href={buildArchiveHref("active")}>Active Projects</Link>
            </Button>
            <Button
              asChild
              variant={archiveView === "archived" ? "default" : "secondary"}
            >
              <Link href={buildArchiveHref("archived")}>Archived Projects</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {archiveView === "archived" ? "Archived Projects" : "Projects"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
              <input type="hidden" name="archive" value={archiveView} />
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Search by project code or name"
                className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">All statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <Button type="submit">Apply</Button>
            </form>

            <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]">
              <table className="w-full bg-white">
                <thead className="bg-[var(--color-panel-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Vendors</th>
                    <th className="px-4 py-3">Certificates</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-t border-[var(--color-border)] text-sm"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-[var(--color-ink)]">
                            {project.projectName}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {project.projectCode} - {project.projectLocation}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="px-4 py-4">{project.vendorCount}</td>
                      <td className="px-4 py-4">{project.certificateCount}</td>
                      <td className="px-4 py-4">{project.issuedCount}</td>
                      <td className="px-4 py-4 text-right">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/admin/projects/${project.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-[var(--color-muted)]"
                      >
                        {archiveView === "archived"
                          ? "No archived projects match the current filters."
                          : "No projects match the current filters."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <ProjectForm />
      </section>
    </PageShell>
  );
}
