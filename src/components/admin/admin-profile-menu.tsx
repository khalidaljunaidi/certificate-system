"use client";

import Link from "next/link";
import {
  ChevronDown,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/admin/sign-out-button";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminProfileMenu({
  user,
  canManageRoles = false,
  canManageSettings = false,
}: {
  user: {
    name: string;
    email: string;
    title: string;
  };
  canManageRoles?: boolean;
  canManageSettings?: boolean;
}) {
  const initials = getInitials(user.name);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const showGovernanceSection = canManageSettings || canManageRoles;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white/88 px-3 py-2 text-left shadow-[0_12px_28px_rgba(17,17,17,0.08)] transition-colors hover:bg-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(49,19,71,0.1)] text-xs font-semibold text-[var(--color-primary)]">
          {initials}
        </span>
        <span className="hidden min-w-0 max-w-[11rem] xl:block">
          <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
            {user.name}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="tg-floating-panel absolute right-0 z-50 mt-3 w-[22rem] p-4"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="rounded-[20px] border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_12px_24px_rgba(17,17,17,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Account
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{user.name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-primary)]">
              {user.title}
            </p>
            <p className="mt-2 break-words text-sm text-[var(--color-muted)]">
              {user.email}
            </p>
          </div>

          <div className="mt-5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Account
            </p>
            <div className="mt-2 space-y-1">
              <Link
                href="/admin/profile"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm transition-colors hover:bg-[var(--color-panel-soft)]"
              >
                <UserCircle2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--color-ink)]">
                    Profile
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    Review account access and security settings.
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {showGovernanceSection ? (
            <div className="mt-5">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Governance
              </p>
              <div className="mt-2 space-y-1">
                {canManageSettings ? (
                  <Link
                    href="/admin/settings"
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm transition-colors hover:bg-[var(--color-panel-soft)]"
                  >
                    <Settings className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-ink)]">
                        Settings
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted)]">
                        Manage workflow routing and platform controls.
                      </p>
                    </div>
                  </Link>
                ) : null}
                {canManageRoles ? (
                  <>
                    <Link
                      href="/admin/roles"
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm transition-colors hover:bg-[var(--color-panel-soft)]"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-ink)]">
                          Roles & Permissions
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted)]">
                          Manage access roles and permission assignments.
                        </p>
                      </div>
                    </Link>
                    <Link
                      href="/admin/system-errors"
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm transition-colors hover:bg-[var(--color-panel-soft)]"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-ink)]">
                          System Errors
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted)]">
                          Review logged issues and platform exceptions.
                        </p>
                      </div>
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <SignOutButton
              compact
              className={cn(
                "rounded-[16px] px-3 py-3 text-[var(--color-ink)] hover:bg-[var(--color-panel-soft)]",
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
