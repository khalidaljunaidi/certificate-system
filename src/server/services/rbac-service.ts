import type { UserRole } from "@prisma/client";

import {
  DEFAULT_ROLE_DEFINITIONS,
  groupPermissionsByCategory,
  normalizeRoleKey,
  PERMISSION_DEFINITIONS,
} from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type {
  AccessRoleView,
  PermissionGroupView,
  RoleManagementView,
  RoleManagementUserView,
  UserRoleAssignmentView,
} from "@/lib/types";
import { createAuditLog } from "@/server/services/audit-service";

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

export async function ensureDefaultAccessControlCatalog() {
  const [existingPermissionCount, existingRoleCount] = await Promise.all([
    prisma.permission.count(),
    prisma.role.count(),
  ]);

  if (existingPermissionCount > 0 && existingRoleCount > 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const permissionRows = await Promise.all(
      PERMISSION_DEFINITIONS.map((definition) =>
        tx.permission.upsert({
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
        }),
      ),
    );

    for (const roleDefinition of DEFAULT_ROLE_DEFINITIONS) {
      const role =
        (await tx.role.findUnique({
          where: { key: roleDefinition.key },
          select: { id: true },
        })) ??
        (await tx.role.create({
          data: {
            key: roleDefinition.key,
            name: roleDefinition.name,
            description: roleDefinition.description,
            isSystem: roleDefinition.isSystem,
          },
          select: { id: true },
        }));

      type PermissionRow = (typeof permissionRows)[number];

      const permissionIds = roleDefinition.permissions
        .map((permissionKey) =>
          permissionRows.find((permission) => permission.key === permissionKey),
        )
        .filter((permission): permission is PermissionRow => Boolean(permission))
        .map((permission) => permission.id);

      const existingLinks = await tx.rolePermission.count({
        where: {
          roleId: role.id,
        },
      });

      if (existingLinks === 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    }
  });
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
  await ensureDefaultAccessControlCatalog();

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
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          include: {
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

  return {
    permissionGroups: groupPermissionsByCategory(),
    roles: roles.map(toRoleView),
    users: users.map(toUserView),
  };
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
