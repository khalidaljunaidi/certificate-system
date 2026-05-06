"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const needsSessionProvider = pathname?.startsWith("/admin") ?? false;

  if (!needsSessionProvider) {
    return <>{children}</>;
  }

  return <SessionProvider>{children}</SessionProvider>;
}
