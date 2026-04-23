"use client";

import { useActionState } from "react";

import { saveNotificationGroupMemberAction } from "@/actions/notification-group-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NotificationGroupMemberFormProps = {
  groupId: string;
  groupName: string;
  member?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
  mode: "create" | "edit";
};

export function NotificationGroupMemberForm({
  groupId,
  groupName,
  member,
  mode,
}: NotificationGroupMemberFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveNotificationGroupMemberAction,
    EMPTY_ACTION_STATE,
  );
  const isCreate = mode === "create";

  return (
    <form action={formAction} className="space-y-3 rounded-[20px] border border-[var(--color-border)] bg-white p-4">
      <input type="hidden" name="groupId" value={groupId} />
      {member ? <input type="hidden" name="memberId" value={member.id} /> : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {isCreate ? "Add new member" : member?.name ?? "Member"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {groupName} is only an email container. Members are managed manually.
          </p>
        </div>
        {member ? (
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
              member.isActive
                ? "bg-[rgba(22,101,52,0.1)] text-[#166534]"
                : "bg-[rgba(107,114,128,0.12)] text-[var(--color-muted)]"
            }`}
          >
            {member.isActive ? "Active" : "Inactive"}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor={`${groupId}-${member?.id ?? "new"}-name`}>Name</Label>
          <Input
            id={`${groupId}-${member?.id ?? "new"}-name`}
            name="name"
            defaultValue={member?.name ?? ""}
            placeholder="Enter name"
            required
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor={`${groupId}-${member?.id ?? "new"}-email`}>Email</Label>
          <Input
            id={`${groupId}-${member?.id ?? "new"}-email`}
            name="email"
            type="email"
            defaultValue={member?.email ?? ""}
            placeholder="Enter email"
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="intent"
          value={isCreate ? "create" : "update"}
          disabled={isPending}
        >
          {isPending
            ? "Saving..."
            : isCreate
              ? "Add Member"
              : "Save Changes"}
        </Button>
        {member ? (
          <Button
            type="submit"
            name="intent"
            value={member.isActive ? "deactivate" : "activate"}
            variant="secondary"
            disabled={isPending}
          >
            {member.isActive ? "Remove Member" : "Restore Member"}
          </Button>
        ) : null}
      </div>

      <FormStateMessage state={state} />
    </form>
  );
}
