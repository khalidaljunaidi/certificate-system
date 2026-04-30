import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

import {
  DEFAULT_ROLE_DEFINITIONS,
  groupPermissionsByCategory,
  normalizeRoleKey,
  PERMISSION_DEFINITIONS,
} from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { withServerTiming } from "@/lib/server-performance";
import type {
  AccessRoleOptionView,
  AccessRoleView,
  InternalUserManagementView,
  PermissionGroupView,
  RoleManagementView,
  RoleManagementUserView,
  UserRoleAssignmentView,
} from "@/lib/types";
import { createAuditLog } from "@/server/services/audit-service";

const ACCESS_CATALOG_CACHE_MS = 5 * 60 * 1000;
const ROLE_MANAGEMENT_DATA_CACHE_MS = 10_000;

let accessCatalogEnsuredAt = 0;
let accessCatalogEnsurePromise: Promise<void> | null = null;
let roleManagementDataCache:
  | {
      expiresAt: number;
      data: RoleManagementView;
    }
  | null = null;

function legacyRoleLabel(role: UserRole) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function toPermissionKeys(
  permissions: Array<{
    permission: {
      key: string;
    };
  }>,
) {
  return permissions.map((item) => item.permission.key).sort();
}

function toRoleAssignmentView(
  assignment: {
    role: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      permissions: Array<{
        permission: {
          key: string;
        };
      }>;
    };
  } | null,
  userId: string,
): UserRoleAssignmentView | null {
  if (!assignment) {
    return null;
  }

  return {
    userId,
    roleId: assignment.role.id,
    roleKey: assignment.role.key,
    roleName: assignment.role.name,
    roleDescription: assignment.role.description,
    permissions: toPermissionKeys(assignment.role.permissions),
  };
}

function toRoleView(role: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    permission: {
      key: string;
      name: string;
      description: string | null;
      category: string;
      sortOrder: number;
    };
  }>;
  users: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      title: string;
      role: UserRole;
    };
  }>;
}): AccessRoleView {
  const permissions = role.permissions
    .map((entry) => entry.permission)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key));

  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionKeys: permissions.map((permission) => permission.key),
    permissionCount: permissions.length,
    userCount: role.users.length,
    users: role.users.map((entry) => ({
      id: entry.user.id,
      name: entry.user.name,
      email: entry.user.email,
      title: entry.user.title,
      legacyRole: entry.user.role,
    })),
  };
}

function toAccessRoleOption(role: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: Array<{
    permission: {
      key: string;
    };
  }>;
}): AccessRoleOptionView {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissionKeys: toPermissionKeys(role.permissions),
  };
}

function toLegacyRoleKey(roleKey: string): UserRole {
  switch (roleKey) {
    case "ADMIN":
      return "ADMIN";
    case "PROCUREMENT_DIRECTOR":
      return "PROCUREMENT_DIRECTOR";
    case "PROCUREMENT_LEAD":
      return "PROCUREMENT_LEAD";
    case "PROCUREMENT_SPECIALIST":
      return "PROCUREMENT_SPECIALIST";
    case "PROCUREMENT":
      return "PROCUREMENT";
    default:
      return "PROCUREMENT";
  }
}

function toUserView(user: {
  id: string;
  name: string;
  email: string;
  title: string;
  role: UserRole;
  roleAssignment: {
    role: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      permissions: Array<{
        permission: {
          key: string;
        };
      }>;
    };
  } | null;
}): RoleManagementUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    legacyRole: user.role,
    roleAssignment: toRoleAssignmentView(user.roleAssignment, user.id),
  };
}

async function upsertPermission(definition: (typeof PERMISSION_DEFINITIONS)[number]) {
  return prisma.permission.upsert({
    where: {
      key: definition.key,
    },
    update: {
      name: definition.label,
      category: definition.category,
      description: definition.description,
      sortOrder: definition.sortOrder,
    },
    create: {
      key: definition.key,
      name: definition.label,
      category: definition.category,
      description: definition.description,
      sortOrder: definition.sortOrder,
    },
  });
}

