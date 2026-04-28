"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function AdminNavLink({
  href,
  label,
  prefetch = false,
  className,
}: {
  href: string;
  label: string;
  prefetch?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-[rgba(49,19,71,0.045)] text-[var(--color-ink)]"
          : "text-[var(--color-muted)] hover:bg-[rgba(49,19,71,0.035)] hover:text-[var(--color-ink)]",
        className,
      )}
    >
      <span className="relative z-10">{label}</span>
      <span
        className={cn(
          "pointer-events-none absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[var(--color-primary)] transition-all duration-200",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
        )}
      />
    </Link>
  );
}
