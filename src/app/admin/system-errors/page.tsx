import { PageNotice } from "@/components/admin/page-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { requireAdminSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { getSystemErrorLogs } from "@/server/services/system-error-service";

export default async function SystemErrorsPage() {
  const session = await requireAdminSession();

  if (!canManageRoles(session.user)) {
    return (
      <PageNotice
        tone="error"
        title="Access denied"
        body="You do not have permission to view system error logs."
      />
    );
  }

  const logs = await getSystemErrorLogs(100);

  return (
    <PageShell>
      <PageHeader
        eyebrow="System Errors"
        title="Operational error log."
        description="Inspect internal application errors, actions, and severity levels from a single governed screen."
        variant="feature"
      />

      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-[var(--color-muted)]">
              No system errors have been logged yet.
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="min-w-0 truncate text-lg">{log.action}</CardTitle>
                <Badge variant={severityVariant(log.severity)}>{log.severity}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Meta label="User" value={log.userName ?? "-"} />
                  <Meta label="Timestamp" value={formatDateTime(log.createdAt)} />
                  <Meta label="Error" value={log.errorName ?? "-"} />
                  <Meta label="Action" value={log.action} />
                </div>

                <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Message
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-ink)]">
                    {log.errorMessage}
                  </p>
                </div>

                {log.context ? (
                  <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Context
                    </p>
                    <pre className="mt-3 overflow-auto text-xs leading-6 text-[var(--color-muted)]">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  </div>
                ) : null}

                {log.stackTrace ? (
                  <details className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
                      Stack trace
                    </summary>
                    <pre className="mt-3 overflow-auto text-xs leading-6 text-[var(--color-muted)]">
                      {log.stackTrace}
                    </pre>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function severityVariant(severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL") {
  if (severity === "CRITICAL") {
    return "red";
  }

  if (severity === "ERROR") {
    return "orange";
  }

  if (severity === "WARNING") {
    return "purple";
  }

  return "neutral";
}
