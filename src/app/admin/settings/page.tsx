import Link from "next/link";

import { PageNotice } from "@/components/admin/page-notice";
import { requireAdminSession } from "@/lib/auth";
import { WORKFLOW_EMAIL_EVENT_OPTIONS } from "@/lib/constants";
import {
  getRoutingStrategyLabels,
  WORKFLOW_EMAIL_ROUTING_POLICIES,
} from "@/lib/workflow-routing";
import { canManageRoles, canManageWorkflowEmailSettings } from "@/lib/permissions";
import { NotificationGroupsManager } from "@/components/admin/notification-groups-manager";
import { InternalUserCreateForm } from "@/components/forms/internal-user-create-form";
import { WorkflowEmailSettingForm } from "@/components/forms/workflow-email-setting-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { getNotificationEmailGroups } from "@/server/services/notification-group-service";
import { getInternalUserManagementData } from "@/server/services/rbac-service";
import { getWorkflowEmailSettings } from "@/server/services/workflow-email-settings-service";

type SettingsPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await requireAdminSession();

  if (!canManageWorkflowEmailSettings(session.user)) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Settings"
          title="Workflow email routing"
          description="You do not have permission to manage workflow email routing settings."
        />
      </PageShell>
    );
  }

  const params = await searchParams;
  const showUserManagement = canManageRoles(session.user);
  const [settings, notificationGroups, internalUserManagement] = await Promise.all([
    getWorkflowEmailSettings(),
    getNotificationEmailGroups(),
    showUserManagement ? getInternalUserManagementData() : Promise.resolve(null),
  ]);

  return (
    <PageShell>
      {params.notice === "internal-user-created" ? (
        <PageNotice
          title="Internal user created successfully."
          body="The new user can sign in with the temporary password and will be required to change it on first login."
        />
      ) : null}

      <PageHeader
        eyebrow="Settings"
        title="Workflow email routing"
        description="Automatic routing now resolves recipients from the actual entity context first, such as project managers, evaluated employees, assignees, and the procurement chain. Use this page to manage manual To / CC overrides and the editable email groups that power workflow shortcuts."
      />

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
                  description={`${eventOption.description} Entity-specific routing is resolved automatically first; use explicit To and CC recipients below for intentional copies or overrides.`}
                  primaryToLabels={getRoutingStrategyLabels(policy.primaryTo)}
                  primaryCcLabels={getRoutingStrategyLabels(policy.primaryCc)}
                  enabled={setting.enabled}
                  includeDefaultTo={setting.includeDefaultTo}
                  includeDefaultCc={setting.includeDefaultCc}
                  toEmails={setting.toEmails}
                  ccEmails={setting.ccEmails}
                  notificationGroups={notificationGroups}
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

      <NotificationGroupsManager groups={notificationGroups} />

      {showUserManagement && internalUserManagement ? (
        <section id="internal-users" className="space-y-6 scroll-mt-28">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Internal Users
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                Finance and access onboarding
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
                Create internal finance users, assign a governed role, and keep
                payment-only access separate from vendor, project, certificate,
                and system administration rights.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/admin/roles">Open Roles & Permissions</Link>
            </Button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle>Create Internal User</CardTitle>
              </CardHeader>
              <CardContent>
                <InternalUserCreateForm roles={internalUserManagement.roles} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Internal Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {internalUserManagement.users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {user.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {user.title}
                        </p>
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          {user.email}
                        </p>
                      </div>
                      <div className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        {user.accessRoleName ?? user.legacyRole.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {user.paymentPermissionKeys.length > 0 ? (
                        user.paymentPermissionKeys.map((permissionKey) => (
                          <span
                            key={permissionKey}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-ink)]"
                          >
                            {permissionKey}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-muted)]">
                          No payment permissions
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
