import { PmApprovalForm } from "@/components/forms/pm-approval-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatSarAmount } from "@/lib/utils";
import { getPmApprovalViewByToken } from "@/server/queries/public-queries";

type PmApprovalPageProps = {
  params: Promise<{
    secureToken: string;
  }>;
};

export default async function PmApprovalPage({ params }: PmApprovalPageProps) {
  const { secureToken } = await params;
  const view = await getPmApprovalViewByToken(secureToken);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Project Manager Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {view.tokenStatus === "valid" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Summary label="Certificate Code" value={view.certificateCode} />
                <Summary label="Project" value={view.projectName} />
                <Summary label="Vendor" value={view.vendorName} />
                <Summary label="PO Number" value={view.poNumber} />
                <Summary
                  label="Contract Number"
                  value={view.contractNumber ?? "Not provided"}
                />
                <Summary
                  label="Completion Date"
                  value={formatDate(view.completionDate)}
                />
                <Summary
                  label="Total Amount"
                  value={formatSarAmount(view.totalAmount)}
                />
                <Summary
                  label="PM Email"
                  value={view.pmEmail ?? "Not provided"}
                />
              </div>

              <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Executed Scope Summary
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                  {view.executedScopeSummary}
                </p>
              </div>

              <PmApprovalForm token={secureToken} />
            </>
          ) : view.decisionStatus === "approved" ? (
            <DecisionState
              title="Certificate approved successfully"
              body="This approval link has already been completed. Procurement has been notified and the approval form is now locked."
            />
          ) : view.decisionStatus === "rejected" ? (
            <DecisionState
              title="Certificate rejected and returned"
              body="This rejection has already been recorded. Procurement has been notified and the approval form is now locked."
            />
          ) : view.tokenStatus === "expired" ? (
            <DecisionState
              title="Approval link expired"
              body="This approval request is no longer active. Please contact the Procurement team if a new approval link is required."
            />
          ) : view.tokenStatus === "used" || view.tokenStatus === "processed" ? (
            <DecisionState
              title="Approval request already processed"
              body="This approval page is read-only because the certificate is no longer awaiting Project Manager action."
            />
          ) : (
            <DecisionState
              title="Approval link invalid"
              body="This approval link could not be verified. Please contact the Procurement team if you need assistance."
            />
          )}
        </CardContent>
      </Card>
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

function DecisionState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-6">
      <h2 className="text-2xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
