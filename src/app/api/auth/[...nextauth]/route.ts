import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const nextAuthHandler = NextAuth(authOptions);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthRouteHandler = (
  request: Request,
  context: unknown,
) => Promise<Response>;

async function handleAuthRequest(request: Request, context: unknown) {
  const authHandler = nextAuthHandler as AuthRouteHandler;

  try {
    return await authHandler(request, context);
  } catch (error) {
    console.error("[auth-route] unexpected auth handler error", error);

    const pathname = new URL(request.url).pathname;

    if (pathname.endsWith("/providers")) {
      return NextResponse.json(
        {
          error: "AUTH_ROUTE_ERROR",
          message: "Unable to load auth providers.",
        },
        { status: 500 },
      );
    }

    if (pathname.endsWith("/session")) {
      return NextResponse.json(
        {
          error: "AUTH_ROUTE_ERROR",
          message: "Unable to load the current session.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "AUTH_ROUTE_ERROR",
        message: "Authentication route failed.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, context: unknown) {
  return handleAuthRequest(request, context);
}

export async function POST(request: Request, context: unknown) {
  return handleAuthRequest(request, context);
}
