import { PmApprovalForm } from "@/components/forms/pm-approval-form";
import { PublicDecisionState } from "@/components/public/public-decision-state";
import { PublicSummaryTile } from "@/components/public/public-summary-tile";
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
                <PublicSummaryTile label="Certificate Code" value={view.certificateCode} />
                <PublicSummaryTile label="Project" value={view.projectName} />
                <PublicSummaryTile label="Vendor" value={view.vendorName} />
                <PublicSummaryTile label="PO Number" value={view.poNumber} />
                <PublicSummaryTile
                  label="Contract Number"
                  value={view.contractNumber ?? "Not provided"}
                />
                <PublicSummaryTile
                  label="Completion Date"
                  value={formatDate(view.completionDate)}
                />
                <PublicSummaryTile
                  label="Total Amount"
                  value={formatSarAmount(view.totalAmount)}
                />
                <PublicSummaryTile
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
            <PublicDecisionState
              title="Certificate approved successfully"
              body="This approval link has already been completed. Procurement has been notified and the approval form is now locked."
            />
          ) : view.decisionStatus === "rejected" ? (
            <PublicDecisionState
              title="Certificate rejected and returned"
              body="This rejection has already been recorded. Procurement has been notified and the approval form is now locked."
            />
          ) : view.tokenStatus === "expired" ? (
            <PublicDecisionState
              title="Approval link expired"
              body="This approval request is no longer active. Please contact the Procurement team if a new approval link is required."
            />
          ) : view.tokenStatus === "used" || view.tokenStatus === "processed" ? (
            <PublicDecisionState
              title="Approval request already processed"
              body="This approval page is read-only because the certificate is no longer awaiting Project Manager action."
            />
          ) : (
            <PublicDecisionState
              title="Approval link invalid"
              body="This approval link could not be verified. Please contact the Procurement team if you need assistance."
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
