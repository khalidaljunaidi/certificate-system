"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";

import { updateProjectStatusAction } from "@/actions/project-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";

export function ProjectStatusForm({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: ProjectStatus;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateProjectStatusAction,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <Label htmlFor="project-status">Project Status</Label>
        <Select
          id="project-status"
          name="status"
          defaultValue={currentStatus}
          disabled={isPending}
        >
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Updating..." : "Update Status"}
      </Button>
    </form>
  );
}
