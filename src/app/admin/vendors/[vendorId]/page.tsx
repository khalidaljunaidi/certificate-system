import Link from "next/link";
import { notFound } from "next/navigation";
import type { CertificateStatus } from "@prisma/client";

import { PageNotice } from "@/components/admin/page-notice";
import {
  CertificateStatusBadge,
  ProjectStatusBadge,
  VendorEvaluationGradeBadge,
  VendorEvaluationStatusBadge,
} from "@/components/admin/status-badges";
import { VendorCategoryForm } from "@/components/forms/vendor-category-form";
import { VendorEvaluationCycleForm } from "@/components/forms/vendor-evaluation-cycle-form";
import { VendorEvaluationFinalizeForm } from "@/components/forms/vendor-evaluation-finalize-form";
import { VendorEvaluationForceFinalizeForm } from "@/components/forms/vendor-evaluation-force-finalize-form";
import { VendorMasterForm } from "@/components/forms/vendor-master-form";
import { VendorSubcategoryForm } from "@/components/forms/vendor-subcategory-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import {
  EXECUTIVE_OVERSIGHT_NAME,
  VENDOR_EVALUATION_ROLE_LABELS,
} from "@/lib/constants";
import {
  canFinalizeVendorEvaluation,
  canManageVendorGovernance,
  canRequestVendorEvaluation,
  isPrimaryEvaluator,
} from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import {
  getVendorGovernanceOptions,
  getVendorRegistryView,
} from "@/server/queries/vendor-queries";

