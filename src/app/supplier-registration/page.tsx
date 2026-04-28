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
    <main className="theme-public min-h-screen bg-[var(--page-bg)] px-4 py-8 text-[var(--text-main)]">
      <PageShell className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <PageHeader
          eyebrow="Supplier Registration"
          title="Register with The Gathering KSA Procurement Operations Platform."
          description="Submit a structured registration request with all required company, address, business, taxonomy, reference, banking, and supporting document details. No login is required and no internal platform data is exposed."
          metrics={
            <div className="flex items-center justify-center rounded-[26px] border border-[rgba(200,164,92,0.36)] bg-[var(--tg-primary)] p-5 shadow-[0_18px_42px_rgba(27,16,51,0.16)]">
              <CompanyLogo
                width={96}
                height={96}
                priority
                className="h-20 w-20 object-contain"
              />
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
