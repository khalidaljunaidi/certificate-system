import type { CertificateStatus, ProjectStatus } from "@prisma/client";

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
