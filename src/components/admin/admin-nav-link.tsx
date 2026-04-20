"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AdminNavLink({
  href,
  label,
  prefetch = false,
}: {
  href: string;
  label: string;
  prefetch?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[rgba(49,19,71,0.12)] text-[var(--color-primary)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-panel-soft)] hover:text-[var(--color-ink)]",
      )}
    >
      {label}
    </Link>
  );
}
