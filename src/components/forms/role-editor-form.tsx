"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { saveRoleAction } from "@/actions/rbac-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AccessRoleView,
  PermissionGroupView,
} from "@/lib/types";

export function RoleEditorForm({
  mode,
  role,
  permissionGroups,
}: {
  mode: "create" | "edit";
  role: AccessRoleView | null;
  permissionGroups: PermissionGroupView[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveRoleAction,
    EMPTY_ACTION_STATE,
  );
  const selectedPermissionKeys = new Set(role?.permissionKeys ?? []);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-6">
      {role ? <input type="hidden" name="roleId" value={role.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                {mode === "create" ? "Create Role" : "Edit Role"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {role ? role.name : "New Role"}
              </h2>
            </div>
            {role ? (
              <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                {role.isSystem ? "System Role" : "Custom Role"}
              </span>
            ) : (
              <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                Custom Role
              </span>
            )}
          </div>
          <p className="text-sm leading-7 text-[var(--color-muted)]">
            Roles can be renamed, described, and granted a custom permission set.
            User assignments stay separate and remain one role per user.
          </p>
        </div>

        <div>
          <Label htmlFor="role-name">Role Name</Label>
          <Input
            id="role-name"
            name="name"
            defaultValue={role?.name ?? ""}
            placeholder="e.g. Contracts Specialist"
            disabled={isPending}
            required
          />
        </div>

        <div>
          <Label htmlFor="role-key">Role Key</Label>
          <Input
            id="role-key"
            value={role?.key ?? "Generated automatically from the name"}
            disabled
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="role-description">Description</Label>
          <Textarea
            id="role-description"
            name="description"
            defaultValue={role?.description ?? ""}
            placeholder="Describe what this role is allowed to do."
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Permissions
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Toggle the capabilities this role should have. The checkbox groups
            are organized by business area.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {permissionGroups.map((group) => (
            <div
              key={group.category}
              className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {group.label}
                </p>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  {group.permissions.length} permissions
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-start gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
                  >
                    <input
                      type="checkbox"
                      name="permissionKeys"
                      value={permission.key}
                      defaultChecked={selectedPermissionKeys.has(permission.key)}
                      disabled={isPending}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{permission.label}</span>
                      <span className="mt-1 block text-xs leading-6 text-[var(--color-muted)]">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {role ? (
        <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Assigned Users
          </p>
          {role.users.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {role.users.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)]"
                >
                  <span>{user.name}</span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {user.email}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              No users are assigned to this role yet.
            </p>
          )}
        </div>
      ) : null}

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending
          ? "Saving..."
          : mode === "create"
            ? "Create Role"
            : "Save Role"}
      </Button>
    </form>
  );
}
