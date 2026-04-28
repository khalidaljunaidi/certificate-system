"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createInternalUserAction } from "@/actions/rbac-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AccessRoleOptionView } from "@/lib/types";

export function InternalUserCreateForm({
  roles,
}: {
  roles: AccessRoleOptionView[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createInternalUserAction,
    EMPTY_ACTION_STATE,
  );
  const defaultRoleId =
    roles.find((role) => role.key === "FINANCE_PAYMENT_USER")?.id ?? roles[0]?.id ?? "";
  const [selectedRoleId, setSelectedRoleId] = useState(defaultRoleId);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="internal-user-name">Full Name</Label>
          <Input id="internal-user-name" name="name" disabled={isPending} required />
        </div>
        <div>
          <Label htmlFor="internal-user-email">Email</Label>
          <Input
            id="internal-user-email"
            name="email"
            type="email"
            disabled={isPending}
            required
          />
        </div>
        <div>
          <Label htmlFor="internal-user-title">Title</Label>
          <Input id="internal-user-title" name="title" disabled={isPending} required />
        </div>
        <div>
          <Label htmlFor="internal-user-role">Assigned Role</Label>
          <Select
            id="internal-user-role"
            name="roleId"
            value={selectedRoleId}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            disabled={isPending}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="internal-user-password">Temporary Password</Label>
          <Input
            id="internal-user-password"
            name="temporaryPassword"
            type="password"
            disabled={isPending}
            required
          />
          <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
            The user will be forced to change this password on first sign-in.
          </p>
        </div>
      </div>

      {selectedRole ? (
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Effective Permissions
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {selectedRole.description ?? "Permissions are inherited from the selected access role."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedRole.permissionKeys.length > 0 ? (
              selectedRole.permissionKeys.map((permissionKey) => (
                <Badge key={permissionKey} variant="neutral">
                  {permissionKey}
                </Badge>
              ))
            ) : (
              <Badge variant="neutral">No permissions assigned</Badge>
            )}
          </div>
        </div>
      ) : null}

      <FormStateMessage state={state} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Internal User"}
        </Button>
      </div>
    </form>
  );
}
