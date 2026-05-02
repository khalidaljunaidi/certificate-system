import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Locator, type Page } from "playwright";

type ScreenshotKey =
  | "landing"
  | "supplier-registration"
  | "dashboard"
  | "projects"
  | "vendors"
  | "vendor-detail"
  | "payments"
  | "payment-detail";

type CaptureTarget = {
  key: ScreenshotKey;
  label: string;
  path: string;
  fileName: `${ScreenshotKey}.png`;
  requiresAuth?: boolean;
  mustNotBeAuthPage?: boolean;
};

type PrismaSingleton = Awaited<typeof import("../src/lib/prisma")>["prisma"];

const VIEWPORT = {
  width: 1920,
  height: 1080,
};

const ARTIFACT_ROOT = path.join(
  process.cwd(),
  "artifacts",
  "ceo-presentation",
);
const SCREENSHOT_DIR = path.join(ARTIFACT_ROOT, "screenshots");
const LOGIN_FAILED_SCREENSHOT = path.join(
  ARTIFACT_ROOT,
  "login-failed.png",
);
const BETWEEN_SCREENSHOT_DELAY_MS = 2000;
const AFTER_CAPTURE_SETTLE_MS = 500;
const PRISMA_MAX_CLIENT_RETRY_DELAY_MS = 5000;

const ALL_SCREENSHOT_KEYS: ScreenshotKey[] = [
  "landing",
  "supplier-registration",
  "dashboard",
  "projects",
  "vendors",
  "vendor-detail",
  "payments",
  "payment-detail",
];

let prismaForDisconnect: PrismaSingleton | null = null;

async function getPrisma() {
  const { prisma } = await import("../src/lib/prisma");

  prismaForDisconnect = prisma;

  return prisma;
}

async function disconnectPrisma() {
  if (!prismaForDisconnect) {
    return;
  }

  await prismaForDisconnect.$disconnect();
}

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAdminWorkspaceUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.pathname.startsWith("/admin") &&
      !url.pathname.startsWith("/admin/login")
    );
  } catch {
    return /^\/admin(\/|$)/.test(value) && !value.startsWith("/admin/login");
  }
}

function isPrismaMaxClientsMessage(value: unknown) {
  const message = value instanceof Error ? value.message : String(value);

  return /EMAXCONNSESSION|max clients reached|pool_size/i.test(message);
}

function parseOnlyArg() {
  const onlyIndex = process.argv.findIndex(
    (value) => value === "--only" || value.startsWith("--only="),
  );

  if (onlyIndex === -1) {
    return new Set<ScreenshotKey>(ALL_SCREENSHOT_KEYS);
  }

  const rawValue = process.argv[onlyIndex].startsWith("--only=")
    ? process.argv[onlyIndex].slice("--only=".length)
    : process.argv[onlyIndex + 1];

  if (!rawValue?.trim()) {
    throw new Error(
      `--only requires at least one screenshot key. Valid keys: ${ALL_SCREENSHOT_KEYS.join(
        ", ",
      )}`,
    );
  }

  const keys = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const invalidKeys = keys.filter(
    (key): key is string => !ALL_SCREENSHOT_KEYS.includes(key as ScreenshotKey),
  );

  if (invalidKeys.length > 0) {
    throw new Error(
      `Unknown --only screenshot key(s): ${invalidKeys.join(
        ", ",
      )}. Valid keys: ${ALL_SCREENSHOT_KEYS.join(", ")}`,
    );
  }

  return new Set(keys as ScreenshotKey[]);
}

async function assertServerReachable(baseUrl: string) {
  try {
    const response = await fetch(baseUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });

    if (response.status >= 500) {
      throw new Error(`Server returned HTTP ${response.status}.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Could not reach ${baseUrl}. Start the app first with npm run dev or npm run start. Details: ${message}`,
    );
  }
}

async function resolveSampleIds() {
  const prisma = await getPrisma();

  const activeVendor = await prisma.vendor.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });
  const vendor =
    activeVendor ??
    (await prisma.vendor.findFirst({
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
      },
    }));

  const activePayment = await prisma.projectVendor.findFirst({
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
  const payment =
    activePayment ??
    (await prisma.projectVendor.findFirst({
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
      },
    }));

  if (!vendor) {
    throw new Error(
      "No vendor was found. Add or seed a vendor before running CEO presentation capture.",
    );
  }

  if (!payment) {
    throw new Error(
      "No payment/project-vendor record was found. Add or seed a project-vendor assignment before running CEO presentation capture.",
    );
  }

  return {
    sampleVendorId: vendor.id,
    samplePaymentId: payment.id,
  };
}

