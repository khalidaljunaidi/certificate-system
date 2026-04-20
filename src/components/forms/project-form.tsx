"use client";

import { useActionState } from "react";

import { createProjectAction } from "@/actions/project-actions";
import { EMPTY_ACTION_STATE } from "@/actions/utils";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { FormStateMessage } from "@/components/forms/form-state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ProjectForm() {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="projectCode">Project Code</Label>
            <Input id="projectCode" name="projectCode" required />
          </div>
          <div>
            <Label htmlFor="projectName">Project Name</Label>
            <Input id="projectName" name="projectName" required />
          </div>
          <div>
            <Label htmlFor="projectLocation">Project Location</Label>
            <Input id="projectLocation" name="projectLocation" required />
          </div>
          <div>
            <Label htmlFor="clientName">Client Name</Label>
            <Input id="clientName" name="clientName" required />
          </div>
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" name="endDate" type="date" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="ACTIVE">
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <FormStateMessage state={state} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
