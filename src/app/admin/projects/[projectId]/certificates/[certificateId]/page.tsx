import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveCertificateAction,
  duplicateCertificateAction,
  issueCertificateAction,
  reopenCertificateAction,
  submitForPmApprovalAction,
  unarchiveCertificateAction,
} from "@/actions/certificate-actions";
import { PageNotice } from "@/components/admin/page-notice";
import { CertificateStatusBadge } from "@/components/admin/status-badges";
import { EditCertificateForm } from "@/components/forms/certificate-form";
import { RevokeCertificateForm } from "@/components/forms/revoke-certificate-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatSarAmount } from "@/lib/utils";
import { getCertificateById } from "@/server/queries/certificate-queries";
import { getProjectVendorOptions } from "@/server/queries/project-queries";

type CertificateDetailPageProps = {
  params: Promise<{
    projectId: string;
    certificateId: string;
  }>;
  searchParams: Promise<{
    notice?: string;
    error?: string;
    mode?: string;
  }>;
};

export default async function CertificateDetailPage({
  params,
  searchParams,
}: CertificateDetailPageProps) {
  const { projectId, certificateId } = await params;
  const feedback = await searchParams;
  const [certificate, vendors] = await Promise.all([
    getCertificateById(certificateId),
    getProjectVendorOptions(projectId),
  ]);

  if (!certificate || certificate.projectId !== projectId) {
    notFound();
  }

  const canEditCertificate =
    certificate.status === "DRAFT" ||
    certificate.status === "PM_REJECTED" ||
    certificate.status === "REOPENED";
  const showEditButton = canEditCertificate && !certificate.isArchived;
  const isEditing = showEditButton && feedback.mode === "edit";
  const summaryHref = `/admin/projects/${projectId}/certificates/${certificate.id}`;
  const editHref = `${summaryHref}?mode=edit`;

  return (
    <div className="space-y-8">
      {feedback.error ? (
        <PageNotice
          tone="error"
          title="Workflow action failed"
          body={feedback.error}
        />
      ) : null}

      {feedback.notice === "certificate-archived" ? (
        <PageNotice
          tone="warning"
          title="Certificate archived"
          body="The certificate was archived successfully and is now hidden from active certificate listings."
        />
      ) : null}

      {feedback.notice === "certificate-unarchived" ? (
        <PageNotice
          title="Certificate restored"
          body="The certificate was restored successfully and is visible in active certificate listings again."
        />
      ) : null}

      {feedback.notice === "certificate-duplicated" ? (
        <PageNotice
          title="Draft duplicated"
          body="A new draft was created from the selected certificate."
        />
      ) : null}

      {certificate.isArchived ? (
        <PageNotice
          tone="warning"
          title="Archived record"
          body={`This certificate was archived on ${formatDate(
            certificate.archivedAt,
          )}. Archived records remain available for historical reference but stay hidden from active lists.`}
        />
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Certificate Detail
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            {certificate.certificateCode}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            {certificate.projectName} | {certificate.vendorName}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CertificateStatusBadge status={certificate.status} />
          <Button asChild variant="secondary">
            <Link href={`/admin/projects/${projectId}/certificates`}>
              Back to Certificates
            </Link>
          </Button>
          {showEditButton ? (
            <Button asChild variant={isEditing ? "secondary" : "default"}>
              <Link href={isEditing ? summaryHref : editHref}>
                {isEditing ? "View Certificate Summary" : "Edit Certificate"}
              </Link>
            </Button>
          ) : null}
          {certificate.status === "ISSUED" && certificate.pdfUrl ? (
            <Button asChild variant="secondary">
              <a href={certificate.pdfUrl}>Download PDF</a>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {canEditCertificate && isEditing ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Edit Mode
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                {certificate.status === "REOPENED"
                  ? "Update the reopened certificate, then save to restart the PM approval workflow."
                  : "Update this certificate draft and save the revised details."}
              </p>
            </div>
            <EditCertificateForm
              projectId={projectId}
              certificateId={certificate.id}
              vendors={vendors}
              defaults={{
                projectVendorId: certificate.projectVendorId,
                vendorId: certificate.vendorId,
                issueDate: certificate.issueDate.toISOString().slice(0, 10),
                poNumber: certificate.poNumber,
                contractNumber: certificate.contractNumber ?? "",
                completionDate: certificate.completionDate.toISOString().slice(0, 10),
                totalAmount: certificate.totalAmount,
                executedScopeSummary: certificate.executedScopeSummary,
                clientName: certificate.clientName,
                clientTitle: certificate.clientTitle,
                approverName: certificate.approverName,
                approverTitle: certificate.approverTitle,
                pmEmail: certificate.pmEmail ?? "",
              }}
              submitLabel={
                certificate.status === "REOPENED"
                  ? "Save Revision & Send to PM Approval"
                  : "Save Certificate"
              }
              formMode={certificate.status === "REOPENED" ? "revision" : "edit"}
            />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Certificate Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <SummaryItem label="Project" value={certificate.projectName} />
              <SummaryItem label="Vendor" value={certificate.vendorName} />
              <SummaryItem label="Issue Date" value={formatDate(certificate.issueDate)} />
              <SummaryItem
                label="Completion Date"
                value={formatDate(certificate.completionDate)}
              />
              <SummaryItem label="PO Number" value={certificate.poNumber} />
              <SummaryItem
                label="Contract Number"
                value={certificate.contractNumber ?? "Not provided"}
              />
              <SummaryItem
                label="Total Amount"
                value={formatSarAmount(certificate.totalAmount)}
              />
              <SummaryItem
                label="PM Email"
                value={certificate.pmEmail ?? "Not provided"}
              />
              <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Executed Scope Summary
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                  {certificate.executedScopeSummary}
                </p>
              </div>
              <SummaryItem label="Client Name" value={certificate.clientName} />
              <SummaryItem label="Client Title" value={certificate.clientTitle} />
              <SummaryItem label="Approver Name" value={certificate.approverName} />
              <SummaryItem label="Approver Title" value={certificate.approverTitle} />
              <SummaryItem
                label="PM Name"
                value={certificate.pmName ?? "Not provided"}
              />
              <SummaryItem
                label="PM Title"
                value={certificate.pmTitle ?? "Not provided"}
              />
              <SummaryItem
                label="PM Approved At"
                value={formatDate(certificate.pmApprovedAt)}
              />
              <SummaryItem label="Issued At" value={formatDate(certificate.issuedAt)} />
              <SummaryItem
                label="Archived At"
                value={formatDate(certificate.archivedAt)}
              />
              {certificate.approvalNotes ? (
                <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Approval Notes
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                    {certificate.approvalNotes}
                  </p>
                </div>
              ) : null}
              {certificate.revokedReason ? (
                <div className="md:col-span-2 rounded-[24px] border border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.06)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#991b1b]">
                    Revocation Reason
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#991b1b]">
                    {certificate.revokedReason}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {certificate.isArchived ? (
                <form action={unarchiveCertificateAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="certificateId" value={certificate.id} />
                  <Button type="submit">Restore Certificate</Button>
                </form>
              ) : (
                <>
                  {certificate.status === "ISSUED" ? (
                    <form action={reopenCertificateAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="certificateId"
                        value={certificate.id}
                      />
                      <Button type="submit">Reopen Certificate</Button>
                    </form>
                  ) : null}

                  <form action={duplicateCertificateAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="certificateId"
                      value={certificate.id}
                    />
                    <Button type="submit" variant="secondary">
                      Duplicate into New Draft
                    </Button>
                  </form>

                  {["DRAFT", "PM_REJECTED", "PENDING_PM_APPROVAL"].includes(
                    certificate.status,
                  ) ? (
                    <form action={submitForPmApprovalAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="certificateId"
                        value={certificate.id}
                      />
                      <Button type="submit">
                        {certificate.status === "PENDING_PM_APPROVAL"
                          ? "Resend PM Approval"
                          : "Send to PM for Approval"}
                      </Button>
                    </form>
                  ) : null}

                  {certificate.status === "PM_APPROVED" ? (
                    <form action={issueCertificateAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input
                        type="hidden"
                        name="certificateId"
                        value={certificate.id}
                      />
                      <Button type="submit">Final Approval &amp; Issue</Button>
                    </form>
                  ) : null}

                  <form action={archiveCertificateAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="certificateId"
                      value={certificate.id}
                    />
                    <Button type="submit" variant="secondary">
                      Archive Certificate
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          {certificate.status === "ISSUED" && !certificate.isArchived ? (
            <Card>
              <CardHeader>
                <CardTitle>Revoke Certificate</CardTitle>
              </CardHeader>
              <CardContent>
                <RevokeCertificateForm
                  certificateId={certificate.id}
                  projectId={projectId}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
