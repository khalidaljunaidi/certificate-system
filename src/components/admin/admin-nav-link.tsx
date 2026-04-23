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
        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[rgba(49,19,71,0.1)] text-[var(--color-primary)] shadow-[inset_0_0_0_1px_rgba(49,19,71,0.08)]"
          : "text-[var(--color-muted)] hover:bg-[rgba(49,19,71,0.05)] hover:text-[var(--color-ink)]",
      )}
    >
      {label}
    </Link>
  );
}
