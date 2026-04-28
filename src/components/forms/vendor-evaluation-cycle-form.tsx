"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createVendorEvaluationCycleAction } from "@/actions/vendor-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EXECUTIVE_OVERSIGHT_NAME } from "@/lib/constants";

export function VendorEvaluationCycleForm({
  vendorId,
  availableSourceProjects,
  defaultYear,
}: {
  vendorId: string;
  availableSourceProjects: Array<{
    id: string;
    projectCode: string;
    projectName: string;
  }>;
  defaultYear: number;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createVendorEvaluationCycleAction,
    EMPTY_ACTION_STATE,
  );
  const [projectManagerEmail, setProjectManagerEmail] = useState("");

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vendorId" value={vendorId} />
      <div>
        <Label htmlFor="evaluation-source-project">Source Project</Label>
        <Select
          id="evaluation-source-project"
          name="sourceProjectId"
          defaultValue={availableSourceProjects[0]?.id ?? ""}
          disabled={isPending}
        >
          {availableSourceProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectCode} | {project.projectName}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="evaluation-year">Evaluation Year</Label>
        <Input
          id="evaluation-year"
          name="year"
          type="number"
          defaultValue={String(defaultYear)}
          min={2024}
          max={2100}
          disabled={isPending}
        />
      </div>

      <div>
        <Label htmlFor="project-manager-email">Project Manager Email</Label>
        <Input
          id="project-manager-email"
          name="projectManagerEmail"
          type="email"
          placeholder="pm@thegatheringksa.com"
          value={projectManagerEmail}
          onChange={(event) => setProjectManagerEmail(event.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="rounded-[22px] border border-[rgba(49,19,71,0.12)] bg-[rgba(49,19,71,0.04)] px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]">
          Recipient Preview
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Two separate evaluation requests will be sent. One goes to the
          Project Manager for the selected project, and one goes to the
          Executive Oversight recipient. Fallback routing applies only if one
          of these entity-level recipients cannot be resolved.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            Project Manager: {projectManagerEmail || "Enter PM email"}
          </span>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            Executive Oversight: {EXECUTIVE_OVERSIGHT_NAME}
          </span>
        </div>
      </div>

      <FormStateMessage state={state.error ? state : EMPTY_ACTION_STATE} />

      <Button type="submit" disabled={isPending || availableSourceProjects.length === 0}>
        {isPending ? "Sending..." : "Request Annual Evaluation"}
      </Button>
    </form>
  );
}
