"use server";

import { revalidatePath } from "next/cache";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import type { ActionState } from "@/lib/types";
import { roleFormSchema, userRoleAssignmentSchema } from "@/lib/validation";
import {
  assignUserToRole,
  saveRoleDefinition,
} from "@/server/services/rbac-service";

export async function saveRoleAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageRoles(session.user)) {
      return {
        error: "You do not have permission to manage roles and permissions.",
      };
    }

    const values = roleFormSchema.parse({
      roleId: formData.get("roleId") || undefined,
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      permissionKeys: formData.getAll("permissionKeys"),
    });

    const role = await saveRoleDefinition({
      actorUserId: session.user.id,
      roleId: values.roleId,
      name: values.name,
      description: values.description,
      permissionKeys: values.permissionKeys,
    });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/profile");
    revalidatePath("/admin", "layout");

    return {
      success: values.roleId
        ? "Role updated successfully."
        : "Role created successfully.",
      noticeKey: values.roleId ? "role-updated" : "role-created",
      redirectTo: `/admin/roles?roleId=${role.id}&notice=${
        values.roleId ? "role-updated" : "role-created"
      }`,
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function assignUserRoleAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession();

    if (!canManageRoles(session.user)) {
      return {
        error: "You do not have permission to assign roles.",
      };
    }

    const values = userRoleAssignmentSchema.parse({
      userId: formData.get("userId"),
      roleId: formData.get("roleId"),
    });

    const assignment = await assignUserToRole({
      actorUserId: session.user.id,
      userId: values.userId,
      roleId: values.roleId,
    });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/profile");
    revalidatePath("/admin", "layout");

    return {
      success: "User role updated successfully.",
      noticeKey: "user-role-updated",
      redirectTo: `/admin/roles?notice=user-role-updated&userId=${assignment.userId}`,
    };
  } catch (error) {
    return toActionState(error);
  }
}
