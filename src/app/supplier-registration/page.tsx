import { CompanyLogo } from "@/components/brand/company-logo";
import { PageNotice } from "@/components/admin/page-notice";
import { ModuleFooter } from "@/components/layout/module-footer";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { VendorRegistrationForm } from "@/components/forms/vendor-registration-form";
import { getVendorRegistrationFormOptions } from "@/server/queries/vendor-registration-queries";

type SupplierRegistrationPageProps = {
  searchParams: Promise<{
    submitted?: string;
  }>;
};

export default async function SupplierRegistrationPage({
  searchParams,
}: SupplierRegistrationPageProps) {
  const { submitted } = await searchParams;
  const options = await getVendorRegistrationFormOptions();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(49,19,71,0.04),rgba(255,255,255,1)_28%)] px-4 py-8">
      <PageShell className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <PageHeader
          eyebrow="Supplier Registration"
          title="Register with The Gathering KSA Procurement Operations Platform."
          description="Submit a structured registration request with all required company, address, business, taxonomy, reference, banking, and supporting document details. No login is required and no internal platform data is exposed."
          variant="feature"
          metrics={
            <div className="flex items-center justify-center rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <CompanyLogo width={92} height={92} priority />
            </div>
          }
        />

        {submitted ? (
          <PageNotice
            title="Submission received"
            body={`Your supplier registration request ${submitted} has been submitted successfully and is now pending review.`}
          />
        ) : null}

        <VendorRegistrationForm options={options} />

        <ModuleFooter />
      </PageShell>
    </main>
  );
}
