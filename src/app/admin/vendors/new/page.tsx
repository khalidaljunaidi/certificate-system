import { VendorMasterForm } from "@/components/forms/vendor-master-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVendorGovernanceOptions } from "@/server/queries/vendor-queries";

type VendorCreatePageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

export default async function VendorCreatePage({
  searchParams,
}: VendorCreatePageProps) {
  const params = await searchParams;
  const options = await getVendorGovernanceOptions();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Vendors
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
          Create vendor master record
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          Add the vendor once to the master registry, then reuse that record
          safely across project assignments, certificates, evaluations, and
          governance reporting.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Master Details</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorMasterForm options={options} redirectTo={params.redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
