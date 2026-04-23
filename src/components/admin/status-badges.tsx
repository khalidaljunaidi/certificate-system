import type {
  CertificateStatus,
  NotificationSeverity,
  OperationalTaskStatus,
  PerformanceGrade,
  ProjectStatus,
  TaskSlaStatus,
  VendorStatus,
  VendorEvaluationCycleStatus,
  VendorEvaluationGrade,
} from "@prisma/client";

import { Badge } from "@/components/ui/badge";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const variant =
    status === "ACTIVE"
      ? "green"
      : status === "COMPLETED"
        ? "purple"
        : status === "ON_HOLD" || status === "CANCELLED"
          ? "red"
          : "orange";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
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

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
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

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
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

  return <Badge variant={variant}>Grade {grade}</Badge>;
}

export function VendorStatusBadge({
  status,
}: {
  status: VendorStatus;
}) {
  return <Badge variant={status === "ACTIVE" ? "green" : "neutral"}>{status}</Badge>;
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

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
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

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
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

  return <Badge variant={variant}>Grade {grade}</Badge>;
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

  return <Badge variant={variant}>{severity.replaceAll("_", " ")}</Badge>;
}
