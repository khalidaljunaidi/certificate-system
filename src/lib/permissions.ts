import type { UserRole } from "@prisma/client";

import {
  GOVERNANCE_MANAGER_ROLES,
  PRIMARY_EVALUATOR_EMAIL,
  PROCUREMENT_LEAD_EMAIL,
  PROCUREMENT_SPECIALIST_EMAIL,
  PROCUREMENT_TEAM_ROLES,
} from "@/lib/constants";
import type { PermissionKey } from "@/lib/rbac";

function hasRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(role);
}

export type PermissionSubject = {
  role: UserRole;
  email?: string | null;
  permissions?: string[] | null;
};

type PermissionSubjectInput = PermissionSubject | UserRole;

function normalizeSubject(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
): PermissionSubject {
  if (typeof subject === "string") {
    return {
      role: subject,
      email,
      permissions,
    };
  }

  return {
    role: subject.role,
    email: subject.email ?? email,
    permissions: subject.permissions ?? permissions,
  };
}

function hasPermission(
  subject: PermissionSubjectInput,
  keys: PermissionKey[],
  fallbackRoles: readonly UserRole[],
  fallbackEmails: readonly string[] = [],
  email?: string | null,
  permissions?: string[] | null,
) {
  const normalizedSubject = normalizeSubject(subject, email, permissions);
  const permissionSet = new Set((normalizedSubject.permissions ?? []).map((key) => key.trim()));

  if (keys.some((key) => permissionSet.has(key))) {
    return true;
  }

  if (fallbackEmails.some((allowedEmail) => normalizeEmail(normalizedSubject.email) === allowedEmail)) {
    return true;
  }

  return hasRole(normalizedSubject.role, fallbackRoles);
}

export function canManageProjectStatus(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["project.status.manage"], GOVERNANCE_MANAGER_ROLES, [], email, permissions);
}

export function canManageVendorGovernance(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["vendor.create", "vendor.edit", "vendor.taxonomy.manage"], GOVERNANCE_MANAGER_ROLES, [], email, permissions);
}

export function canRequestVendorEvaluation(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["evaluation.request"], GOVERNANCE_MANAGER_ROLES, [], email, permissions);
}

export function canFinalizeVendorEvaluation(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["evaluation.finalize"], GOVERNANCE_MANAGER_ROLES, [], email, permissions);
}

export function canManageWorkflowEmailSettings(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["settings.manage"], GOVERNANCE_MANAGER_ROLES, [], email, permissions);
}

export function canManageMonthlyGovernance(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return canEvaluateTeamPerformance(subject, email, permissions);
}

export function canManageOperationalTasks(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(
    subject,
    ["task.create", "task.edit"],
    ["ADMIN", "PROCUREMENT_DIRECTOR", "PROCUREMENT_LEAD"],
    [],
    email,
    permissions,
  );
}

export function canManageOperationalTaskAssignment(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return canManageOperationalTasks(subject, email, permissions);
}

export function canViewExecutiveDashboard(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  const normalizedSubject = normalizeSubject(subject, email, permissions);
  return (
    hasPermission(
      normalizedSubject,
      ["settings.manage", "roles.manage"],
      ["ADMIN"],
      [PRIMARY_EVALUATOR_EMAIL],
    ) || normalizeEmail(normalizedSubject.email) === PRIMARY_EVALUATOR_EMAIL
  );
}

export function canEvaluateTeamPerformance(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["evaluation.finalize"], ["ADMIN"], [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canViewOwnPerformance(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  return (
    normalizedEmail === PROCUREMENT_LEAD_EMAIL ||
    normalizedEmail === PROCUREMENT_SPECIALIST_EMAIL ||
    normalizedEmail === PRIMARY_EVALUATOR_EMAIL
  );
}

export function isEvaluatedEmployee(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  return (
    normalizedEmail === PROCUREMENT_LEAD_EMAIL ||
    normalizedEmail === PROCUREMENT_SPECIALIST_EMAIL
  );
}

export function isPrimaryEvaluator(email?: string | null) {
  return normalizeEmail(email) === PRIMARY_EVALUATOR_EMAIL;
}

export function canManageRoles(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["roles.manage", "permissions.manage"], ["ADMIN"], [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canManagePermissions(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return canManageRoles(subject, email, permissions);
}

export function canCreateProject(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["project.create"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canExecuteTask(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["task.execute"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canCompleteTask(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["task.complete"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canEditTaskDefinition(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(
    subject,
    ["task.edit"],
    ["ADMIN", "PROCUREMENT_DIRECTOR", "PROCUREMENT_LEAD"],
    [PRIMARY_EVALUATOR_EMAIL],
    email,
    permissions,
  );
}

export function canCreateCertificate(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["certificate.create"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canEditCertificate(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["certificate.edit"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canSubmitCertificateForPmApproval(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["certificate.submit_pm_approval"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canIssueCertificate(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["certificate.issue"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canReopenCertificate(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["certificate.reopen"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

export function canArchiveCertificate(
  subject: PermissionSubjectInput,
  email?: string | null,
  permissions?: string[] | null,
) {
  return hasPermission(subject, ["certificate.archive"], PROCUREMENT_TEAM_ROLES, [PRIMARY_EVALUATOR_EMAIL], email, permissions);
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}
