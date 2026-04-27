import type { PermissionCategory, UserRole } from "@prisma/client";

export type PermissionKey =
  | "vendor.create"
  | "vendor.edit"
  | "vendor.taxonomy.manage"
  | "project.create"
  | "project.edit"
  | "project.status.manage"
  | "task.create"
  | "task.edit"
  | "task.execute"
  | "task.complete"
  | "certificate.create"
  | "certificate.edit"
  | "certificate.submit_pm_approval"
  | "certificate.issue"
  | "certificate.reopen"
  | "certificate.revoke"
  | "certificate.archive"
  | "evaluation.request"
  | "evaluation.finalize"
  | "evaluation.override"
  | "settings.manage"
  | "users.manage"
  | "roles.manage"
  | "permissions.manage";

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  category: PermissionCategory;
  description: string;
  sortOrder: number;
};

export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  VENDORS: "Vendors",
  PROJECTS: "Projects",
  TASKS: "Tasks",
  CERTIFICATES: "Certificates",
  EVALUATIONS: "Evaluations",
  SYSTEM: "System",
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: "vendor.create",
    label: "Create Vendors",
    category: "VENDORS",
    description: "Create a new vendor master record.",
    sortOrder: 10,
  },
  {
    key: "vendor.edit",
    label: "Edit Vendors",
    category: "VENDORS",
    description: "Edit vendor master profile details and governance data.",
    sortOrder: 20,
  },
  {
    key: "vendor.taxonomy.manage",
    label: "Manage Vendor Taxonomy",
    category: "VENDORS",
    description: "Manage vendor categories and subcategories.",
    sortOrder: 30,
  },
  {
    key: "project.create",
    label: "Create Projects",
    category: "PROJECTS",
    description: "Create new project records.",
    sortOrder: 10,
  },
  {
    key: "project.edit",
    label: "Edit Projects",
    category: "PROJECTS",
    description: "Edit project profile information.",
    sortOrder: 20,
  },
  {
    key: "project.status.manage",
    label: "Manage Project Status",
    category: "PROJECTS",
    description: "Update project lifecycle status.",
    sortOrder: 30,
  },
  {
    key: "task.create",
    label: "Create Tasks",
    category: "TASKS",
    description: "Create operational tasks and assignments.",
    sortOrder: 10,
  },
  {
    key: "task.edit",
    label: "Edit Tasks",
    category: "TASKS",
    description: "Edit task structure, assignment, or due date.",
    sortOrder: 20,
  },
  {
    key: "task.execute",
    label: "Execute Tasks",
    category: "TASKS",
    description: "Update execution result and checklist progress.",
    sortOrder: 30,
  },
  {
    key: "task.complete",
    label: "Complete Tasks",
    category: "TASKS",
    description: "Mark tasks as completed.",
    sortOrder: 40,
  },
  {
    key: "certificate.create",
    label: "Create Certificates",
    category: "CERTIFICATES",
    description: "Create completion certificate drafts.",
    sortOrder: 10,
  },
  {
    key: "certificate.edit",
    label: "Edit Certificates",
    category: "CERTIFICATES",
    description: "Edit certificate drafts and reopened certificates.",
    sortOrder: 20,
  },
  {
    key: "certificate.submit_pm_approval",
    label: "Submit for PM Approval",
    category: "CERTIFICATES",
    description: "Submit certificates for project manager approval.",
    sortOrder: 30,
  },
  {
    key: "certificate.issue",
    label: "Issue Certificates",
    category: "CERTIFICATES",
    description: "Issue approved certificates.",
    sortOrder: 40,
  },
  {
    key: "certificate.reopen",
    label: "Reopen Certificates",
    category: "CERTIFICATES",
    description: "Reopen issued certificates for revision.",
    sortOrder: 50,
  },
  {
    key: "certificate.revoke",
    label: "Revoke Certificates",
    category: "CERTIFICATES",
    description: "Revoke issued certificates when needed.",
    sortOrder: 60,
  },
  {
    key: "certificate.archive",
    label: "Archive Certificates",
    category: "CERTIFICATES",
    description: "Archive certificates without deleting history.",
    sortOrder: 70,
  },
  {
    key: "evaluation.request",
    label: "Request Evaluations",
    category: "EVALUATIONS",
    description: "Launch vendor evaluation workflows.",
    sortOrder: 10,
  },
  {
    key: "evaluation.finalize",
    label: "Finalize Evaluations",
    category: "EVALUATIONS",
    description: "Finalize vendor evaluation cycles.",
    sortOrder: 20,
  },
  {
    key: "evaluation.override",
    label: "Override Evaluations",
    category: "EVALUATIONS",
    description: "Force-finalize or override blocked evaluations.",
    sortOrder: 30,
  },
  {
    key: "settings.manage",
    label: "Manage Settings",
    category: "SYSTEM",
    description: "Manage workflow routing and governance settings.",
    sortOrder: 10,
  },
  {
    key: "users.manage",
    label: "Manage Users",
    category: "SYSTEM",
    description: "Assign roles and maintain user access.",
    sortOrder: 20,
  },
  {
    key: "roles.manage",
    label: "Manage Roles",
    category: "SYSTEM",
    description: "Create and edit roles with granular permissions.",
    sortOrder: 30,
  },
  {
    key: "permissions.manage",
    label: "Manage Permissions",
    category: "SYSTEM",
    description: "Adjust granular permission grants for roles.",
    sortOrder: 40,
  },
];

