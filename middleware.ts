import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((cookieName) =>
    Boolean(request.cookies.get(cookieName)?.value),
  );

  if (pathname === "/admin/login") {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isSecurityRoute = pathname.startsWith("/admin/profile/security");
  const passwordChanged = token.passwordChanged !== false;

  if (!passwordChanged && !isSecurityRoute) {
    const securityUrl = new URL(
      "/admin/profile/security?notice=password-change-required",
      request.url,
    );
    return NextResponse.redirect(securityUrl);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
