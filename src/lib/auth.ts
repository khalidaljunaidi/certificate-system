import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/lib/types";

async function getAuthenticatedUserById(
  userId: string,
): Promise<AuthenticatedUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
      passwordChanged: true,
      passwordUpdatedAt: true,
      isActive: true,
    },
  });
}

export const authOptions: NextAuthOptions = {
  // next-auth v4 requires JWT sessions when credentials auth is the only
  // configured provider.
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Procurement Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          title: user.title,
          role: user.role,
          locale: user.locale,
          isActive: user.isActive,
          passwordChanged: user.passwordChanged,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.locale = user.locale;
        token.isActive = user.isActive;
        token.title = user.title;
        token.passwordChanged = user.passwordChanged;
        token.name = user.name ?? user.email ?? "Procurement User";
        token.email = user.email ?? "";
      }

      if (trigger === "update") {
        const nextPasswordChanged = (session as { passwordChanged?: boolean } | undefined)
          ?.passwordChanged;

        if (typeof nextPasswordChanged === "boolean") {
          token.passwordChanged = nextPasswordChanged;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        session.user.role = token.role;
        session.user.locale = token.locale;
        session.user.isActive = token.isActive;
        session.user.title = token.title ?? "";
        session.user.passwordChanged = token.passwordChanged ?? false;
        session.user.name = token.name ?? token.email ?? "Procurement User";
        session.user.email = token.email ?? "";
      }

      return session;
    },
  },
};

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentAuthenticatedUser() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return null;
  }

  return getAuthenticatedUserById(session.user.id);
}

export async function requireAdminSession(options?: {
  allowPasswordChangeBypass?: boolean;
}) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const activeUser = await getAuthenticatedUserById(session.user.id);

  if (!activeUser?.isActive) {
    redirect("/admin/login");
  }

  if (!activeUser.passwordChanged && !options?.allowPasswordChangeBypass) {
    redirect("/admin/profile/security?notice=password-change-required");
  }

  return {
    ...session,
    user: {
      ...session.user,
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: activeUser.role,
      title: activeUser.title,
      passwordChanged: activeUser.passwordChanged,
    },
  };
}

export async function redirectSignedInUser() {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return null;
  }

  if (!user.passwordChanged) {
    redirect("/admin/profile/security?notice=password-change-required");
  }

  redirect("/admin/dashboard");
}