async function resolveSampleIdsWithRetry() {
  try {
    return await resolveSampleIds();
  } catch (error) {
    if (!isPrismaMaxClientsMessage(error)) {
      throw error;
    }

    console.warn(
      `Prisma max-client pressure while resolving sample IDs. Waiting ${PRISMA_MAX_CLIENT_RETRY_DELAY_MS}ms and retrying once.`,
    );
    await delay(PRISMA_MAX_CLIENT_RETRY_DELAY_MS);

    return resolveSampleIds();
  }
}

function prepareScreenshotDirectory(reset: boolean) {
  if (reset && existsSync(SCREENSHOT_DIR)) {
    rmSync(SCREENSHOT_DIR, {
      recursive: true,
      force: true,
    });
  }

  mkdirSync(SCREENSHOT_DIR, {
    recursive: true,
  });
}

async function hideDebugUi(page: Page) {
  await page.addStyleTag({
    content: `
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      .nextjs-toast,
      .nextjs-portal,
      nextjs-portal,
      #__next-build-watcher,
      [data-vercel-toolbar],
      [data-testid="nextjs-toast"] {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `,
  });
}

async function waitForStablePage(page: Page) {
  await page.waitForLoadState("domcontentloaded");

  try {
    await page.waitForLoadState("networkidle", {
      timeout: 12_000,
    });
  } catch {
    await page.waitForTimeout(1000);
  }

  await hideDebugUi(page);
  await page.waitForTimeout(350);
}

async function firstVisibleLocator(
  page: Page,
  selectors: string[],
  timeout = 3500,
) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      await locator.waitFor({
        state: "visible",
        timeout,
      });

      return locator;
    } catch {
      // Try the next selector. Login markup has changed a few times across the
      // platform, so the capture script intentionally accepts several shapes.
    }
  }

  return null;
}

async function firstVisibleButton(page: Page) {
  const roleCandidates: Locator[] = [
    page.getByRole("button", { name: /enter system/i }).first(),
    page.getByRole("button", { name: /team login/i }).first(),
    page.getByRole("button", { name: /sign in/i }).first(),
    page.getByRole("button", { name: /log in/i }).first(),
    page.getByRole("button", { name: /login/i }).first(),
  ];

  for (const locator of roleCandidates) {
    try {
      await locator.waitFor({
        state: "visible",
        timeout: 2000,
      });

      return locator;
    } catch {
      // Fall through to selector candidates.
    }
  }

  return firstVisibleLocator(page, [
    'button[type="submit"]',
    "form button",
    "button",
  ]);
}

