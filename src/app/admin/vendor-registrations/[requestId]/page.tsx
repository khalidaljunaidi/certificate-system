import Link from "next/link";
import { notFound } from "next/navigation";

import { PageNotice } from "@/components/admin/page-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { canManageVendorGovernance } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getVendorRegistrationRequestById } from "@/server/queries/vendor-registration-queries";
import { VendorRegistrationReviewForm } from "@/components/forms/vendor-registration-review-form";

type VendorRegistrationDetailPageProps = {
  params: Promise<{
    requestId: string;
  }>;
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function VendorRegistrationDetailPage({
  params,
  searchParams,
}: VendorRegistrationDetailPageProps) {
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

  const [{ requestId }, feedback] = await Promise.all([params, searchParams]);
  const request = await getVendorRegistrationRequestById(requestId);

  if (!request) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {feedback.notice === "vendor-registration-approved" ? (
        <PageNotice
          title="Supplier registration approved"
          body="The vendor has been created, the supplier ID has been assigned, and the approval certificate has been generated."
        />
      ) : null}
      {feedback.notice === "vendor-registration-rejected" ? (
        <PageNotice
          tone="warning"
          title="Supplier registration rejected"
          body="The request was rejected and the applicant was notified."
        />
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Vendor Registration
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            {request.companyName}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            {request.requestNumber} | {request.countryName} | {request.categoryName}
            {request.primarySubcategoryName ? ` | ${request.primarySubcategoryName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusBadge status={request.status} />
          <Button asChild variant="secondary">
            <Link href="/admin/vendor-registrations">Back to Queue</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/verify/vendor-registration/${request.requestNumber}`}>
              Public Verification
            </Link>
          </Button>
          {request.status === "APPROVED" ? (
            <Button asChild>
              <a href={`/api/vendor-registration/${request.requestNumber}/pdf`}>
                Download Certificate PDF
              </a>
            </Button>
          ) : null}
        </div>
      </section>

      {request.status === "PENDING_REVIEW" ? (
        <PageNotice
          tone="warning"
          title="Pending review"
          body="Review the request details, attachments, and references before approving or rejecting the submission."
        />
      ) : request.status === "APPROVED" ? (
        <PageNotice
          title="Approved"
          body={`Supplier ID ${request.supplierId ?? "-"} has been created and linked to the master vendor record.`}
        />
      ) : (
        <PageNotice
          tone="warning"
          title="Rejected"
          body={request.rejectionReason ?? "The supplier registration request was rejected."}
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Request Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Summary label="Company Email" value={request.companyEmail} />
            <Summary label="Company Phone" value={request.companyPhone} />
            <Summary label="Website" value={request.website ?? "-"} />
            <Summary label="CR Number" value={request.crNumber} />
            <Summary label="VAT Number" value={request.vatNumber} />
            <Summary label="Coverage Scope" value={request.coverageScope} />
            <Summary label="Submitted At" value={formatDateTime(request.submittedAt)} />
            <Summary
              label="Reviewed At"
              value={request.reviewedAt ? formatDateTime(request.reviewedAt) : "-"}
            />
            <Summary label="Supplier ID" value={request.supplierId ?? "-"} />
            <Summary
              label="Approved Vendor ID"
              value={request.approvedVendorId ?? "-"}
            />
            <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Address
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                {request.addressLine1}
                {request.addressLine2 ? `, ${request.addressLine2}` : ""}
                <br />
                {request.district}
                {request.region ? `, ${request.region}` : ""}
                <br />
                {request.countryName} | {request.postalCode}
                {request.poBox ? ` | P.O. Box ${request.poBox}` : ""}
              </p>
            </div>
            <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Business Summary
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                {request.businessDescription}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                {request.yearsInBusiness} years in business | {request.employeeCount} employees
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                {request.productsServicesSummary}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Decision</CardTitle>
            </CardHeader>
            <CardContent>
              <VendorRegistrationReviewForm
                requestId={request.id}
                pending={request.status === "PENDING_REVIEW"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.attachments.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--color-muted)]">
                  No attachments were submitted.
                </p>
              ) : (
                request.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {attachment.type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                      {attachment.fileName} | {Math.round(attachment.sizeBytes / 1024)} KB
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>References</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.references.map((reference) => (
                <div
                  key={reference.id}
                  className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {reference.name}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                    {reference.companyName}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[var(--color-muted)]">
                    {reference.email} {reference.phone ? `| ${reference.phone}` : ""}{" "}
                    {reference.title ? `| ${reference.title}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Subcategories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {request.selectedSubcategories.map((entry) => (
                <Badge key={entry.id} variant="purple">
                  {entry.name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Cities</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {request.selectedCities.map((entry) => (
                <Badge key={entry.id} variant="neutral">
                  {entry.name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}) {
  const variant =
    status === "APPROVED" ? "green" : status === "REJECTED" ? "red" : "orange";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}
