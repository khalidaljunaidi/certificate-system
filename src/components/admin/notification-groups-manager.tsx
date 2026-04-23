import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowEmailGroupView } from "@/lib/types";
import { NotificationGroupMemberForm } from "@/components/forms/notification-group-member-form";

export function NotificationGroupsManager({
  groups,
}: {
  groups: WorkflowEmailGroupView[];
}) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Notification Groups
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
          Manual email groups
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          These groups are only email containers. Add, edit, or remove members
          manually without linking them to application user accounts.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.key} className="overflow-hidden">
            <CardHeader className="space-y-2 border-b border-[var(--color-border)] bg-[var(--color-panel-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                    {group.description}
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                  {group.activeMembers.length} active
                  {group.inactiveMembers.length > 0
                    ? ` • ${group.inactiveMembers.length} inactive`
                    : ""}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="rounded-[22px] border border-dashed border-[var(--color-border)] bg-[rgba(49,19,71,0.03)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Active members
                </p>
                <div className="mt-3 space-y-3">
                  {group.activeMembers.length > 0 ? (
                    group.activeMembers.map((member) => (
                      <NotificationGroupMemberForm
                        key={member.id}
                        groupId={group.id}
                        groupName={group.name}
                        member={member}
                        mode="edit"
                      />
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-[var(--color-muted)]">
                      No active members are configured yet.
                    </p>
                  )}
                </div>
              </div>

              {group.inactiveMembers.length > 0 ? (
                <details className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Inactive members
                  </summary>
                  <div className="mt-4 space-y-3">
                    {group.inactiveMembers.map((member) => (
                      <NotificationGroupMemberForm
                        key={member.id}
                        groupId={group.id}
                        groupName={group.name}
                        member={member}
                        mode="edit"
                      />
                    ))}
                  </div>
                </details>
              ) : null}

              <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Add member
                </p>
                <div className="mt-3">
                  <NotificationGroupMemberForm
                    groupId={group.id}
                    groupName={group.name}
                    mode="create"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
