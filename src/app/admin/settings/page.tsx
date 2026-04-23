import { requireAdminSession } from "@/lib/auth";
import { WORKFLOW_EMAIL_EVENT_OPTIONS } from "@/lib/constants";
import {
  getRoutingStrategyLabels,
  WORKFLOW_EMAIL_ROUTING_POLICIES,
} from "@/lib/workflow-routing";
import { canManageWorkflowEmailSettings } from "@/lib/permissions";
import { WorkflowEmailSettingForm } from "@/components/forms/workflow-email-setting-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkflowEmailSettings } from "@/server/services/workflow-email-settings-service";

export default async function SettingsPage() {
  const session = await requireAdminSession();

  if (!canManageWorkflowEmailSettings(session.user.role)) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Settings
        </p>
        <h1 className="text-4xl font-semibold text-[var(--color-ink)]">
          Workflow email routing
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
          You do not have permission to manage workflow email routing settings.
        </p>
      </div>
    );
  }

  const settings = await getWorkflowEmailSettings();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Settings
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
          Workflow email routing
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          Automatic routing now resolves recipients from the actual entity
          context first, such as project managers, evaluated employees,
          assignees, and the procurement chain. Use this page to manage fallback
          recipients and recovery routing only when entity-specific recipients
          are unavailable.
        </p>
      </section>

      <div className="grid gap-6">
        {WORKFLOW_EMAIL_EVENT_OPTIONS.map((eventOption) => {
          const setting = settings.find((item) => item.event === eventOption.value);
          const policy = WORKFLOW_EMAIL_ROUTING_POLICIES[eventOption.value];

          if (!setting) {
            return null;
          }

          return (
            <Card key={eventOption.value}>
              <CardHeader>
                <CardTitle>{eventOption.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <WorkflowEmailSettingForm
                  event={setting.event}
                  title={eventOption.label}
                  description={policy.summary}
                  primaryToLabels={getRoutingStrategyLabels(policy.primaryTo)}
                  primaryCcLabels={getRoutingStrategyLabels(policy.primaryCc)}
                  fallbackToLabels={getRoutingStrategyLabels(policy.fallbackTo)}
                  fallbackCcLabels={getRoutingStrategyLabels(policy.fallbackCc)}
                  enabled={setting.enabled}
                  includeDefaultTo={setting.includeDefaultTo}
                  includeDefaultCc={setting.includeDefaultCc}
                  toEmails={setting.toEmails}
                  ccEmails={setting.ccEmails}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  Last updated:{" "}
                  {setting.updatedAt
                    ? `${setting.updatedAt.toLocaleDateString("en-GB")} by ${
                        setting.updatedByName ?? "System"
                      }`
                    : "Using automatic entity routing with no custom fallback changes"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
