import Link from "next/link";

import { CompanyLogo } from "@/components/brand/company-logo";
import { ModuleFooter } from "@/components/layout/module-footer";
import { PageShell } from "@/components/layout/page-shell";
import { VendorRegistrationForm } from "@/components/forms/vendor-registration-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const submittedRequestNumber = submitted?.trim();
  const content = submittedRequestNumber ? (
    <SubmittedRegistrationPanel requestNumber={submittedRequestNumber} />
  ) : (
    <VendorRegistrationForm options={await getVendorRegistrationFormOptions()} />
  );

  return (
    <main className="theme-public min-h-screen bg-[var(--page-bg)] px-4 py-8 text-[var(--text-main)]">
      <PageShell className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="relative isolate overflow-hidden rounded-[34px] border border-[rgba(212,175,55,0.25)] bg-[linear-gradient(135deg,#12071f_0%,#1b0d2f_52%,#05030a_100%)] px-6 py-8 shadow-[0_28px_90px_rgba(27,13,47,0.22)] sm:px-9 sm:py-10 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_42%,rgba(212,175,55,0.24),transparent_30%),radial-gradient(circle_at_16%_12%,rgba(132,88,190,0.26),transparent_34%)]" />
          <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(229,201,138,0.78),transparent)]" />
          <div className="absolute -right-20 top-1/2 h-56 w-72 -translate-y-1/2 rounded-full bg-[rgba(212,175,55,0.16)] blur-3xl" />
          <div className="absolute bottom-0 left-8 h-px w-44 bg-[linear-gradient(90deg,rgba(212,175,55,0.7),transparent)]" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#E5C98A]">
                Supplier Registration
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Register with The Gathering KSA Procurement Operations Platform.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                Submit your company details and required documents for
                procurement review.
              </p>
            </div>

            <div className="relative flex min-h-32 items-center justify-center lg:justify-end">
              <div className="absolute h-24 w-full max-w-[520px] rounded-full bg-[#C8A45C]/20 blur-[46px]" />
              <div className="absolute h-px w-full max-w-[520px] bg-[linear-gradient(90deg,transparent,rgba(229,201,138,0.76),transparent)] blur-sm" />
              <CompanyLogo
                width={620}
                height={140}
                priority
                className="relative h-auto w-full max-w-[540px] object-contain drop-shadow-[0_24px_70px_rgba(229,201,138,0.22)]"
              />
            </div>
          </div>
        </section>

        {content}

        <ModuleFooter />
      </PageShell>
    </main>
  );
}

function SubmittedRegistrationPanel({ requestNumber }: { requestNumber: string }) {
  return (
    <Card className="overflow-hidden border-[rgba(21,128,61,0.2)] bg-[linear-gradient(135deg,rgba(240,253,244,0.96),rgba(255,255,255,0.98))] shadow-[0_24px_72px_rgba(22,101,52,0.08)]">
      <CardContent className="grid gap-8 p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-9">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-[#166534]">
            Submission Complete
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-main)]">
            Your registration is now closed and pending procurement review.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
            Thank you. The supplier registration form has been submitted
            successfully and cannot be edited from this page. Please keep the
            request number below for future reference.
          </p>

          <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-[22px] border border-[rgba(21,128,61,0.18)] bg-white px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.09em] text-[var(--text-muted)]">
              Request Number
            </span>
            <span className="text-sm font-semibold text-[var(--text-main)]">
              {requestNumber}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <Button asChild>
            <Link href={`/verify/vendor-registration/${requestNumber}`}>
              View Status
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
