import type { AppLocale, UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      accessRoleId: string | null;
      accessRoleKey: string | null;
      accessRoleName: string | null;
      permissions: string[];
      locale: AppLocale;
      isActive: boolean;
      title: string;
      passwordChanged: boolean;
      name: string;
      email: string;
    };
  }

  interface User {
    role: UserRole;
    locale: AppLocale;
    isActive: boolean;
    title: string;
    passwordChanged: boolean;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    accessRoleId?: string | null;
    accessRoleKey?: string | null;
    accessRoleName?: string | null;
    permissions?: string[];
    locale: AppLocale;
    isActive: boolean;
    title: string;
    passwordChanged: boolean;
    name: string;
    email: string;
  }
}
