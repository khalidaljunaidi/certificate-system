import { AdminNoticeToast } from "@/components/admin/admin-notice-toast";
import { AdminHeaderNavigation } from "@/components/admin/admin-header-navigation";
import { ModuleFooter } from "@/components/layout/module-footer";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import type { NotificationItem } from "@/lib/types";

export function AdminShell({
  user,
  unreadCount,
  notificationPreview,
  restrictedMode = false,
  canManageRoles = false,
  canManageSettings = false,
  children,
}: {
  user: {
    name: string;
    email: string;
    title: string;
  };
  unreadCount: number;
  notificationPreview: NotificationItem[];
  restrictedMode?: boolean;
  canManageRoles?: boolean;
  canManageSettings?: boolean;
  children: React.ReactNode;
}) {
  const navItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (item.href === "/admin/profile") {
      return false;
    }

    if (item.href === "/admin/roles" && !canManageRoles) {
      return false;
    }

    if (item.href === "/admin/system-errors" && !canManageRoles) {
      return false;
    }

    if (item.href === "/admin/settings" && !canManageSettings) {
      return false;
    }

    return true;
  });

  return (
    <div className="theme-admin flex min-h-screen flex-col bg-[var(--page-bg)] text-[var(--text-main)]">
      <AdminNoticeToast />
      <AdminHeaderNavigation
        user={user}
        navItems={navItems}
        unreadCount={unreadCount}
        notificationPreview={notificationPreview}
        restrictedMode={restrictedMode}
        canManageRoles={canManageRoles}
        canManageSettings={canManageSettings}
      />
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-6 py-8">
        {children}
      </main>
      <ModuleFooter className="px-6 pb-8" />
    </div>
  );
}
