import Link from "next/link";

import { PageNotice } from "@/components/admin/page-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { requireAdminSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { RoleEditorForm } from "@/components/forms/role-editor-form";
import { UserRoleAssignmentRow } from "@/components/forms/user-role-assignment-row";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { getRoleManagementData } from "@/server/services/rbac-service";

type RolesPageProps = {
  searchParams: Promise<{
    roleId?: string;
    mode?: string;
    notice?: string;
    userId?: string;
  }>;
};

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const session = await requireAdminSession();

  if (!canManageRoles(session.user)) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="System"
          title="Roles & access control"
          description="You do not have permission to manage roles and permissions."
        />
      </PageShell>
    );
  }

  const params = await searchParams;
  const data = await getRoleManagementData();
  const createMode = params.mode === "create";
  const selectedRole = createMode
    ? null
    : data.roles.find((role) => role.id === params.roleId) ?? data.roles[0] ?? null;

  return (
    <PageShell>
      {params.notice === "role-created" ? (
        <PageNotice title="Role created successfully." body="The new role is now available for assignment." />
      ) : null}
      {params.notice === "role-updated" ? (
        <PageNotice title="Role updated successfully." body="Permission changes were saved and are now active." />
      ) : null}
      {params.notice === "user-role-updated" ? (
        <PageNotice title="User role updated successfully." body="The selected user now inherits the role permissions immediately." />
      ) : null}

      <PageHeader
        eyebrow="System"
        title="Roles & access control"
        description="Manage role definitions, granular permissions, and one-role-per-user assignments from a single governance screen."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/roles">Refresh</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/roles?mode=create">Create Role</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Roles" value={data.roles.length.toString()} />
        <SummaryTile
          label="Assigned Users"
          value={data.users.filter((user) => Boolean(user.roleAssignment)).length.toString()}
        />
        <SummaryTile
          label="System Roles"
          value={data.roles.filter((role) => role.isSystem).length.toString()}
        />
        <SummaryTile
          label="Permission Groups"
          value={data.permissionGroups.length.toString()}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 overflow-hidden">
            {data.roles.map((role) => {
              const active = selectedRole?.id === role.id;

              return (
                <Link
                  key={role.id}
                  href={`/admin/roles?roleId=${role.id}`}
                  className={`block min-w-0 overflow-hidden rounded-[20px] border px-4 py-4 transition-colors ${
                    active
                      ? "border-[rgba(49,19,71,0.18)] bg-[rgba(49,19,71,0.06)]"
                      : "border-[var(--color-border)] bg-[var(--color-panel-soft)] hover:bg-white"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        {role.name}
                      </p>
                      <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {role.key}
                      </p>
                    </div>
                    <Chip tone={role.isSystem ? "purple" : "neutral"} size="sm">
                      {role.isSystem ? "System" : "Custom"}
                    </Chip>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">
                    {role.description ?? "No description provided."}
                  </p>
                  <div className="mt-4 flex min-w-0 flex-wrap gap-2 text-xs">
                    <Chip tone="neutral" size="sm" className="text-[var(--color-ink)]">
                      {role.permissionCount} permissions
                    </Chip>
                    <Chip tone="neutral" size="sm" className="text-[var(--color-ink)]">
                      {role.userCount} users
                    </Chip>
                  </div>
                  {role.users.length > 0 ? (
                    <div className="mt-4 flex min-w-0 flex-wrap gap-2 overflow-hidden">
                      {role.users.slice(0, 3).map((user) => (
                        <span
                          key={user.id}
                          className="inline-flex max-w-full items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] whitespace-nowrap"
                        >
                          <span className="truncate">{user.name}</span>
                        </span>
                      ))}
                      {role.users.length > 3 ? (
                        <span className="inline-flex max-w-full items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)] whitespace-nowrap">
                          +{role.users.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{createMode ? "Create Role" : "Edit Role"}</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleEditorForm
              key={selectedRole?.id ?? "create"}
              mode={createMode ? "create" : "edit"}
              role={selectedRole}
              permissionGroups={data.permissionGroups}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>User Role Assignments</CardTitle>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Each user can have exactly one active role.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.users.map((user) => (
              <UserRoleAssignmentRow
                key={user.id}
                user={user}
                roles={data.roles}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
