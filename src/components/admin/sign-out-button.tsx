"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "sm" : "sm"}
      className={compact ? `w-full justify-start gap-2 ${className ?? ""}` : `gap-2 ${className ?? ""}`}
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      <LogOut className="h-4 w-4" />
      {compact ? "Sign out" : "Sign out"}
    </Button>
  );
}