export type DefaultRolePermissionMap = {
  key: UserRole | string;
  name: string;
  description: string;
  isSystem: boolean;
  sortOrder: number;
  permissions: PermissionKey[];
};

export const DEFAULT_ROLE_DEFINITIONS: DefaultRolePermissionMap[] = [
  {
    key: "ADMIN",
    name: "Administrator",
    description: "Full system administration access.",
    isSystem: true,
    sortOrder: 0,
    permissions: PERMISSION_DEFINITIONS.map((definition) => definition.key),
  },
  {
    key: "PROCUREMENT_DIRECTOR",
    name: "Procurement Director",
    description: "Executive governance, approvals, and oversight.",
    isSystem: true,
    sortOrder: 10,
    permissions: [
      "vendor.create",
      "vendor.edit",
      "vendor.taxonomy.manage",
      "project.create",
      "project.edit",
      "project.status.manage",
      "task.create",
      "task.edit",
      "task.execute",
      "task.complete",
      "certificate.create",
      "certificate.edit",
      "certificate.submit_pm_approval",
      "certificate.issue",
      "certificate.reopen",
      "certificate.revoke",
      "certificate.archive",
      "evaluation.request",
      "evaluation.finalize",
    ],
  },
  {
    key: "PROCUREMENT_LEAD",
    name: "Procurement Lead",
    description: "Operational procurement and project coordination access.",
    isSystem: true,
    sortOrder: 20,
    permissions: [
      "vendor.create",
      "vendor.edit",
      "project.create",
      "project.edit",
      "project.status.manage",
      "task.create",
      "task.edit",
      "task.execute",
      "task.complete",
      "certificate.create",
      "certificate.edit",
      "certificate.submit_pm_approval",
      "certificate.issue",
      "certificate.reopen",
      "certificate.revoke",
      "certificate.archive",
      "evaluation.request",
      "evaluation.finalize",
    ],
  },
  {
    key: "PROCUREMENT_SPECIALIST",
    name: "Procurement Specialist",
    description: "Execution-focused access for assigned operational work.",
    isSystem: true,
    sortOrder: 30,
    permissions: [
      "project.create",
      "task.execute",
      "task.complete",
      "certificate.create",
      "certificate.edit",
      "certificate.submit_pm_approval",
      "certificate.issue",
      "certificate.reopen",
      "certificate.archive",
    ],
  },
  {
    key: "PROCUREMENT",
    name: "Procurement",
    description: "Baseline procurement access for operational work.",
    isSystem: true,
    sortOrder: 40,
    permissions: [
      "project.create",
      "task.execute",
      "task.complete",
      "certificate.create",
      "certificate.edit",
      "certificate.submit_pm_approval",
      "certificate.issue",
      "certificate.reopen",
      "certificate.archive",
    ],
  },
];

export function normalizeRoleKey(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function slugifyRoleKey(value: string) {
  return normalizeRoleKey(value)
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export function groupPermissionsByCategory() {
  return Object.entries(
    PERMISSION_DEFINITIONS.reduce<Record<PermissionCategory, PermissionDefinition[]>>(
      (groups, definition) => {
        groups[definition.category].push(definition);
        return groups;
      },
      {
        VENDORS: [],
        PROJECTS: [],
        TASKS: [],
        CERTIFICATES: [],
        EVALUATIONS: [],
        SYSTEM: [],
      },
    ),
  ).map(([category, permissions]) => ({
    category: category as PermissionCategory,
    label: PERMISSION_CATEGORY_LABELS[category as PermissionCategory],
    permissions: permissions.sort((left, right) => left.sortOrder - right.sortOrder),
  }));
}
