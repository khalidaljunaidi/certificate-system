import Link from "next/link";
import { notFound } from "next/navigation";

import { CompanyLogo } from "@/components/brand/company-logo";
import { ModuleFooter } from "@/components/layout/module-footer";
import { PageNotice } from "@/components/admin/page-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getVendorRegistrationRequestByNumber } from "@/server/queries/vendor-registration-queries";

type VendorRegistrationVerificationPageProps = {
  params: Promise<{
    requestNumber: string;
  }>;
};

export default async function VendorRegistrationVerificationPage({
  params,
}: VendorRegistrationVerificationPageProps) {
  const { requestNumber } = await params;
  const request = await getVendorRegistrationRequestByNumber(requestNumber);

  if (!request) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(77,34,106,0.95)_58%,rgba(215,132,57,0.92))] text-white shadow-[0_24px_64px_rgba(49,19,71,0.18)]">
        <div className="px-8 py-8">
          <CompanyLogo width={84} height={84} priority />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c08b]">
            Public Verification
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            {request.status === "APPROVED"
              ? "Vendor registration certificate verified"
              : request.status === "REJECTED"
                ? "Vendor registration rejected"
                : "Vendor registration under review"}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#efe3f5]">
            Verify the vendor registration request using the official request
            number. The certificate proves registration approval only and does
            not constitute a contract or purchase order.
          </p>
        </div>
      </section>

      {request.status === "APPROVED" ? (
        <PageNotice
          title="Approved registration"
          body={`Supplier ID ${request.supplierId ?? "-"} was issued on ${formatDate(
            request.reviewedAt,
          )}.`}
        />
      ) : request.status === "REJECTED" ? (
        <PageNotice
          tone="warning"
          title="Rejected registration"
          body={request.rejectionReason ?? "This registration request was not approved."}
        />
      ) : (
        <PageNotice
          tone="warning"
          title="Pending review"
          body="This registration request is still under review."
        />
      )}

      <Card className="mt-6 overflow-hidden">
        <CardContent className="grid gap-4 p-8 md:grid-cols-2">
          <Summary label="Request Number" value={request.requestNumber} />
          <Summary label="Company Name" value={request.companyName} />
          <Summary label="Legal Name" value={request.legalName} />
          <Summary label="Supplier ID" value={request.supplierId ?? "-"} />
          <Summary label="CR Number" value={request.crNumber} />
          <Summary label="VAT Number" value={request.vatNumber} />
          <Summary label="Category" value={request.categoryName} />
          <Summary label="Primary Subcategory" value={request.primarySubcategoryName} />
          <Summary label="Country" value={request.countryName} />
          <Summary label="Status" value={request.status.replaceAll("_", " ")} />
          <Summary label="Submitted At" value={formatDate(request.submittedAt)} />
          <Summary
            label="Reviewed At"
            value={request.reviewedAt ? formatDate(request.reviewedAt) : "-"}
          />

          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            {request.status === "APPROVED" ? (
              <Button asChild>
                <a href={`/api/vendor-registration/${request.requestNumber}/pdf`}>
                  Download Certificate PDF
                </a>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/supplier-registration">Back to Registration</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModuleFooter className="py-8" />
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
