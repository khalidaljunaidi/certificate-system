import type {
  CertificateStatus,
  NotificationType,
  ProjectStatus,
  UserRole,
} from "@prisma/client";

export const APP_NAME = "The Gathering KSA Certificates";
export const DEFAULT_PM_TOKEN_TTL_DAYS = 7;
export const CERTIFICATE_CODE_PREFIX = "TGCC";
export const PROCUREMENT_TEAM_EMAILS = [
  "khaledeljenidy@thegatheringksa.com",
  "abdulmajeed@thegatheringksa.com",
  "samia@thegatheringksa.com",
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/profile", label: "Profile" },
] as const;

export const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectStatus;
  label: string;
}> = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const CERTIFICATE_STATUS_OPTIONS: Array<{
  value: CertificateStatus;
  label: string;
}> = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_PM_APPROVAL", label: "Pending PM Approval" },
  { value: "PM_APPROVED", label: "PM Approved" },
  { value: "REOPENED", label: "Reopened" },
  { value: "PM_REJECTED", label: "PM Rejected" },
  { value: "ISSUED", label: "Issued" },
  { value: "REVOKED", label: "Revoked" },
];

export const NOTIFICATION_LABELS: Record<NotificationType, { label: string }> = {
  CERTIFICATE_CREATED: {
    label: "Certificate Created",
  },
  CERTIFICATE_UPDATED: {
    label: "Certificate Updated",
  },
  SENT_FOR_PM_APPROVAL: {
    label: "Sent for PM Approval",
  },
  PM_APPROVED: {
    label: "PM Approved",
  },
  PM_REJECTED: {
    label: "PM Rejected",
  },
  CERTIFICATE_ISSUED: {
    label: "Certificate Issued",
  },
  CERTIFICATE_REOPENED: {
    label: "Certificate Reopened",
  },
  CERTIFICATE_REVOKED: {
    label: "Certificate Revoked",
  },
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  PROCUREMENT: "Procurement",
  PROCUREMENT_LEAD: "Procurement Lead",
  PROCUREMENT_SPECIALIST: "Procurement Specialist",
  PROCUREMENT_DIRECTOR: "Procurement Director",
  ADMIN: "Administrator",
};

export const PROCUREMENT_TEAM_ROLES: UserRole[] = [
  "PROCUREMENT",
  "PROCUREMENT_LEAD",
  "PROCUREMENT_SPECIALIST",
  "PROCUREMENT_DIRECTOR",
  "ADMIN",
];
