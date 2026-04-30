import type { OdooSyncStatus } from "@prisma/client";

import { OdooConnectionTestForm } from "@/components/forms/odoo-connection-test-form";
import { OdooSyncRetryForm } from "@/components/forms/odoo-sync-retry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";

type OdooSyncStatusCardProps = {
  status: OdooSyncStatus;
  partnerId: number | null;
  syncError: string | null;
  syncedAt: Date | null;
  targetType: "registration" | "vendor";
  targetId: string;
  vendorId: string | null;
  redirectTo: string;
  allowRetry?: boolean;
};

function getStatusTone(status: OdooSyncStatus): StatusBadgeTone {
  if (status === "SYNCED") {
    return "green";
  }

  if (status === "FAILED") {
    return "red";
  }

  return "orange";
}

function getStatusLabel(status: OdooSyncStatus) {
  if (status === "SYNCED") {
    return "Synced";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Pending";
}

export function OdooSyncStatusCard({
  status,
  partnerId,
  syncError,
  syncedAt,
  targetType,
  targetId,
  vendorId,
  redirectTo,
  allowRetry = true,
}: OdooSyncStatusCardProps) {
  const canRetry = allowRetry && status !== "SYNCED" && vendorId;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Odoo Vendor Sync</CardTitle>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            Creates or updates the supplier record in Odoo without blocking approval.
          </p>
        </div>
        <StatusBadge
          label={getStatusLabel(status)}
          tone={getStatusTone(status)}
          title={`Odoo sync status: ${status}`}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SyncField label="Odoo Partner ID" value={partnerId ? String(partnerId) : "-"} />
          <SyncField
            label="Last Synced"
            value={syncedAt ? formatDateTime(syncedAt) : "Not synced yet"}
          />
        </div>

        {status === "FAILED" && syncError ? (
          <div className="rounded-[18px] border border-[rgba(185,28,28,0.16)] bg-[rgba(185,28,28,0.06)] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#991b1b]">
              Sanitized Sync Error
            </p>
            <p className="mt-2 text-xs leading-5 text-[#7f1d1d]">{syncError}</p>
          </div>
        ) : null}

        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Connection Diagnostics
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            Tests Odoo authentication and read access to res.partner using the
            configured environment variables only.
          </p>
          <div className="mt-3">
            <OdooConnectionTestForm />
          </div>
        </div>

        {canRetry ? (
          <OdooSyncRetryForm
            targetType={targetType}
            targetId={targetId}
            vendorId={vendorId}
            redirectTo={redirectTo}
            label={status === "PENDING" ? "Sync Now" : "Retry Sync"}
          />
        ) : !vendorId ? (
          <p className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-xs leading-5 text-[var(--text-muted)]">
            Odoo sync becomes available after the supplier registration creates a
            vendor master record.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SyncField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}
