import type { UserRole } from "@prisma/client";

import {
  GOVERNANCE_MANAGER_ROLES,
  PRIMARY_EVALUATOR_EMAIL,
  PROCUREMENT_LEAD_EMAIL,
  PROCUREMENT_SPECIALIST_EMAIL,
} from "@/lib/constants";

function hasRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(role);
}

export function canManageProjectStatus(role: UserRole) {
  return hasRole(role, GOVERNANCE_MANAGER_ROLES);
}

export function canManageVendorGovernance(role: UserRole) {
  return hasRole(role, GOVERNANCE_MANAGER_ROLES);
}

export function canRequestVendorEvaluation(role: UserRole) {
  return hasRole(role, GOVERNANCE_MANAGER_ROLES);
}

export function canFinalizeVendorEvaluation(role: UserRole) {
  return hasRole(role, GOVERNANCE_MANAGER_ROLES);
}

export function canManageWorkflowEmailSettings(role: UserRole) {
  return hasRole(role, GOVERNANCE_MANAGER_ROLES);
}

export function canManageMonthlyGovernance(role: UserRole, email?: string | null) {
  return canEvaluateTeamPerformance(role, email);
}

export function canManageOperationalTasks(role: UserRole) {
  return hasRole(role, ["ADMIN", "PROCUREMENT_DIRECTOR", "PROCUREMENT_LEAD"]);
}

export function canManageOperationalTaskAssignment(role: UserRole) {
  return canManageOperationalTasks(role);
}

export function canViewExecutiveDashboard(role: UserRole, email?: string | null) {
  return role === "ADMIN" || normalizeEmail(email) === PRIMARY_EVALUATOR_EMAIL;
}

export function canEvaluateTeamPerformance(role: UserRole, email?: string | null) {
  return role === "ADMIN" || normalizeEmail(email) === PRIMARY_EVALUATOR_EMAIL;
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

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}
