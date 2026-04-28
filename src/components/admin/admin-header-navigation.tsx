"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { AdminProfileMenu } from "@/components/admin/admin-profile-menu";
import { NotificationBell } from "@/components/admin/notification-bell";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { CompanyLogo } from "@/components/brand/company-logo";
import { APP_SHORT_NAME } from "@/lib/constants";
import type { NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIMARY_MODULES = [
  "/admin/dashboard",
  "/admin/projects",
  "/admin/vendors",
  "/admin/payments",
  "/admin/tasks",
  "/admin/performance",
  "/admin/certificates",
] as const;

type NavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DrawerNavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-sm transition-colors",
        active
          ? "border-[rgba(49,19,71,0.12)] bg-[rgba(49,19,71,0.06)] text-[var(--color-primary)]"
          : "border-transparent bg-white/72 text-[var(--color-muted)] hover:border-[rgba(49,19,71,0.1)] hover:bg-white hover:text-[var(--color-ink)]",
      )}
    >
      <span className="font-medium">{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}

export function AdminHeaderNavigation({
  user,
  navItems,
  unreadCount,
  notificationPreview,
  restrictedMode = false,
  canManageRoles = false,
  canManageSettings = false,
}: {
  user: {
    name: string;
    email: string;
    title: string;
  };
  navItems: NavItem[];
  unreadCount: number;
  notificationPreview: NotificationItem[];
  restrictedMode?: boolean;
  canManageRoles?: boolean;
  canManageSettings?: boolean;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const primaryNavItems = navItems.filter((item) =>
    PRIMARY_MODULES.includes(item.href as (typeof PRIMARY_MODULES)[number]),
  );
  const drawerItems = navItems.filter((item) => item.href !== "/admin/profile");
  const initials = getInitials(user.name);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    function handlePointerDown(event: PointerEvent) {
      if (!drawerRef.current) {
        return;
      }

      if (!drawerRef.current.contains(event.target as Node)) {
        setDrawerOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.removeProperty("overflow");
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[rgba(17,17,17,0.05)] bg-[rgba(251,248,244,0.88)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
          <div className="tg-header-shell flex items-center justify-between gap-4 rounded-[28px] px-4 py-3 sm:px-5 xl:gap-6 xl:px-6">
            <Link
              href="/admin/dashboard"
              className="flex min-w-0 flex-1 items-center gap-3 xl:max-w-[16rem] 2xl:max-w-[18rem]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[var(--color-primary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_16px_30px_rgba(49,19,71,0.18)]">
                <CompanyLogo
                  width={34}
                  height={34}
                  priority
                  className="brightness-0 invert"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  THE GATHERING KSA
                </p>
                <p className="text-sm font-semibold leading-tight text-[var(--color-ink)] sm:text-base">
                  {APP_SHORT_NAME}
                </p>
              </div>
            </Link>

            {restrictedMode ? (
              <div className="hidden xl:flex xl:flex-1 xl:justify-center">
                <div className="rounded-full border border-[rgba(215,132,57,0.18)] bg-[rgba(215,132,57,0.08)] px-4 py-2 text-sm font-medium text-[var(--color-primary)]">
                  Password update required
                </div>
              </div>
            ) : (
              <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex 2xl:gap-1">
                {primaryNavItems.map((item) => (
                  <AdminNavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </nav>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {restrictedMode ? (
                <div className="hidden items-center gap-3 rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white/84 px-3 py-2 shadow-[0_12px_28px_rgba(17,17,17,0.06)] sm:flex">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(49,19,71,0.08)] text-xs font-semibold text-[var(--color-primary)]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {user.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">{user.title}</p>
                  </div>
                </div>
              ) : (
                <>
                  <NotificationBell
                    key={`${unreadCount}:${notificationPreview.map((item) => item.id).join(",")}`}
                    count={unreadCount}
                    notifications={notificationPreview}
                  />
                  <div className="hidden xl:block">
                    <AdminProfileMenu
                      user={user}
                      canManageRoles={canManageRoles}
                      canManageSettings={canManageSettings}
                    />
                  </div>
                </>
              )}

              {!restrictedMode ? (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white/88 text-[var(--color-ink)] shadow-[0_12px_28px_rgba(17,17,17,0.08)] transition-colors hover:bg-white xl:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[rgba(17,17,17,0.28)] backdrop-blur-[2px]" />
          <div
            ref={drawerRef}
            className="absolute inset-y-0 right-0 flex w-full max-w-[24rem] flex-col border-l border-[rgba(17,17,17,0.08)] bg-[rgba(255,253,249,0.98)] px-4 py-4 shadow-[-18px_0_48px_rgba(17,17,17,0.14)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                  Navigation
                </p>
                <p className="text-base font-semibold text-[var(--color-ink)]">
                  {APP_SHORT_NAME}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white/84 p-4 shadow-[0_18px_36px_rgba(17,17,17,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(49,19,71,0.08)] text-sm font-semibold text-[var(--color-primary)]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                    {user.name}
                  </p>
                  <p className="truncate text-xs uppercase tracking-[0.16em] text-[var(--color-primary)]">
                    {user.title}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto pr-1">
              <div className="space-y-5">
                <div>
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    Pages
                  </p>
                  <div className="mt-3 space-y-2">
                    {drawerItems.map((item) => (
                      <DrawerNavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        onNavigate={() => setDrawerOpen(false)}
                      />
                    ))}
                    <DrawerNavLink
                      href="/admin/profile"
                      label="Profile"
                      onNavigate={() => setDrawerOpen(false)}
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[rgba(17,17,17,0.08)] bg-white/84 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    Account
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    Access your account page and sign out from the platform.
                  </p>
                  <div className="mt-4">
                    <SignOutButton compact className="rounded-[16px] px-3 py-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
