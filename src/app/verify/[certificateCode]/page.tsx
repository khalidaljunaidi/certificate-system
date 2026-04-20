import { CompanyLogo } from "@/components/brand/company-logo";
import { ModuleFooter } from "@/components/layout/module-footer";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getVerificationView } from "@/server/queries/public-queries";

type VerifyPageProps = {
  params: Promise<{
    certificateCode: string;
  }>;
};

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { certificateCode } = await params;
  const certificate = await getVerificationView(certificateCode);

  const verificationState = !certificate
    ? "not_found"
    : certificate.status === "ISSUED"
      ? "valid"
      : certificate.status === "REVOKED"
        ? "revoked"
        : "invalid";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">
      <div className="flex flex-1 items-center">
        <Card className="w-full overflow-hidden">
          <div className="bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(77,34,106,0.95)_58%,rgba(215,132,57,0.92))] px-8 py-8 text-white">
            <CompanyLogo width={74} height={74} priority />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c08b]">
              Public Verification
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              {verificationState === "valid"
                ? "Certificate Valid"
                : verificationState === "revoked"
                  ? "Certificate Revoked"
                  : verificationState === "invalid"
                    ? "Certificate Not Issued"
                    : "Certificate Not Found"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#efe3f5]">
              Verification is based on live certificate data stored in the project-based
              completion certificate system.
            </p>
          </div>
          <CardContent className="grid gap-4 p-8 md:grid-cols-2">
            <Summary label="Certificate Code" value={certificateCode} />
            <Summary
              label="Status"
              value={
                verificationState === "valid"
                  ? "Valid"
                  : verificationState === "revoked"
                    ? "Revoked"
                    : verificationState === "invalid"
                      ? "Invalid"
                      : "Not Found"
              }
            />
            <Summary
              label="Project Name"
              value={certificate?.project.projectName ?? "-"}
            />
            <Summary
              label="Project Code"
              value={certificate?.project.projectCode ?? "-"}
            />
            <Summary
              label="Vendor Name"
              value={certificate?.vendor.vendorName ?? "-"}
            />
            <Summary label="PO Number" value={certificate?.poNumber ?? "-"} />
            <Summary
              label="Contract Number"
              value={certificate?.contractNumber ?? "-"}
            />
            <Summary
              label="Issue Date"
              value={certificate ? formatDate(certificate.issueDate) : "-"}
            />
            <Summary
              label="Completion Date"
              value={certificate ? formatDate(certificate.completionDate) : "-"}
            />
            {certificate?.status === "REVOKED" && certificate.revokedReason ? (
              <div className="md:col-span-2 rounded-[24px] border border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.06)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#991b1b]">
                  Revocation Notice
                </p>
                <p className="mt-3 text-sm leading-7 text-[#991b1b]">
                  {certificate.revokedReason}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <ModuleFooter className="pt-8" />
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