type VendorDetailPageProps = {
  params: Promise<{
    vendorId: string;
  }>;
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function VendorDetailPage({
  params,
  searchParams,
}: VendorDetailPageProps) {
  const { vendorId } = await params;
  const feedback = await searchParams;
  const session = await requireAdminSession();
  const [vendorView, governanceOptions] = await Promise.all([
    getVendorRegistryView(vendorId),
    getVendorGovernanceOptions(),
  ]);

  if (!vendorView) {
    notFound();
  }

  const canManageVendor = canManageVendorGovernance(session.user);
  const canRequestEvaluation = canRequestVendorEvaluation(session.user);
  const canFinalizeEvaluation = canFinalizeVendorEvaluation(session.user);
  const isKhaled = isPrimaryEvaluator(session.user.email);
  const assignmentCount = vendorView.assignmentGroups.reduce(
    (total, group) => total + group.assignments.length,
    0,
  );
  const latestCycle = vendorView.evaluationCycles[0] ?? null;
  const completedEvaluationCycles = vendorView.evaluationCycles.filter(
    (cycle) =>
      cycle.status === "COMPLETED" &&
      cycle.finalScorePercent !== null &&
      cycle.finalScorePercent !== undefined,
  );
  const averageEvaluationScore =
    completedEvaluationCycles.length > 0
      ? completedEvaluationCycles.reduce(
          (total, cycle) => total + Number(cycle.finalScorePercent ?? 0),
          0,
        ) / completedEvaluationCycles.length
      : null;
  const latestCompletedCycle = completedEvaluationCycles[0] ?? null;
  const previousCompletedCycle = completedEvaluationCycles[1] ?? null;
  const trendDelta =
    latestCompletedCycle && previousCompletedCycle
      ? Number(latestCompletedCycle.finalScorePercent ?? 0) -
        Number(previousCompletedCycle.finalScorePercent ?? 0)
      : null;
  const pendingEvaluationCount = vendorView.evaluationCycles.filter(
    (cycle) => cycle.status !== "COMPLETED",
  ).length;
  const defaultYear = new Date().getFullYear();

  return (
    <div className="space-y-8">
      {isKhaled && feedback.notice === "vendor-evaluation-force-finalized" ? (
        <PageNotice
          tone="warning"
          title="Evaluation force-finalized"
          body="Khaled force-finalized the vendor evaluation successfully and the cycle is now closed."
        />
      ) : null}

      <section className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 shadow-[0_20px_60px_rgba(17,17,17,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Vendor Master Workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
              {vendorView.vendor.vendorName}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              {vendorView.vendor.vendorId} | {vendorView.vendor.vendorEmail}
              {vendorView.vendor.vendorPhone
                ? ` | ${vendorView.vendor.vendorPhone}`
                : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex rounded-full bg-[rgba(49,19,71,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                {vendorView.vendor.status}
              </span>
              <span className="inline-flex rounded-full bg-[rgba(49,19,71,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                {vendorView.vendor.categoryName ?? "Unassigned Category"}
              </span>
              <span className="inline-flex rounded-full bg-[rgba(215,132,57,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                {vendorView.vendor.subcategoryName ?? "Unassigned Subcategory"}
              </span>
              {vendorView.vendor.classification ? (
                <span className="inline-flex rounded-full bg-[rgba(17,17,17,0.06)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
                  {vendorView.vendor.classification}
                </span>
              ) : null}
              {latestCycle?.finalGrade ? (
                <VendorEvaluationGradeBadge grade={latestCycle.finalGrade} />
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="#profile-editor">Edit Profile</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#evaluation-workspace">Evaluation Workspace</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#evaluation-history">Evaluation History</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#evaluation-request">Request Evaluation</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/vendors">Back to Vendors</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <InfoTile
            label="Projects"
            value={String(vendorView.assignmentGroups.length)}
          />
          <InfoTile label="Assignments" value={String(assignmentCount)} />
          <InfoTile
            label="Certificates"
            value={String(vendorView.certificateHistory.length)}
          />
          <InfoTile
            label="Latest Score"
            value={
              latestCycle?.finalScorePercent !== null &&
              latestCycle?.finalScorePercent !== undefined
                ? `${latestCycle.finalScorePercent.toFixed(2)}%`
                : "Not scored"
            }
          />
          <InfoTile
            label="Latest Evaluation"
            value={
              latestCycle?.finalGrade
                ? `Grade ${latestCycle.finalGrade}`
                : latestCycle
                  ? latestCycle.status.replaceAll("_", " ")
                  : "Not started"
            }
          />
        </div>
      </section>

      <section
        id="vendor-analytics"
        className="grid scroll-mt-28 gap-6 xl:grid-cols-[1fr_1fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Vendor Analytics Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Keep the vendor master record, assignment footprint, certificate
              output, and evaluation performance visible in one place.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <InfoTile
                label="Latest Evaluation Status"
                value={
                  latestCycle?.finalGrade
                    ? `Grade ${latestCycle.finalGrade}`
                    : latestCycle?.status.replaceAll("_", " ") ?? "Not started"
                }
              />
              <InfoTile
                label="Latest Evaluation Year"
                value={latestCycle ? String(latestCycle.year) : "Not started"}
              />
              <InfoTile
                label="Latest Issued Certificate"
                value={formatDate(vendorView.certificateHistory[0]?.issuedAt ?? null)}
              />
            </div>
          </CardContent>
        </Card>

        <Card id="evaluation-workspace" className="scroll-mt-28">
          <CardHeader>
            <CardTitle>Vendor Evaluation Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Review the annual vendor scorecard, monitor evaluation progress,
              and jump directly to the latest result or full history without
              leaving the vendor workspace.
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile
                label="Latest Score"
                value={
                  latestCycle?.finalScorePercent !== null &&
                  latestCycle?.finalScorePercent !== undefined
                    ? `${latestCycle.finalScorePercent.toFixed(2)}%`
                    : "Not scored"
                }
              />
              <InfoTile
                label="Average Score"
                value={
                  averageEvaluationScore !== null
                    ? `${averageEvaluationScore.toFixed(2)}%`
                    : "Not scored"
                }
              />
              <InfoTile
                label="Latest Grade"
                value={
                  latestCycle?.finalGrade
                    ? `Grade ${latestCycle.finalGrade}`
                    : latestCycle
                      ? latestCycle.status.replaceAll("_", " ")
                      : "Not started"
                }
              />
              <InfoTile
                label="Trend"
                value={
                  trendDelta !== null
                    ? `${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(2)} pts`
                    : "No prior cycle"
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoTile
                label="Completed Cycles"
                value={String(
                  vendorView.evaluationCycles.filter(
                    (cycle) => cycle.status === "COMPLETED",
                  ).length,
                )}
              />
              <InfoTile
                label="Pending Cycles"
                value={String(pendingEvaluationCount)}
              />
              <InfoTile
                label="Latest Cycle"
                value={
                  latestCycle
                    ? `${latestCycle.year} | ${latestCycle.status.replaceAll("_", " ")}`
                    : "Not started"
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="#evaluation-request">Request Evaluation</Link>
              </Button>
              {latestCycle ? (
                <Button asChild variant="secondary">
                  <Link href={`#evaluation-cycle-${latestCycle.id}`}>
                    {latestCycle.status === "COMPLETED"
                      ? "View Latest Result"
                      : "Open Latest Cycle"}
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link href="#evaluation-history">Open Evaluation History</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card id="profile-editor" className="scroll-mt-28">
          <CardHeader>
            <CardTitle>Vendor Master Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Manage the full vendor master profile here, including status,
              category, subcategory, commercial identifiers, and governance
              notes, then reuse the same master record safely across projects,
              assignments, certificates, and evaluations.
            </p>
            {canManageVendor ? (
              <>
                <VendorMasterForm
                  vendor={{
                    id: vendorView.vendor.id,
                    vendorName: vendorView.vendor.vendorName,
                    vendorEmail: vendorView.vendor.vendorEmail,
                    vendorId: vendorView.vendor.vendorId,
                    vendorPhone: vendorView.vendor.vendorPhone,
                    status: vendorView.vendor.status,
                    classification: vendorView.vendor.classification,
                    notes: vendorView.vendor.notes,
                    categoryId: vendorView.vendor.categoryId,
                    subcategoryId: vendorView.vendor.subcategoryId,
                  }}
                  options={governanceOptions}
                />
                <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">
                      Category & Subcategory Setup
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                      Create category and subcategory options here first, then
                      assign them to this vendor using the profile form above.
                    </p>
                  </div>
                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <div className="min-w-0 rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Create Category
                      </p>
                      <div className="mt-4">
                        <VendorCategoryForm vendorId={vendorView.vendor.id} />
                      </div>
                    </div>
                    <div className="min-w-0 rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Create Subcategory
                      </p>
                      <div className="mt-4">
                        <VendorSubcategoryForm
                          vendorId={vendorView.vendor.id}
                          options={governanceOptions}
                          defaultCategoryId={vendorView.vendor.categoryId}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                Vendor master editing is limited to Procurement leadership and
                administrators.
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="evaluation-request" className="scroll-mt-28">
          <CardHeader>
            <CardTitle>Annual Evaluation Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Start a yearly vendor evaluation from one of the projects already
              linked to this vendor. The system keeps the annual cycle on the
              vendor master record while the source project remains visible for
              context.
            </p>
            {vendorView.availableSourceProjects.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                This vendor needs at least one active project assignment before an
                annual evaluation can be requested.
              </div>
            ) : canRequestEvaluation ? (
              <VendorEvaluationCycleForm
                vendorId={vendorView.vendor.id}
                availableSourceProjects={vendorView.availableSourceProjects}
                defaultYear={defaultYear}
              />
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-5 text-sm leading-7 text-[var(--color-muted)]">
                Evaluation requests are limited to Procurement leadership and
                administrators.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {vendorView.vendor.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Governance Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--color-muted)]">
            {vendorView.vendor.notes}
          </CardContent>
        </Card>
      ) : null}

      <Card id="vendor-assignments" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Project Assignment Families</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-7 text-[var(--color-muted)]">
            The vendor master record stays at the top level, while each project
            assignment remains independent underneath with its own PO / contract
            and certificate history.
          </p>
          {vendorView.assignmentGroups.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
              No project assignments are linked to this vendor yet.
            </div>
          ) : (
            <div className="space-y-5">
              {vendorView.assignmentGroups.map((group) => (
                <div
                  key={group.projectId}
                  className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white"
                >
                  <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-panel-soft)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-ink)]">
                        {group.projectName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {group.projectCode}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <ProjectStatusBadge status={group.projectStatus} />
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/projects/${group.projectId}`}>
                          Open Project
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[720px] w-full">
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
                            <td className="px-4 py-4">{assignment.poNumber ?? "Not provided"}</td>
                            <td className="px-4 py-4">
                              {assignment.contractNumber ?? "Not provided"}
                            </td>
                            <td className="px-4 py-4">{assignment.certificateCount}</td>
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
                                projectId: group.projectId,
                                projectArchived: group.isArchived,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Certificate History</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorView.certificateHistory.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No certificates are linked to this vendor yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-[var(--color-border)]">
                <table className="min-w-[760px] w-full bg-white">
                  <thead className="bg-[var(--color-panel-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    <tr>
                      <th className="px-4 py-3">Certificate</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Assignment</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {vendorView.certificateHistory.map((certificate) => (
                      <tr
                        key={certificate.id}
                        className="border-t border-[var(--color-border)] text-sm"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[var(--color-ink)]">
                            {certificate.certificateCode}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[var(--color-ink)]">
                            {certificate.projectName}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {certificate.projectCode}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p>PO {certificate.poNumber}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {certificate.contractNumber
                              ? `Contract ${certificate.contractNumber}`
                              : "No contract"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <CertificateStatusBadge status={certificate.status} />
                        </td>
                        <td className="px-4 py-4">{formatDate(certificate.issueDate)}</td>
                        <td className="px-4 py-4 text-right">
                          <Button asChild variant="secondary" size="sm">
                            <Link
                              href={`/admin/projects/${certificate.projectId}/certificates/${certificate.id}`}
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
            )}
          </CardContent>
        </Card>

        <Card id="evaluation-history" className="scroll-mt-28">
          <CardHeader>
            <CardTitle>Annual Evaluation History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendorView.evaluationCycles.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
                No annual evaluations have been created for this vendor yet.
              </div>
            ) : (
              vendorView.evaluationCycles.map((cycle) => {
                const readyForProcurement =
                  cycle.submissions.some(
                    (submission) => submission.evaluatorRole === "PROJECT_MANAGER",
                  ) &&
                  cycle.submissions.some(
                    (submission) =>
                      submission.evaluatorRole === "HEAD_OF_PROJECTS",
                  );

                return (
                  <div
                    key={cycle.id}
                    id={`evaluation-cycle-${cycle.id}`}
                    className="scroll-mt-28 rounded-[24px] border border-[var(--color-border)] bg-white p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-[var(--color-ink)]">
                          Evaluation {cycle.year}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {cycle.sourceProjectCode} | {cycle.sourceProjectName}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <VendorEvaluationStatusBadge status={cycle.status} />
                        {cycle.finalGrade ? (
                          <VendorEvaluationGradeBadge grade={cycle.finalGrade} />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <InfoTile
                        label="PM Email"
                        value={cycle.projectManagerEmail}
                        valueClassName="break-all text-sm leading-7"
                      />
                      <InfoTile
                        label="Executive Oversight"
                        value={EXECUTIVE_OVERSIGHT_NAME}
                        valueClassName="text-sm leading-7"
                      />
                      <InfoTile
                        label="Final Score"
                        value={
                          cycle.finalScorePercent !== null &&
                          cycle.finalScorePercent !== undefined
                            ? `${cycle.finalScorePercent.toFixed(2)}%`
                            : "Pending"
                        }
                      />
                    </div>

                    <div className="mt-5 space-y-4">
                      {cycle.submissions.length === 0 ? (
                        <div className="rounded-[20px] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
                          External submissions have not started yet.
                        </div>
                      ) : (
                        cycle.submissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--color-ink)]">
                                  {VENDOR_EVALUATION_ROLE_LABELS[
                                    submission.evaluatorRole
                                  ]}
                                </p>
                                <p className="mt-1 break-all text-xs text-[var(--color-muted)]">
                                  {submission.evaluatorName} | {submission.evaluatorEmail}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                <VendorEvaluationGradeBadge grade={submission.grade} />
                                <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                                  {submission.totalScorePercent !== null &&
                                  submission.totalScorePercent !== undefined
                                    ? `${submission.totalScorePercent.toFixed(2)}%`
                                    : "Not scored"}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-4">
                              <EvaluationTextBlock
                                label="Summary"
                                value={submission.summary}
                              />
                              <EvaluationTextBlock
                                label="Recommendation"
                                value={submission.recommendation ?? "-"}
                              />
                              <EvaluationTextBlock
                                label="Strengths"
                                value={submission.strengths}
                              />
                              <EvaluationTextBlock
                                label="Weaknesses"
                                value={submission.concerns}
                              />
                              <EvaluationTextBlock
                                label="Corrective Actions"
                                value={submission.correctiveActions ?? "-"}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {cycle.status !== "COMPLETED" ? (
                      <div className="mt-5 rounded-[20px] border border-dashed border-[var(--color-border)] p-4">
                        {isKhaled ? (
                          <VendorEvaluationForceFinalizeForm
                            vendorId={vendorView.vendor.id}
                            cycleId={cycle.id}
                          />
                        ) : readyForProcurement && canFinalizeEvaluation ? (
                          <VendorEvaluationFinalizeForm
                            vendorId={vendorView.vendor.id}
                            cycleId={cycle.id}
                          />
                        ) : readyForProcurement ? (
                          <p className="text-sm leading-7 text-[var(--color-muted)]">
                            This evaluation is ready for Procurement finalization.
                            Only Procurement leadership and administrators can
                            finalize it.
                          </p>
                        ) : (
                          <p className="text-sm leading-7 text-[var(--color-muted)]">
                            Waiting for both the Project Manager and Head of
                            Projects submissions before Procurement can finalize
                            the annual score and grade.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InfoTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-base font-semibold leading-7 text-[var(--color-ink)] ${valueClassName ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function EvaluationTextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function renderAssignmentAction({
  assignment,
  projectId,
  projectArchived,
}: {
  assignment: VendorAssignmentAction;
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
      ) : null;
  }
}

type VendorAssignmentAction = {
  id: string;
  latestCertificateId: string | null;
  latestCertificateStatus: CertificateStatus | null;
};
