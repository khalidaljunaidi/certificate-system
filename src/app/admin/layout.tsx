import { headers } from "next/headers";
import { after } from "next/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth";
import { canManageRoles, canManageWorkflowEmailSettings } from "@/lib/permissions";
import {
  markServerTimingStart,
  warnIfRouteTimingExceeded,
} from "@/lib/server-performance";
import {
  getUnreadNotificationCount,
} from "@/server/queries/notification-queries";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const startedAt = markServerTimingStart();
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-admin-pathname") ?? "/admin";

  after(() => {
    warnIfRouteTimingExceeded(pathname, startedAt);
  });

  const session = await requireAdminSession({
    allowPasswordChangeBypass: true,
  });
  const restrictedMode = !session.user.passwordChanged;
  const unreadCount = restrictedMode
    ? 0
    : await getUnreadNotificationCount(session.user.id);

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        title: session.user.title,
      }}
      unreadCount={unreadCount}
      notificationPreview={[]}
      restrictedMode={restrictedMode}
      canManageRoles={canManageRoles(session.user)}
      canManageSettings={canManageWorkflowEmailSettings(session.user)}
    >
      {children}
    </AdminShell>
  );
}
