"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { changePasswordAction } from "@/actions/profile-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    EMPTY_ACTION_STATE,
  );
  const hasHandledSuccessRef = useRef(false);

  useEffect(() => {
    if (state.success !== "Password updated successfully." || hasHandledSuccessRef.current) {
      return;
    }

    hasHandledSuccessRef.current = true;

    void (async () => {
      try {
        await update({
          passwordChanged: true,
        });
      } catch (error) {
        console.error("[password-change] session update failed", error);
      }

      router.replace("/admin/dashboard?notice=password-updated");
    })();
  }, [router, state.success, update]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs leading-6 text-[var(--color-muted)]">
          Use at least 10 characters with uppercase, lowercase, and a number.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <FormStateMessage state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Updating password..." : "Update password"}
      </Button>
    </form>
  );
}