async function upsertRole(definition: (typeof DEFAULT_ROLE_DEFINITIONS)[number]) {
  return prisma.role.upsert({
    where: {
      key: definition.key,
    },
    update: {
      name: definition.name,
      description: definition.description,
      isSystem: definition.isSystem,
    },
    create: {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      isSystem: definition.isSystem,
    },
  });
}

async function ensureDefaultAccessControlCatalogUncached() {
  const [existingPermissionKeys, existingRoleKeys] = await Promise.all([
    prisma.permission.findMany({
      select: {
        id: true,
        key: true,
      },
    }),
    prisma.role.findMany({
      select: {
        id: true,
        key: true,
      },
    }),
  ]);

  const permissionKeySet = new Set(existingPermissionKeys.map((permission) => permission.key));
  const roleKeySet = new Set(existingRoleKeys.map((role) => role.key));

  const missingPermissionDefinitions = PERMISSION_DEFINITIONS.filter(
    (definition) => !permissionKeySet.has(definition.key),
  );
  const missingRoleDefinitions = DEFAULT_ROLE_DEFINITIONS.filter(
    (definition) => !roleKeySet.has(definition.key),
  );

  if (missingPermissionDefinitions.length > 0) {
    await Promise.all(missingPermissionDefinitions.map(upsertPermission));
  }

  if (missingRoleDefinitions.length > 0) {
    await Promise.all(missingRoleDefinitions.map(upsertRole));
  }

  const [permissionRows, roleRows] = await Promise.all([
    missingPermissionDefinitions.length > 0
      ? prisma.permission.findMany({
          select: {
            id: true,
            key: true,
          },
        })
      : Promise.resolve(existingPermissionKeys),
    missingRoleDefinitions.length > 0
      ? prisma.role.findMany({
          select: {
            id: true,
            key: true,
          },
        })
      : Promise.resolve(existingRoleKeys),
  ]);

  const permissionIdByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]));
  const roleIdByKey = new Map(roleRows.map((role) => [role.key, role.id]));
  const defaultRoleIds = DEFAULT_ROLE_DEFINITIONS.map((definition) => roleIdByKey.get(definition.key)).filter(
    (roleId): roleId is string => Boolean(roleId),
  );

  if (defaultRoleIds.length === 0) {
    return;
  }

  const existingRolePermissions = await prisma.rolePermission.findMany({
    where: {
      roleId: {
        in: defaultRoleIds,
      },
    },
    select: {
      roleId: true,
      permissionId: true,
    },
  });
  const existingRolePermissionKeys = new Set(
    existingRolePermissions.map((link) => `${link.roleId}:${link.permissionId}`),
  );

  const missingRolePermissionLinks = DEFAULT_ROLE_DEFINITIONS.flatMap((roleDefinition) => {
    const roleId = roleIdByKey.get(roleDefinition.key);

    if (!roleId) {
      return [];
    }

    return roleDefinition.permissions.flatMap((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);

      if (!permissionId) {
        return [];
      }

      const linkKey = `${roleId}:${permissionId}`;

      if (existingRolePermissionKeys.has(linkKey)) {
        return [];
      }

      return {
        roleId,
        permissionId,
      };
    });
  });

  if (missingRolePermissionLinks.length === 0) {
    return;
  }

  await prisma.rolePermission.createMany({
    data: missingRolePermissionLinks,
    skipDuplicates: true,
  });
}

export async function ensureDefaultAccessControlCatalog() {
  const now = Date.now();

  if (now - accessCatalogEnsuredAt < ACCESS_CATALOG_CACHE_MS) {
    return;
  }

  if (!accessCatalogEnsurePromise) {
    accessCatalogEnsurePromise = withServerTiming("rbac.ensureCatalog", async () => {
      await ensureDefaultAccessControlCatalogUncached();
      accessCatalogEnsuredAt = Date.now();
    }).finally(() => {
      accessCatalogEnsurePromise = null;
    });
  }

  await accessCatalogEnsurePromise;
}

