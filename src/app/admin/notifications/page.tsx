import { markAllNotificationsReadAction } from "@/actions/notification-actions";
import { NotificationList } from "@/components/admin/notification-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { getNotificationsForUser } from "@/server/queries/notification-queries";

export default async function NotificationsPage() {
  const session = await requireAdminSession();
  const notifications = await getNotificationsForUser(session.user.id, {
    limit: 50,
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Notifications
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            Internal notification center
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
            Review workflow alerts generated across project, approval, issue, and
            revocation events. The visible list is capped for responsiveness.
          </p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="secondary">
            Mark all as read
          </Button>
        </form>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationList notifications={notifications} />
        </CardContent>
      </Card>
    </div>
  );
}
