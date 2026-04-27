"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { assignUserRoleAction } from "@/actions/rbac-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AccessRoleView, RoleManagementUserView } from "@/lib/types";

export function UserRoleAssignmentRow({
  user,
  roles,
}: {
  user: RoleManagementUserView;
  roles: AccessRoleView[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    assignUserRoleAction,
    EMPTY_ACTION_STATE,
  );

  const currentRoleId =
    user.roleAssignment?.roleId ??
    roles.find((role) => role.key === user.legacyRole)?.id ??
    roles[0]?.id ??
    "";

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form
      action={formAction}
      className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
    >
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
            {user.name}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {user.title}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{user.email}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Legacy role: {user.legacyRole.replaceAll("_", " ")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`role-${user.id}`}>Assigned Role</Label>
          <Select
            id={`role-${user.id}`}
            name="roleId"
            defaultValue={currentRoleId}
            disabled={isPending}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
                {role.isSystem ? " | System" : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col items-start gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Assign Role"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />
      </div>
    </form>
  );
}
