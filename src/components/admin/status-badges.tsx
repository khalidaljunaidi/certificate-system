import type {
  CertificateStatus,
  NotificationSeverity,
  OperationalTaskStatus,
  PaymentInstallmentStatus,
  PerformanceGrade,
  ProjectStatus,
  TaskSlaStatus,
  VendorStatus,
  VendorEvaluationCycleStatus,
  VendorEvaluationGrade,
} from "@prisma/client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { PaymentRecordStatusView } from "@/lib/types";

const STATUS_LABEL_OVERRIDES: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  PENDING_PM_APPROVAL: "PM Review",
  PM_APPROVED: "PM Approved",
  PM_REJECTED: "PM Rejected",
  PENDING_REVIEW: "Pending",
  READY_FOR_PROCUREMENT: "Ready",
  READY_FOR_INVOICE: "Ready",
  PO_AMOUNT_REQUIRED: "PO Required",
  AWAITING_INVOICE: "Awaiting",
  INVOICE_RECEIVED: "Invoice In",
  UNDER_FINANCE_REVIEW: "Review",
  PAYMENT_SCHEDULED: "Scheduled",
  PARTIALLY_PAID: "Part Paid",
  FULLY_PAID: "Paid",
  CLOSED: "Closed",
  ON_HOLD: "On Hold",
  DISPUTED: "Disputed",
  ACTION_REQUIRED: "Action",
};

function toTitleCaseLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function humanizeStatusLabel(value: string) {
  return STATUS_LABEL_OVERRIDES[value] ?? toTitleCaseLabel(value);
}

function getStatusTitle(value: string) {
  return toTitleCaseLabel(value);
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const variant =
    status === "ACTIVE"
      ? "green"
      : status === "COMPLETED"
        ? "purple"
        : status === "ON_HOLD" || status === "CANCELLED"
          ? "red"
          : "orange";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function CertificateStatusBadge({
  status,
}: {
  status: CertificateStatus;
}) {
  const variant =
    status === "ISSUED"
      ? "green"
      : status === "PM_APPROVED"
        ? "purple"
        : status === "REOPENED"
          ? "orange"
        : status === "REVOKED" || status === "PM_REJECTED"
          ? "red"
          : status === "PENDING_PM_APPROVAL"
            ? "orange"
            : "neutral";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function VendorEvaluationStatusBadge({
  status,
}: {
  status: VendorEvaluationCycleStatus;
}) {
  const variant =
    status === "COMPLETED"
      ? "green"
      : status === "READY_FOR_PROCUREMENT"
        ? "purple"
        : "orange";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function VendorEvaluationGradeBadge({
  grade,
}: {
  grade: VendorEvaluationGrade;
}) {
  const variant =
    grade === "A"
      ? "green"
      : grade === "B"
        ? "purple"
        : grade === "C"
          ? "orange"
          : "red";

  return <StatusBadge tone={variant} label={`Grade ${grade}`} title={`Grade ${grade}`} />;
}

export function VendorStatusBadge({
  status,
}: {
  status: VendorStatus;
}) {
  return (
    <StatusBadge
      tone={status === "ACTIVE" ? "green" : "neutral"}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function OperationalTaskStatusBadge({
  status,
}: {
  status: OperationalTaskStatus;
}) {
  const variant =
    status === "COMPLETED"
      ? "green"
      : status === "OVERDUE"
        ? "red"
        : status === "WAITING" || status === "BLOCKED"
          ? "orange"
          : status === "IN_PROGRESS"
            ? "purple"
            : "neutral";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function TaskSlaStatusBadge({
  status,
}: {
  status: TaskSlaStatus;
}) {
  const variant =
    status === "ON_TRACK"
      ? "green"
      : status === "AT_RISK"
        ? "orange"
        : "red";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function PerformanceGradeBadge({
  grade,
}: {
  grade: PerformanceGrade;
}) {
  const variant =
    grade === "A"
      ? "green"
      : grade === "B"
        ? "purple"
        : grade === "C"
          ? "orange"
          : "red";

  return <StatusBadge tone={variant} label={`Grade ${grade}`} title={`Grade ${grade}`} />;
}

export function NotificationSeverityBadge({
  severity,
}: {
  severity: NotificationSeverity;
}) {
  const variant =
    severity === "INFO"
      ? "purple"
      : severity === "ACTION_REQUIRED"
        ? "orange"
        : severity === "WARNING"
          ? "orange"
          : "red";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(severity)}
      title={getStatusTitle(severity)}
    />
  );
}

export function PaymentInstallmentStatusBadge({
  status,
}: {
  status: PaymentInstallmentStatus;
}) {
  const variant =
    status === "PAID"
      ? "green"
      : status === "CANCELLED"
        ? "neutral"
      : status === "OVERDUE"
        ? "red"
        : status === "SCHEDULED"
          ? "purple"
          : status === "UNDER_REVIEW"
            ? "orange"
            : status === "INVOICE_RECEIVED"
              ? "purple"
              : status === "INVOICE_REQUIRED"
                ? "orange"
                : status === "PLANNED"
                  ? "neutral"
                  : "orange";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}

export function PaymentRecordStatusBadge({
  status,
}: {
  status: PaymentRecordStatusView;
}) {
  const variant =
    status === "FULLY_PAID"
      ? "green"
      : status === "CLOSED"
        ? "neutral"
        : status === "DISPUTED"
          ? "red"
          : status === "ON_HOLD"
            ? "orange"
            : status === "PAYMENT_SCHEDULED" || status === "PARTIALLY_PAID"
              ? "purple"
              : status === "INVOICE_RECEIVED" || status === "UNDER_FINANCE_REVIEW"
                ? "orange"
                : status === "PO_AMOUNT_REQUIRED"
                  ? "red"
                  : "neutral";

  return (
    <StatusBadge
      tone={variant}
      label={humanizeStatusLabel(status)}
      title={getStatusTitle(status)}
    />
  );
}
