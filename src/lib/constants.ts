import type {
  CertificateStatus,
  NotificationEventKey,
  NotificationSeverity,
  NotificationType,
  MonthlyCycleStatus,
  OperationalTaskPriority,
  OperationalTaskStatus,
  OperationalTaskType,
  PerformanceGrade,
  PerformanceReviewStatus,
  ProjectStatus,
  TaskSlaStatus,
  UserRole,
  VendorStatus,
  VendorEvaluationEvaluatorRole,
  VendorEvaluationGrade,
  WorkflowEmailEvent,
} from "@prisma/client";

export const APP_NAME = "THE GATHERING KSA Procurement Operations Platform";
export const APP_SHORT_NAME = "Procurement Operations Platform";
export const DEFAULT_PM_TOKEN_TTL_DAYS = 7;
export const DEFAULT_VENDOR_EVALUATION_TOKEN_TTL_DAYS = 7;
export const CERTIFICATE_CODE_PREFIX = "TGCC";
export const PROCUREMENT_TEAM_EMAILS = [
  "khaledeljenidy@thegatheringksa.com",
  "abdulmajeed@thegatheringksa.com",
  "samia@thegatheringksa.com",
] as const;
export const PRIMARY_EVALUATOR_EMAIL = "khaledeljenidy@thegatheringksa.com";
export const PROCUREMENT_LEAD_EMAIL = "abdulmajeed@thegatheringksa.com";
export const PROCUREMENT_SPECIALIST_EMAIL = "samia@thegatheringksa.com";
export const HEAD_OF_PROJECTS_EMAIL = "mohamed@thegatheringksa.com";
export const EXECUTIVE_OVERSIGHT_NAME = "Khalid Al Junaidi";

export const NOTIFICATION_EMAIL_GROUP_DEFINITIONS = [
  {
    value: "EXECUTIVE_GROUP",
    label: "Executive Group",
    description: "Executive oversight recipients.",
  },
  {
    value: "PROJECTS_GROUP",
    label: "Projects Group",
    description: "Project-side governance recipients.",
  },
  {
    value: "PROCUREMENT_GROUP",
    label: "Procurement Group",
    description: "Procurement team recipients.",
  },
  {
    value: "BD_GROUP",
    label: "BD Group",
    description: "Business development recipients.",
  },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/vendor-registrations", label: "Vendor Registrations" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/performance", label: "Performance" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/system-errors", label: "System Errors" },
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
  VENDOR_EVALUATION_REQUESTED: {
    label: "Vendor Evaluation Requested",
  },
  VENDOR_EVALUATION_READY_FOR_PROCUREMENT: {
    label: "Vendor Evaluation Ready",
  },
  VENDOR_EVALUATION_COMPLETED: {
    label: "Vendor Evaluation Completed",
  },
  TASK_ASSIGNED: {
    label: "Task Assigned",
  },
  TASK_DUE_SOON: {
    label: "Task Due Soon",
  },
  TASK_OVERDUE: {
    label: "Task Overdue",
  },
  TASK_COMPLETED: {
    label: "Task Completed",
  },
  VENDOR_CREATED: {
    label: "Vendor Created",
  },
  SYSTEM_ALERT: {
    label: "System Alert",
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

export const GOVERNANCE_MANAGER_ROLES: UserRole[] = [
  "ADMIN",
  "PROCUREMENT_DIRECTOR",
  "PROCUREMENT_LEAD",
];

export const OPERATIONAL_TASK_TYPE_OPTIONS: Array<{
  value: OperationalTaskType;
  label: string;
}> = [
  { value: "VENDOR", label: "Vendor" },
  { value: "PROCUREMENT", label: "Procurement" },
  { value: "FINANCE", label: "Finance" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "CUSTOM", label: "Custom" },
];

export const OPERATIONAL_TASK_PRIORITY_OPTIONS: Array<{
  value: OperationalTaskPriority;
  label: string;
}> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const OPERATIONAL_TASK_STATUS_OPTIONS: Array<{
  value: OperationalTaskStatus;
  label: string;
}> = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Completed" },
  { value: "OVERDUE", label: "Overdue" },
];

export const TASK_SLA_STATUS_OPTIONS: Array<{
  value: TaskSlaStatus;
  label: string;
}> = [
  { value: "ON_TRACK", label: "On Track" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "OVERDUE", label: "Overdue" },
];

export const NOTIFICATION_SEVERITY_OPTIONS: Array<{
  value: NotificationSeverity;
  label: string;
}> = [
  { value: "INFO", label: "Info" },
  { value: "ACTION_REQUIRED", label: "Action Required" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
];

export const PERFORMANCE_REVIEW_STATUS_OPTIONS: Array<{
  value: PerformanceReviewStatus;
  label: string;
}> = [
  { value: "DRAFT", label: "Draft" },
  { value: "FINALIZED", label: "Finalized" },
];

export const PERFORMANCE_GRADE_OPTIONS: Array<{
  value: PerformanceGrade;
  label: string;
}> = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
];

export const QUARTER_LABELS = {
  1: "Q1",
  2: "Q2",
  3: "Q3",
  4: "Q4",
} as const;

export const VENDOR_EVALUATION_GRADE_OPTIONS: Array<{
  value: VendorEvaluationGrade;
  label: string;
}> = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
];

