"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
