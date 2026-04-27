import Link from "next/link";

import { AdminNoticeToast } from "@/components/admin/admin-notice-toast";
import { AdminProfileMenu } from "@/components/admin/admin-profile-menu";
import { CompanyLogo } from "@/components/brand/company-logo";
import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { NotificationBell } from "@/components/admin/notification-bell";
import { ModuleFooter } from "@/components/layout/module-footer";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import type { NotificationItem } from "@/lib/types";

export function AdminShell({
  user,
  unreadCount,
  notificationPreview,
  restrictedMode = false,
  canManageRoles = false,
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
  children: React.ReactNode;
}) {
  const navItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (item.href === "/admin/profile") {
      return false;
    }

    if (item.href === "/admin/roles" && !canManageRoles) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <AdminNoticeToast />
      <header className="sticky top-0 z-20 border-b border-[rgba(17,17,17,0.06)] bg-[rgba(251,248,244,0.94)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(240px,320px)_1fr_auto] items-center gap-4 px-6 py-3">
          <Link
            href="/admin/dashboard"
            className="tg-reveal flex min-w-0 items-center gap-3 rounded-[24px] border border-[rgba(17,17,17,0.06)] bg-white/85 px-3 py-2 shadow-[0_14px_30px_rgba(17,17,17,0.05)] transition-colors hover:border-[var(--color-border)] hover:bg-white"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[var(--color-primary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_12px_24px_rgba(49,19,71,0.22)]">
              <CompanyLogo
                width={34}
                height={34}
                priority
                className="brightness-0 invert"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                The Gathering KSA
              </p>
              <p className="mt-1 text-sm font-semibold leading-tight text-[var(--color-ink)]">
                TG Certificate System
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                Vendor, project, and certificate governance
              </p>
            </div>
          </Link>
          {restrictedMode ? (
            <div className="justify-self-center rounded-full border border-[rgba(215,132,57,0.18)] bg-[rgba(215,132,57,0.08)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]">
              Password update required
            </div>
          ) : (
            <div className="flex justify-center">
              <nav className="hidden items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/90 px-2 py-1 shadow-[0_10px_24px_rgba(17,17,17,0.05)] lg:flex">
                {navItems.map((item) => (
                  <AdminNavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </nav>
            </div>
          )}
          <div className="tg-reveal tg-delay-1 flex items-center gap-2 justify-self-end">
            {!restrictedMode ? (
              <NotificationBell
                key={`${unreadCount}:${notificationPreview.map((item) => item.id).join(",")}`}
                count={unreadCount}
                notifications={notificationPreview}
              />
            ) : null}
            {!restrictedMode ? (
              <AdminProfileMenu user={user} />
            ) : (
              <div className="hidden rounded-full border border-[var(--color-border)] bg-white px-4 py-2 md:block">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {user.name}
                </p>
                <p className="text-xs font-medium text-[var(--color-primary)]">
                  {user.title}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <ModuleFooter className="px-6 pb-8" />
    </div>
  );
}
