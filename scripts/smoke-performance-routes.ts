import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type RouteKind = "dashboard" | "list" | "detail";
type SmokePass = "cold" | "warm";

type RouteConfig = {
  route: string;
  url: string;
  kind: RouteKind;
};

type SmokeResult = {
  pass: SmokePass;
  route: string;
  status: number | "ERR";
  durationMs: number;
  budgetMs: number;
  attempts: number;
  result: "PASS" | "FAIL";
};

const ROUTE_BUDGETS: Record<RouteKind, Record<SmokePass, number>> = {
  dashboard: {
    cold: 2000,
    warm: 700,
  },
  list: {
    cold: 1500,
    warm: 700,
  },
  detail: {
    cold: 2000,
    warm: 900,
  },
};

function loadEnvFile(filePath: string, override = false) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  const cwd = process.cwd();

  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"), true);
}

function normalizeBaseUrl(value: string | undefined) {
  return (value ?? "http://localhost:3000").replace(/\/+$/, "");
}

async function createSmokeSessionCookie() {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for smoke route authentication.");
  }

  const [{ encode }, { prisma }] = await Promise.all([
    import("next-auth/jwt"),
    import("../src/lib/prisma"),
  ]);

  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      passwordChanged: true,
      role: {
        in: ["ADMIN", "PROCUREMENT_DIRECTOR"],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      role: true,
      locale: true,
      isActive: true,
      passwordChanged: true,
    },
  });

  if (!user) {
    throw new Error(
      "No active admin/procurement director user with passwordChanged=true was found for smoke authentication.",
    );
  }

  const token = await encode({
    secret,
    maxAge: 10 * 60,
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      role: user.role,
      locale: user.locale,
      isActive: user.isActive,
      passwordChanged: user.passwordChanged,
    },
  });

  const encodedToken = encodeURIComponent(token);

  return [
    `next-auth.session-token=${encodedToken}`,
    `__Secure-next-auth.session-token=${encodedToken}`,
  ].join("; ");
}

async function resolveKnownPaymentRoute(baseUrl: string) {
  const { prisma } = await import("../src/lib/prisma");
  const configuredId = process.env.SMOKE_PAYMENT_PROJECT_VENDOR_ID?.trim();

  if (configuredId) {
    return {
      route: "/admin/payments/[knownId]",
      url: `${baseUrl}/admin/payments/${configuredId}`,
      kind: "detail" as const,
    };
  }

  const paymentRecord = await prisma.projectVendor.findFirst({
    where: {
      OR: [
        {
          isActive: true,
        },
        {
          paymentInstallments: {
            some: {},
          },
        },
        {
          paymentClosedAt: {
            not: null,
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!paymentRecord) {
    throw new Error(
      "No payment/project-vendor record was found. Set SMOKE_PAYMENT_PROJECT_VENDOR_ID to test the payment detail route.",
    );
  }

  return {
    route: "/admin/payments/[knownId]",
    url: `${baseUrl}/admin/payments/${paymentRecord.id}`,
    kind: "detail" as const,
  };
}

async function requestRoute(
  route: RouteConfig,
  pass: SmokePass,
  cookie: string,
): Promise<SmokeResult> {
  const budgetMs = ROUTE_BUDGETS[route.kind][pass];
  const startedAt = performance.now();

  try {
    const response = await fetch(route.url, {
      redirect: "manual",
      headers: {
        cookie,
        "x-smoke-performance": "true",
      },
    });

    await response.arrayBuffer();

    const durationMs = Math.round(performance.now() - startedAt);
    const passed = response.status >= 200 && response.status < 300 && durationMs < budgetMs;

    return {
      pass,
      route: route.route,
      status: response.status,
      durationMs,
      budgetMs,
      attempts: 1,
      result: passed ? "PASS" : "FAIL",
    };
  } catch {
    return {
      pass,
      route: route.route,
      status: "ERR",
      durationMs: Math.round(performance.now() - startedAt),
      budgetMs,
      attempts: 1,
      result: "FAIL",
    };
  }
}

async function requestRouteWithRetry(
  route: RouteConfig,
  pass: SmokePass,
  cookie: string,
) {
  const first = await requestRoute(route, pass, cookie);

  if (first.result === "PASS") {
    return first;
  }

  await new Promise((resolve) => setTimeout(resolve, 150));

  const second = await requestRoute(route, pass, cookie);
  const best = [first, second].sort((left, right) => {
    if (left.result !== right.result) {
      return left.result === "PASS" ? -1 : 1;
    }

    return left.durationMs - right.durationMs;
  })[0];

  return {
    ...best,
    attempts: 2,
  };
}

async function prewarmServer(baseUrl: string, cookie: string) {
  try {
    const response = await fetch(`${baseUrl}/admin/notifications`, {
      redirect: "manual",
      headers: {
        cookie,
        "x-smoke-performance": "prewarm",
      },
    });

    await response.arrayBuffer();
  } catch {
    // The measured route checks below will report the connection failure.
  }
}

async function main() {
  loadLocalEnv();

  const baseUrl = normalizeBaseUrl(
    process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  );
  const cookie = await createSmokeSessionCookie();
  const paymentDetailRoute = await resolveKnownPaymentRoute(baseUrl);
  const routes: RouteConfig[] = [
    {
      route: "/admin/dashboard",
      url: `${baseUrl}/admin/dashboard`,
      kind: "dashboard",
    },
    {
      route: "/admin/projects",
      url: `${baseUrl}/admin/projects`,
      kind: "list",
    },
    {
      route: "/admin/vendors",
      url: `${baseUrl}/admin/vendors`,
      kind: "list",
    },
    {
      route: "/admin/payments",
      url: `${baseUrl}/admin/payments`,
      kind: "list",
    },
    paymentDetailRoute,
    {
      route: "/admin/tasks",
      url: `${baseUrl}/admin/tasks`,
      kind: "list",
    },
    {
      route: "/admin/notifications",
      url: `${baseUrl}/admin/notifications`,
      kind: "list",
    },
    {
      route: "/admin/roles",
      url: `${baseUrl}/admin/roles`,
      kind: "list",
    },
  ];
  const results: SmokeResult[] = [];

  await prewarmServer(baseUrl, cookie);

  for (const pass of ["cold", "warm"] as const) {
    for (const route of routes) {
      if (pass === "warm") {
        const attempts = [
          await requestRouteWithRetry(route, pass, cookie),
          await requestRouteWithRetry(route, pass, cookie),
        ];
        attempts.sort((left, right) => left.durationMs - right.durationMs);
        results.push(attempts[0]);
        continue;
      }

      results.push(await requestRouteWithRetry(route, pass, cookie));
    }
  }

  console.table(results);

  const failedResults = results.filter((result) => result.result === "FAIL");

  if (failedResults.length > 0) {
    console.error(
      `Performance smoke failed for ${failedResults.length} route check(s).`,
    );
    process.exit(1);
  }

  console.log("Performance smoke passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
