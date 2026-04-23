import { VENDOR_EVALUATION_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { getVendorEvaluationViewByToken } from "@/server/queries/vendor-queries";
import { VendorEvaluationPublicForm } from "@/components/forms/vendor-evaluation-public-form";
import { PublicDecisionState } from "@/components/public/public-decision-state";
import { PublicSummaryTile } from "@/components/public/public-summary-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VendorEvaluationPageProps = {
  params: Promise<{
    secureToken: string;
  }>;
};

export default async function VendorEvaluationPage({
  params,
}: VendorEvaluationPageProps) {
  const { secureToken } = await params;
  const view = await getVendorEvaluationViewByToken(secureToken);
  const reviewerLabel = view.evaluatorRole
    ? VENDOR_EVALUATION_ROLE_LABELS[view.evaluatorRole]
    : "Reviewer";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Vendor Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {view.tokenStatus === "valid" && view.evaluatorRole ? (
            <>
              <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  Annual Vendor Evaluation
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                  {view.vendorName}
                </h1>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {view.vendorCode}
                  {view.categoryName ? ` | ${view.categoryName}` : ""}
                  {view.subcategoryName ? ` | ${view.subcategoryName}` : ""}
                  {view.vendorStatus ? ` | ${view.vendorStatus}` : ""}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <PublicSummaryTile label="Vendor" value={view.vendorName} />
                <PublicSummaryTile label="Category" value={view.categoryName ?? "-"} />
                <PublicSummaryTile
                  label="Subcategory"
                  value={view.subcategoryName ?? "-"}
                />
                <PublicSummaryTile label="Evaluation Year" value={String(view.year)} />
                <PublicSummaryTile label="Reviewer Role" value={reviewerLabel} />
                <PublicSummaryTile
                  label="Evaluator Email"
                  value={view.evaluatorEmail ?? "Not provided"}
                />
                <PublicSummaryTile
                  label="Evaluation Date"
                  value={formatDate(new Date())}
                />
                <PublicSummaryTile
                  label="Evaluation Status"
                  value={view.cycleStatus?.replaceAll("_", " ") ?? "Requested"}
                />
                <PublicSummaryTile
                  label="Source Project"
                  value={`${view.sourceProjectCode} | ${view.sourceProjectName}`}
                />
              </div>

              <VendorEvaluationPublicForm
                token={secureToken}
                evaluatorRole={view.evaluatorRole}
              />
            </>
          ) : view.submission ? (
            <PublicDecisionState
              title="Evaluation submitted successfully"
              body={`This ${reviewerLabel.toLowerCase()} request was already completed by ${view.submission.evaluatorName} on ${formatDate(
                view.submission.submittedAt,
              )}${view.submission.totalScorePercent !== null ? ` with a final score of ${view.submission.totalScorePercent.toFixed(2)}%.` : "."} The page is now locked.`}
            />
          ) : view.tokenStatus === "expired" ? (
            <PublicDecisionState
              title="Evaluation link expired"
              body="This vendor evaluation request is no longer active. Please contact the Procurement team if a new evaluation link is required."
            />
          ) : view.tokenStatus === "used" || view.tokenStatus === "processed" ? (
            <PublicDecisionState
              title="Evaluation request already processed"
              body="This evaluation page is read-only because the request is no longer awaiting reviewer action."
            />
          ) : (
            <PublicDecisionState
              title="Evaluation link invalid"
              body="This evaluation link could not be verified. Please contact the Procurement team if you need assistance."
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
