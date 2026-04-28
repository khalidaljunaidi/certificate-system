import { markAllNotificationsReadAction } from "@/actions/notification-actions";
import { NotificationList } from "@/components/admin/notification-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { requireAdminSession } from "@/lib/auth";
import { getNotificationsForUser } from "@/server/queries/notification-queries";

export default async function NotificationsPage() {
  const session = await requireAdminSession();
  const notifications = await getNotificationsForUser(session.user.id, {
    limit: 50,
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Notifications"
        title="Internal notification center"
        description="Review workflow alerts generated across project, approval, issue, and revocation events. The visible list is capped for responsiveness."
        actions={
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary">
              Mark all as read
            </Button>
          </form>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationList notifications={notifications} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
