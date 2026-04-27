import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import {
  getNotificationPreviewForUser,
  getUnreadNotificationCount,
} from "@/server/queries/notification-queries";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession({
    allowPasswordChangeBypass: true,
  });
  const restrictedMode = !session.user.passwordChanged;
  const [unreadCount, notificationPreview] = restrictedMode
    ? [0, []]
    : await Promise.all([
        getUnreadNotificationCount(session.user.id),
        getNotificationPreviewForUser(session.user.id),
      ]);

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        title: session.user.title,
      }}
      unreadCount={unreadCount}
      notificationPreview={notificationPreview}
      restrictedMode={restrictedMode}
      canManageRoles={canManageRoles(session.user)}
    >
      {children}
    </AdminShell>
  );
}