async function openLoginPage(page: Page, baseUrl: string) {
  const loginPaths = [
    "/login?callbackUrl=/admin/dashboard",
    "/admin/login?callbackUrl=/admin/dashboard",
  ];

  for (const loginPath of loginPaths) {
    await page.goto(`${baseUrl}${loginPath}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForStablePage(page);

    const emailField = await firstVisibleLocator(page, [
      "#email",
      'input[name="email"]',
      'input[type="email"]',
      'input[autocomplete="email"]',
    ]);
    const passwordField = await firstVisibleLocator(page, [
      "#password",
      'input[name="password"]',
      'input[type="password"]',
      'input[autocomplete="current-password"]',
    ]);

    if (emailField && passwordField) {
      return {
        emailField,
        passwordField,
      };
    }
  }

  throw new Error(
    "Could not find visible email/password fields on /login or /admin/login.",
  );
}

async function login(page: Page, baseUrl: string) {
  const { emailField, passwordField } = await openLoginPage(page, baseUrl);
  const email = process.env.CEO_PRESENTATION_EMAIL?.trim();
  const password = process.env.CEO_PRESENTATION_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      "CEO_PRESENTATION_EMAIL and CEO_PRESENTATION_PASSWORD are required for authenticated screenshots.",
    );
  }

  await emailField.fill(email);
  await passwordField.fill(password);

  const submitButton = await firstVisibleButton(page);

  if (!submitButton) {
    throw new Error("Could not find a visible login submit button.");
  }

  await submitButton.click();
  await waitForLoginResult(page);
  await waitForStablePage(page);

  if (!isAdminWorkspaceUrl(page.url())) {
    throw new Error(
      "Login did not complete. Check CEO_PRESENTATION_EMAIL and CEO_PRESENTATION_PASSWORD.",
    );
  }
}

async function waitForLoginResult(page: Page) {
  const startedAt = Date.now();
  const timeoutMs = 60_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (isAdminWorkspaceUrl(page.url())) {
      return;
    }

    const bodyText = await page
      .locator("body")
      .innerText({
        timeout: 1000,
      })
      .catch(() => "");

    if (/invalid email or password/i.test(bodyText)) {
      throw new Error("Login failed: invalid email or password.");
    }

    if (/something went wrong while signing in/i.test(bodyText)) {
      throw new Error("Login failed: the sign-in request returned an error.");
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(
    "Login did not complete within 60 seconds. Check credentials and the /api/auth credentials provider.",
  );
}

async function assertUsableCapture(page: Page, target: CaptureTarget) {
  if (target.mustNotBeAuthPage && /\/login|\/admin\/login/.test(page.url())) {
    throw new Error(`${target.label} resolved to a login page.`);
  }

  const visibleText = await page.locator("body").innerText({
    timeout: 10_000,
  });
  const pageHead = visibleText.slice(0, 2500);

  if (/404|not found/i.test(pageHead)) {
    throw new Error(`${target.label} appears to be a not found page.`);
  }

  if (isPrismaMaxClientsMessage(pageHead)) {
    throw new Error(
      `${target.label} hit Prisma max-client pressure during render.`,
    );
  }
}

async function cleanupAfterCapture(page: Page) {
  await page.waitForTimeout(AFTER_CAPTURE_SETTLE_MS);
  await page
    .goto("about:blank", {
      waitUntil: "domcontentloaded",
      timeout: 10_000,
    })
    .catch(() => undefined);
}

async function captureTargetOnce(
  page: Page,
  baseUrl: string,
  target: CaptureTarget,
) {
  const url = `${baseUrl}${target.path}`;
  const outputPath = path.join(SCREENSHOT_DIR, target.fileName);

  console.log(`Capturing ${target.label}: ${url}`);

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await waitForStablePage(page);
  await assertUsableCapture(page, target);
  await page.screenshot({
    path: outputPath,
    fullPage: false,
  });
}

async function captureTarget(page: Page, baseUrl: string, target: CaptureTarget) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await captureTargetOnce(page, baseUrl, target);
      return;
    } catch (error) {
      if (attempt === 1 && isPrismaMaxClientsMessage(error)) {
        console.warn(
          `${target.label} hit Prisma max-client pressure. Waiting ${PRISMA_MAX_CLIENT_RETRY_DELAY_MS}ms and retrying once.`,
        );
        await cleanupAfterCapture(page);
        await delay(PRISMA_MAX_CLIENT_RETRY_DELAY_MS);
        continue;
      }

      throw error;
    } finally {
      await cleanupAfterCapture(page);
    }
  }
}

function buildTargets(sampleIds: {
  sampleVendorId: string;
  samplePaymentId: string;
}): CaptureTarget[] {
  return [
    {
      key: "landing",
      label: "Landing",
      path: "/",
      fileName: "landing.png",
    },
    {
      key: "supplier-registration",
      label: "Supplier registration",
      path: "/supplier-registration",
      fileName: "supplier-registration.png",
    },
    {
      key: "dashboard",
      label: "Dashboard",
      path: "/admin/dashboard",
      fileName: "dashboard.png",
      requiresAuth: true,
      mustNotBeAuthPage: true,
    },
    {
      key: "projects",
      label: "Projects",
      path: "/admin/projects",
      fileName: "projects.png",
      requiresAuth: true,
      mustNotBeAuthPage: true,
    },
    {
      key: "vendors",
      label: "Vendors",
      path: "/admin/vendors",
      fileName: "vendors.png",
      requiresAuth: true,
      mustNotBeAuthPage: true,
    },
    {
      key: "vendor-detail",
      label: "Vendor detail",
      path: `/admin/vendors/${sampleIds.sampleVendorId}`,
      fileName: "vendor-detail.png",
      requiresAuth: true,
      mustNotBeAuthPage: true,
    },
    {
      key: "payments",
      label: "Payments",
      path: "/admin/payments",
      fileName: "payments.png",
      requiresAuth: true,
      mustNotBeAuthPage: true,
    },
    {
      key: "payment-detail",
      label: "Payment detail",
      path: `/admin/payments/${sampleIds.samplePaymentId}`,
      fileName: "payment-detail.png",
      requiresAuth: true,
      mustNotBeAuthPage: true,
    },
  ];
}

function missingScreenshots(targets: CaptureTarget[]) {
  return targets.filter((target) => {
    const filePath = path.join(SCREENSHOT_DIR, target.fileName);

    if (!existsSync(filePath)) {
      return true;
    }

    return statSync(filePath).size === 0;
  });
}

function formatMissingScreenshots(targets: CaptureTarget[]) {
  return missingScreenshots(targets)
    .map((target) => `Missing screenshot: ${target.fileName}`)
    .join("\n");
}

function assertScreenshotsExist(targets: CaptureTarget[]) {
  const missing = missingScreenshots(targets);

  if (missing.length === 0) {
    return;
  }

  for (const target of missing) {
    console.error(`Missing screenshot: ${target.fileName}`);
  }

  throw new Error(
    `CEO presentation capture incomplete.\n${missing
      .map((target) => `Missing screenshot: ${target.fileName}`)
      .join("\n")}`,
  );
}

async function captureTargetsSequentially(
  page: Page,
  baseUrl: string,
  targets: CaptureTarget[],
) {
  const errors: string[] = [];

  for (const [index, target] of targets.entries()) {
    if (index > 0) {
      await delay(BETWEEN_SCREENSHOT_DELAY_MS);
    }

    try {
      await captureTarget(page, baseUrl, target);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      errors.push(`${target.fileName}: ${message}`);
      console.error(`Failed to capture ${target.fileName}: ${message}`);
    }
  }

  return errors;
}

async function main() {
  loadLocalEnv();

  const selectedKeys = parseOnlyArg();
  const baseUrl = normalizeBaseUrl(
    process.env.CEO_PRESENTATION_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  );
  const isFullCapture = selectedKeys.size === ALL_SCREENSHOT_KEYS.length;

  prepareScreenshotDirectory(isFullCapture);
  await assertServerReachable(baseUrl);

  const needsDetailId =
    selectedKeys.has("vendor-detail") || selectedKeys.has("payment-detail");
  const sampleIds = needsDetailId
    ? await resolveSampleIdsWithRetry()
    : {
        sampleVendorId: "",
        samplePaymentId: "",
      };
  const targets = buildTargets(sampleIds).filter((target) =>
    selectedKeys.has(target.key),
  );

  if (targets.length === 0) {
    throw new Error("No screenshots selected for capture.");
  }

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const publicTargets = targets.filter((target) => !target.requiresAuth);
    const authTargets = targets.filter((target) => target.requiresAuth);

    await captureTargetsSequentially(page, baseUrl, publicTargets);

    if (authTargets.length > 0) {
      try {
        await login(page, baseUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await page.screenshot({
          path: LOGIN_FAILED_SCREENSHOT,
          fullPage: false,
        });

        throw new Error(
          `Login failed; saved ${LOGIN_FAILED_SCREENSHOT}.\n${message}\n${formatMissingScreenshots(
            authTargets,
          )}`,
        );
      }

      const authErrors = await captureTargetsSequentially(
        page,
        baseUrl,
        authTargets,
      );

      if (authErrors.length > 0) {
        console.warn(
          `Capture warnings:\n${authErrors.join("\n")}`,
        );
      }
    }

    assertScreenshotsExist(targets);
  } catch (error) {
    if (
      error instanceof Error &&
      /Executable doesn't exist|browserType.launch/i.test(error.message)
    ) {
      throw new Error(
        `${error.message}\n\nPlaywright browsers are missing. Run: npx playwright install chromium`,
      );
    }

    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }

    await disconnectPrisma();
  }

  console.log(`CEO presentation screenshots saved to ${SCREENSHOT_DIR}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