export async function getPermissionCatalog(): Promise<PermissionGroupView[]> {
  return groupPermissionsByCategory();
}

export async function resolveUserAccessProfile(input: {
  userId: string;
  legacyRole: UserRole;
}) {
  try {
    const assignment = await prisma.userRoleAssignment.findUnique({
      where: {
        userId: input.userId,
      },
      select: {
        role: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (assignment) {
      return {
        roleId: assignment.role.id,
        roleKey: assignment.role.key,
        roleName: assignment.role.name,
        permissions: toPermissionKeys(assignment.role.permissions),
      };
    }

    const fallbackRole = await prisma.role.findUnique({
      where: {
        key: input.legacyRole,
      },
      select: {
        id: true,
        key: true,
        name: true,
        permissions: {
          select: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });

    if (fallbackRole) {
      return {
        roleId: fallbackRole.id,
        roleKey: fallbackRole.key,
        roleName: fallbackRole.name,
        permissions: toPermissionKeys(fallbackRole.permissions),
      };
    }
  } catch (error) {
    console.warn("[rbac] Falling back to legacy role mapping", error);
  }

  return {
    roleId: null,
    roleKey: input.legacyRole,
    roleName: legacyRoleLabel(input.legacyRole),
    permissions: [] as string[],
  };
}

export async function getRoleManagementData(): Promise<RoleManagementView> {
  if (roleManagementDataCache && roleManagementDataCache.expiresAt > Date.now()) {
    return roleManagementDataCache.data;
  }

  return withServerTiming("rbac.roleManagementData", async () => {
    const [roles, users] = await Promise.all([
      prisma.role.findMany({
        orderBy: [
          {
            isSystem: "desc",
          },
          {
            name: "asc",
          },
        ],
        take: 100,
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          isSystem: true,
          permissions: {
            select: {
              permission: {
                select: {
                  key: true,
                  name: true,
                  description: true,
                  category: true,
                  sortOrder: true,
                },
              },
            },
          },
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  title: true,
                  role: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: [
          {
            name: "asc",
          },
        ],
        take: 250,
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
          roleAssignment: {
            select: {
              role: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          key: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const data = {
      permissionGroups: groupPermissionsByCategory(),
      roles: roles.map(toRoleView),
      users: users.map(toUserView),
    };

    roleManagementDataCache = {
      expiresAt: Date.now() + ROLE_MANAGEMENT_DATA_CACHE_MS,
      data,
    };

    return data;
  });
}

export async function getInternalUserManagementData(): Promise<InternalUserManagementView> {
  return withServerTiming("rbac.internalUserManagementData", async () => {
    const [roles, users] = await Promise.all([
      prisma.role.findMany({
        orderBy: [
          {
            isSystem: "desc",
          },
          {
            name: "asc",
          },
        ],
        take: 100,
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        take: 250,
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          role: true,
          isActive: true,
          roleAssignment: {
            select: {
              role: {
                select: {
                  key: true,
                  name: true,
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          key: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const roleByKey = new Map(roles.map((role) => [role.key, role]));

    return {
      roles: roles.map(toAccessRoleOption),
      users: users.map((user) => {
        const assignmentRole = user.roleAssignment?.role;
        const fallbackRole = assignmentRole ? null : roleByKey.get(user.role);
        const accessRoleName = assignmentRole?.name ?? fallbackRole?.name ?? legacyRoleLabel(user.role);
        const accessRoleKey = assignmentRole?.key ?? fallbackRole?.key ?? user.role;
        const permissions = assignmentRole?.permissions ?? fallbackRole?.permissions ?? [];
        const paymentPermissionKeys = toPermissionKeys(permissions).filter((key) => key.startsWith("payment."));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          title: user.title,
          isActive: user.isActive,
          legacyRole: user.role,
          accessRoleName,
          accessRoleKey,
          paymentPermissionKeys,
        };
      }),
    };
  });
}

export async function saveRoleDefinition(input: {
  actorUserId: string;
  roleId?: string | null;
  name: string;
  description?: string | null;
  permissionKeys: string[];
}) {
  await ensureDefaultAccessControlCatalog();

  const normalizedPermissionKeys = Array.from(
    new Set(input.permissionKeys.map((key) => key.trim()).filter(Boolean)),
  );

  const permissionCatalog = await prisma.permission.findMany({
    select: {
      id: true,
      key: true,
    },
  });
  const permissionMap = new Map(permissionCatalog.map((permission) => [permission.key, permission.id]));
  const permissionIds = normalizedPermissionKeys
    .map((key) => permissionMap.get(key))
    .filter((permissionId): permissionId is string => Boolean(permissionId));

  if (permissionIds.length !== normalizedPermissionKeys.length) {
    throw new Error("One or more selected permissions are invalid.");
  }

  const key = normalizeRoleKey(input.name);

  return prisma.$transaction(async (tx) => {
    const existingRole = input.roleId
      ? await tx.role.findUnique({
          where: {
            id: input.roleId,
          },
          select: {
            id: true,
            key: true,
            isSystem: true,
          },
        })
      : null;

    if (input.roleId && !existingRole) {
      throw new Error("Role not found.");
    }

    if (!input.roleId) {
      const duplicate = await tx.role.findUnique({
        where: {
          key,
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        throw new Error("A role with this name already exists.");
      }
    }

    const role = input.roleId
      ? await tx.role.update({
          where: {
            id: input.roleId,
          },
          data: {
            name: input.name.trim(),
            description: input.description?.trim() || null,
          },
        })
      : await tx.role.create({
          data: {
            key,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            isSystem: false,
          },
        });

    await tx.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    await createAuditLog(tx, {
      action: input.roleId ? "UPDATED" : "CREATED",
      entityType: "Role",
      entityId: role.id,
      userId: input.actorUserId,
      details: {
        key: role.key,
        name: role.name,
        description: role.description,
        permissionKeys: normalizedPermissionKeys,
      },
    });

    return role;
  });
}

export async function assignUserToRole(input: {
  actorUserId: string;
  userId: string;
  roleId: string;
}) {
  await ensureDefaultAccessControlCatalog();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const role = await tx.role.findUnique({
      where: {
        id: input.roleId,
      },
      select: {
        id: true,
        key: true,
        name: true,
      },
    });

    if (!role) {
      throw new Error("Role not found.");
    }

    const assignment = await tx.userRoleAssignment.upsert({
      where: {
        userId: input.userId,
      },
      update: {
        roleId: role.id,
        assignedByUserId: input.actorUserId,
      },
      create: {
        userId: input.userId,
        roleId: role.id,
        assignedByUserId: input.actorUserId,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "UserRoleAssignment",
      entityId: assignment.userId,
      userId: input.actorUserId,
      details: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        roleId: role.id,
        roleKey: role.key,
        roleName: role.name,
      },
    });

    return assignment;
  });
}

export async function createInternalUser(input: {
  actorUserId: string;
  name: string;
  email: string;
  title: string;
  temporaryPassword: string;
  roleId: string;
}) {
  await ensureDefaultAccessControlCatalog();

  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new Error("An internal user with this email already exists.");
    }

    const role = await tx.role.findUnique({
      where: {
        id: input.roleId,
      },
      select: {
        id: true,
        key: true,
        name: true,
      },
    });

    if (!role) {
      throw new Error("Selected role was not found.");
    }

    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        title: input.title.trim(),
        passwordHash,
        passwordChanged: false,
        passwordUpdatedAt: null,
        role: toLegacyRoleKey(role.key),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    await tx.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedByUserId: input.actorUserId,
      },
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "User",
      entityId: user.id,
      userId: input.actorUserId,
      details: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        roleId: role.id,
        roleKey: role.key,
        roleName: role.name,
        title: input.title.trim(),
      },
    });

    return {
      userId: user.id,
      roleId: role.id,
    };
  });
}
