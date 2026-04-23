import type { NotificationEventKey, WorkflowEmailEvent } from "@prisma/client";

export type WorkflowRoutingStrategy =
  | "project_manager"
  | "assigned_user"
  | "evaluated_employee"
  | "procurement_chain"
  | "entity_owner"
  | "default_fallback"
  | "manual_override";

export type WorkflowRoutingPolicy = {
  primaryTo: WorkflowRoutingStrategy[];
  primaryCc: WorkflowRoutingStrategy[];
  fallbackTo: WorkflowRoutingStrategy[];
  fallbackCc: WorkflowRoutingStrategy[];
  summary: string;
};

export const WORKFLOW_ROUTING_STRATEGY_LABELS: Record<
  WorkflowRoutingStrategy,
  string
> = {
  project_manager: "Project manager",
  assigned_user: "Assigned user",
  evaluated_employee: "Evaluated employee",
  procurement_chain: "Procurement chain",
  entity_owner: "Entity owner",
  default_fallback: "Fallback recipients",
  manual_override: "Manual override",
};

export const WORKFLOW_EMAIL_ROUTING_POLICIES: Record<
  WorkflowEmailEvent,
  WorkflowRoutingPolicy
> = {
  PM_APPROVAL_REQUEST: {
    primaryTo: ["project_manager"],
    primaryCc: ["manual_override", "procurement_chain"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Automatically route to the active Project Manager, copy governance stakeholders, and only fall back to configured defaults if project-specific routing is unavailable.",
  },
  PM_DECISION_NOTIFICATION: {
    primaryTo: ["procurement_chain"],
    primaryCc: [],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Send PM decision updates to the procurement chain first, with configured fallback routing only when the operational chain cannot be resolved.",
  },
  VENDOR_EVALUATION_REQUEST: {
    primaryTo: ["project_manager", "manual_override"],
    primaryCc: [],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Resolve the evaluation recipient from the project context or explicit send-time override, then fall back to configured defaults only if needed.",
  },
  FINAL_CERTIFICATE_ISSUED: {
    primaryTo: ["manual_override"],
    primaryCc: ["project_manager", "procurement_chain"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Deliver the certificate to the explicit vendor contact, copy project and procurement stakeholders from the assignment context, and use fallback routing only when those recipients are missing.",
  },
  CERTIFICATE_REOPENED: {
    primaryTo: ["procurement_chain"],
    primaryCc: ["project_manager"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Notify the procurement chain and project manager from the affected certificate context, with fallback recipients used only as a safety net.",
  },
  ANNUAL_EVALUATION_REMINDER: {
    primaryTo: ["project_manager"],
    primaryCc: ["procurement_chain"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Route reminder emails to the active project-side evaluator first, then rely on fallback routing only if no entity-level recipient is available.",
  },
  TASK_ASSIGNED: {
    primaryTo: ["assigned_user"],
    primaryCc: ["entity_owner"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Send task assignments to the assignee first, copy the owning manager when available, and use fallback recipients only if the task context cannot resolve a user.",
  },
  TASK_DUE_SOON: {
    primaryTo: ["assigned_user"],
    primaryCc: ["entity_owner", "procurement_chain"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Warn the assignee first, copy the task owner when applicable, and keep fallback routing as a controlled backup rather than the default path.",
  },
  TASK_OVERDUE: {
    primaryTo: ["assigned_user"],
    primaryCc: ["entity_owner", "procurement_chain"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Escalate overdue tasks through the assignee, owner, and procurement chain based on context, while preserving configured fallback recipients as a last resort.",
  },
  TASK_COMPLETED: {
    primaryTo: ["assigned_user"],
    primaryCc: ["entity_owner", "manual_override"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Confirm task completion to the assignee and owner directly from the task context and allow explicit oversight copies without fallback routing.",
  },
  SYSTEM_ALERT: {
    primaryTo: ["procurement_chain"],
    primaryCc: [],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Route critical alerts to the procurement chain by default and use configured fallback recipients only when no governance recipient can be resolved.",
  },
  PERFORMANCE_REVIEW_FINALIZED: {
    primaryTo: ["evaluated_employee"],
    primaryCc: ["entity_owner"],
    fallbackTo: ["default_fallback"],
    fallbackCc: ["default_fallback"],
    summary:
      "Notify only the evaluated employee and Khaled as evaluator, with fallback routing reserved for exceptional recovery cases.",
  },
};

export const NOTIFICATION_ROUTING_POLICIES: Partial<
  Record<NotificationEventKey, WorkflowRoutingStrategy[]>
> = {
  CERT_CREATED: ["project_manager", "procurement_chain"],
  CERT_SUBMITTED_PM: ["project_manager", "procurement_chain"],
  CERT_PM_APPROVED: ["project_manager", "procurement_chain"],
  CERT_PM_REJECTED: ["project_manager", "procurement_chain"],
  CERT_ISSUED: ["project_manager", "procurement_chain"],
  CERT_REOPENED: ["project_manager", "procurement_chain"],
  CERT_REVOKED: ["project_manager", "procurement_chain"],
  TASK_ASSIGNED: ["assigned_user", "entity_owner"],
  TASK_DUE_SOON: ["assigned_user", "entity_owner", "procurement_chain"],
  TASK_OVERDUE: ["assigned_user", "entity_owner", "procurement_chain"],
  TASK_COMPLETED: ["assigned_user", "entity_owner"],
  VENDOR_CREATED: ["procurement_chain"],
  SYSTEM_ALERT: ["procurement_chain"],
  PERFORMANCE_REVIEW_FINALIZED: ["evaluated_employee", "entity_owner"],
};

export function getRoutingStrategyLabels(strategies: WorkflowRoutingStrategy[]) {
  return strategies.map((strategy) => WORKFLOW_ROUTING_STRATEGY_LABELS[strategy]);
}
