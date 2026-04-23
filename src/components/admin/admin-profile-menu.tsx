"use client";

import Link from "next/link";
import { ChevronDown, Settings, ShieldCheck, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/admin/sign-out-button";

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
}: {
  user: {
    name: string;
    email: string;
    title: string;
  };
}) {
  const initials = getInitials(user.name);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
        className="flex cursor-pointer items-center gap-3 rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-left shadow-[0_8px_24px_rgba(17,17,17,0.06)] transition-colors hover:bg-[var(--color-panel-soft)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(49,19,71,0.1)] text-xs font-semibold text-[var(--color-primary)]">
          {initials}
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
            {user.name}
          </span>
          <span className="block truncate text-xs text-[var(--color-muted)]">
            {user.title}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-30 mt-3 w-[18rem] rounded-[24px] border border-[var(--color-border)] bg-white p-4 shadow-[0_24px_60px_rgba(17,17,17,0.14)]"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="rounded-[20px] bg-[var(--color-panel-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{user.name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-primary)]">
              {user.title}
            </p>
            <p className="mt-2 break-words text-sm text-[var(--color-muted)]">
              {user.email}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <Link
              href="/admin/profile"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-panel-soft)]"
            >
              <UserCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
              Profile & Security
            </Link>
            <Link
              href="/admin/settings"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-panel-soft)]"
            >
              <Settings className="h-4 w-4 text-[var(--color-primary)]" />
              Routing Settings
            </Link>
            <Link
              href="/admin/notifications"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-panel-soft)]"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
              Notification Center
            </Link>
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <SignOutButton compact />
          </div>
        </div>
      ) : null}
    </div>
  );
}