export const VENDOR_EVALUATION_ROLE_LABELS: Record<
  VendorEvaluationEvaluatorRole,
  string
> = {
  PROJECT_MANAGER: "Project Manager",
  HEAD_OF_PROJECTS: "Executive Oversight",
  PROCUREMENT: "Procurement",
};

export const VENDOR_STATUS_OPTIONS: Array<{
  value: VendorStatus;
  label: string;
}> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const WORKFLOW_EMAIL_EVENT_OPTIONS: Array<{
  value: WorkflowEmailEvent;
  label: string;
  description: string;
}> = [
  {
    value: "PM_APPROVAL_REQUEST",
    label: "PM Approval Request",
    description:
      "Controls who receives the initial approval request email before certificate issuance.",
  },
  {
    value: "PM_DECISION_NOTIFICATION",
    label: "PM Decision Notification",
    description:
      "Controls who is notified after the Project Manager approves or rejects a certificate.",
  },
  {
    value: "VENDOR_EVALUATION_REQUEST",
    label: "Vendor Evaluation Request",
    description:
      "Controls routing for the project manager and executive oversight evaluation request emails.",
  },
  {
    value: "FINAL_CERTIFICATE_ISSUED",
    label: "Final Certificate Issued",
    description:
      "Controls routing for final certificate delivery and copied stakeholders.",
  },
  {
    value: "CERTIFICATE_REOPENED",
    label: "Certificate Reopened",
    description:
      "Controls who receives certificate reopening and revision workflow updates.",
  },
  {
    value: "ANNUAL_EVALUATION_REMINDER",
    label: "Annual Evaluation Reminder",
    description:
      "Controls reminder routing for annual vendor evaluation follow-up messages.",
  },
  {
    value: "TASK_ASSIGNED",
    label: "Task Assigned",
    description:
      "Controls routing for operational task assignment notices and optional email copies.",
  },
  {
    value: "TASK_DUE_SOON",
    label: "Task Due Soon",
    description:
      "Controls routing for due-soon reminders before operational task SLA risk windows.",
  },
  {
    value: "TASK_OVERDUE",
    label: "Task Overdue",
    description:
      "Controls routing for overdue task escalation and critical operational follow-up notices.",
  },
  {
    value: "TASK_COMPLETED",
    label: "Task Completed",
    description:
      "Controls routing for completion confirmations on operational task close-out.",
  },
  {
    value: "SYSTEM_ALERT",
    label: "System Alert",
    description:
      "Controls routing for central alerting, escalations, and cross-workflow operational issues.",
  },
  {
    value: "PERFORMANCE_REVIEW_FINALIZED",
    label: "Performance Review Finalized",
    description:
      "Controls routing for finalized quarterly performance review notifications and summaries.",
  },
];

export const MONTHLY_CYCLE_STATUS_OPTIONS: Array<{
  value: MonthlyCycleStatus;
  label: string;
}> = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "ARCHIVED", label: "Archived" },
];

export const NOTIFICATION_EVENT_DEFAULTS: Record<
  NotificationEventKey,
  {
    type: NotificationType;
    severity: NotificationSeverity;
  }
> = {
  CERT_CREATED: {
    type: "CERTIFICATE_CREATED",
    severity: "INFO",
  },
  CERT_SUBMITTED_PM: {
    type: "SENT_FOR_PM_APPROVAL",
    severity: "ACTION_REQUIRED",
  },
  CERT_PM_APPROVED: {
    type: "PM_APPROVED",
    severity: "INFO",
  },
  CERT_PM_REJECTED: {
    type: "PM_REJECTED",
    severity: "WARNING",
  },
  CERT_ISSUED: {
    type: "CERTIFICATE_ISSUED",
    severity: "INFO",
  },
  CERT_REOPENED: {
    type: "CERTIFICATE_REOPENED",
    severity: "WARNING",
  },
  CERT_REVOKED: {
    type: "CERTIFICATE_REVOKED",
    severity: "CRITICAL",
  },
  TASK_ASSIGNED: {
    type: "TASK_ASSIGNED",
    severity: "ACTION_REQUIRED",
  },
  TASK_DUE_SOON: {
    type: "TASK_DUE_SOON",
    severity: "WARNING",
  },
  TASK_OVERDUE: {
    type: "TASK_OVERDUE",
    severity: "CRITICAL",
  },
  TASK_COMPLETED: {
    type: "TASK_COMPLETED",
    severity: "INFO",
  },
  VENDOR_CREATED: {
    type: "VENDOR_CREATED",
    severity: "INFO",
  },
  SYSTEM_ALERT: {
    type: "SYSTEM_ALERT",
    severity: "CRITICAL",
  },
  PERFORMANCE_REVIEW_FINALIZED: {
    type: "SYSTEM_ALERT",
    severity: "ACTION_REQUIRED",
  },
};
