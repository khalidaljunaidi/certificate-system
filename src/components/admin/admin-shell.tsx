import Link from "next/link";

import { AdminNoticeToast } from "@/components/admin/admin-notice-toast";
import { CompanyLogo } from "@/components/brand/company-logo";
import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { NotificationBell } from "@/components/admin/notification-bell";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { ModuleFooter } from "@/components/layout/module-footer";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import type { NotificationItem } from "@/lib/types";

export function AdminShell({
  user,
  unreadCount,
  notificationPreview,
  restrictedMode = false,
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
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <AdminNoticeToast />
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[rgba(251,248,244,0.92)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="tg-reveal flex items-center gap-4">
            <CompanyLogo width={56} height={56} priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                The Gathering KSA
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--color-ink)]">
                Certificate Operations
              </p>
            </div>
          </div>
          {restrictedMode ? (
            <div className="hidden rounded-full border border-[rgba(215,132,57,0.18)] bg-[rgba(215,132,57,0.08)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] lg:block">
              Password update required
            </div>
          ) : (
            <nav className="hidden items-center gap-2 lg:flex">
              {ADMIN_NAV_ITEMS.map((item) => (
                <AdminNavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          )}
          <div className="tg-reveal tg-delay-1 flex items-center gap-3">
            {!restrictedMode ? (
              <NotificationBell
                key={`${unreadCount}:${notificationPreview.map((item) => item.id).join(",")}`}
                count={unreadCount}
                notifications={notificationPreview}
              />
            ) : null}
            {!restrictedMode ? (
              <Link
                href="/admin/profile"
                prefetch={false}
                className="tg-surface-live hidden rounded-full border border-[var(--color-border)] bg-white px-4 py-2 md:block"
              >
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {user.name}
                </p>
                <p className="text-xs font-medium text-[var(--color-primary)]">
                  {user.title}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
              </Link>
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
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <ModuleFooter className="px-6 pb-8" />
    </div>
  );
}
