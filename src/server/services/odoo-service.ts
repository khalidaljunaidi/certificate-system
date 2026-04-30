import "server-only";

type OdooConfig = {
  url: string;
  db: string;
  user: string;
  apiKey: string;
};

type OdooJsonRpcResponse<T> = {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: {
    code?: number;
    message?: string;
    data?: {
      message?: string;
      name?: string;
    };
  };
};

type OdooDiagnosticStep =
  | "configuration"
  | "authenticate"
  | "search country"
  | "search existing partner"
  | "create partner"
  | "update partner"
  | "test partner access";

export type OdooFailureDiagnostics = {
  step: OdooDiagnosticStep;
  message: string;
  httpStatus?: number | null;
  odooErrorMessage?: string | null;
  db?: string | null;
  url?: string | null;
};

export type OdooVendorSyncPayload = {
  name: string;
  email?: string | null;
  phone?: string | null;
  vat?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  city?: string | null;
  existingPartnerId?: number | null;
};

export type OdooVendorSyncResult =
  | {
      status: "SYNCED";
      partnerId: number;
      syncedAt: Date;
      error: null;
    }
  | {
      status: "FAILED";
      partnerId: null;
      syncedAt: null;
      error: string;
      diagnostics?: OdooFailureDiagnostics;
    };

export type OdooConnectionTestResult =
  | {
      status: "CONNECTED";
      uid: number;
      partnerCount: number | null;
      db: string;
      url: string;
    }
  | {
      status: "FAILED";
      error: string;
      diagnostics: OdooFailureDiagnostics;
    };

let rpcRequestId = 0;

class OdooDiagnosticError extends Error {
  diagnostics: OdooFailureDiagnostics;

  constructor(diagnostics: OdooFailureDiagnostics) {
    super(formatOdooDiagnosticMessage(diagnostics));
    this.name = "OdooDiagnosticError";
    this.diagnostics = diagnostics;
  }
}

function sanitizeOdooUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.replace(/\/\/[^/@]+@/, "//[redacted]@").split("?")[0].replace(/\/+$/, "");
  }
}

function getOdooConfig():
  | {
      ok: true;
      config: OdooConfig;
    }
  | {
      ok: false;
      error: string;
    } {
  const missing = [
    ["ODOO_URL", process.env.ODOO_URL],
    ["ODOO_DB", process.env.ODOO_DB],
    ["ODOO_USER", process.env.ODOO_USER],
    ["ODOO_API_KEY", process.env.ODOO_API_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Odoo sync configuration is incomplete. Missing ${missing.join(", ")}.`,
    };
  }

  return {
    ok: true,
    config: {
      url: process.env.ODOO_URL!.replace(/\/+$/, ""),
      db: process.env.ODOO_DB!,
      user: process.env.ODOO_USER!,
      apiKey: process.env.ODOO_API_KEY!,
    },
  };
}

function nextRpcId() {
  rpcRequestId += 1;
  return rpcRequestId;
}

function sanitizeText(value: unknown) {
  const apiKey = process.env.ODOO_API_KEY;
  const raw =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : "Odoo sync failed.";

  return apiKey && apiKey.length > 0 ? raw.replaceAll(apiKey, "[redacted]") : raw;
}

function formatOdooDiagnosticMessage(diagnostics: OdooFailureDiagnostics) {
  const parts = [
    `Step: ${diagnostics.step}`,
    `Database: ${diagnostics.db ?? "not configured"}`,
    `URL: ${diagnostics.url ?? "not configured"}`,
  ];

  if (diagnostics.httpStatus) {
    parts.push(`HTTP status: ${diagnostics.httpStatus}`);
  }

  if (diagnostics.odooErrorMessage) {
    parts.push(`Odoo response: ${diagnostics.odooErrorMessage}`);
  }

  parts.push(`Reason: ${diagnostics.message}`);

  return parts.join(" | ");
}

function buildOdooFailureDiagnostics(input: {
  step: OdooDiagnosticStep;
  config?: OdooConfig | null;
  message: unknown;
  httpStatus?: number | null;
  odooErrorMessage?: string | null;
}): OdooFailureDiagnostics {
  return {
    step: input.step,
    message: sanitizeText(input.message).slice(0, 600),
    httpStatus: input.httpStatus ?? null,
    odooErrorMessage: input.odooErrorMessage
      ? sanitizeText(input.odooErrorMessage).slice(0, 600)
      : null,
    db: input.config?.db ?? process.env.ODOO_DB ?? null,
    url: sanitizeOdooUrl(input.config?.url ?? process.env.ODOO_URL ?? null),
  };
}

function sanitizeOdooError(error: unknown, fallbackStep: OdooDiagnosticStep) {
  if (error instanceof OdooDiagnosticError) {
    return {
      message: error.message.slice(0, 1000),
      diagnostics: error.diagnostics,
    };
  }

  const diagnostics = buildOdooFailureDiagnostics({
    step: fallbackStep,
    message:
      error instanceof Error
        ? error.message
      : typeof error === "string"
        ? error
        : "Odoo sync failed.",
  });

  return {
    message: formatOdooDiagnosticMessage(diagnostics).slice(0, 1000),
    diagnostics,
  };
}

async function callOdooJsonRpc<T>(
  config: OdooConfig,
  step: OdooDiagnosticStep,
  params: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;

  try {
    response = await fetch(`${config.url}/jsonrpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params,
        id: nextRpcId(),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new OdooDiagnosticError(
      buildOdooFailureDiagnostics({
        step,
        config,
        message:
          error instanceof Error && error.name === "AbortError"
            ? "Odoo request timed out after 15000ms."
            : error,
      }),
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new OdooDiagnosticError(
      buildOdooFailureDiagnostics({
        step,
        config,
        message: `Odoo JSON-RPC request failed with HTTP ${response.status}.`,
        httpStatus: response.status,
      }),
    );
  }

  const payload = (await response.json()) as OdooJsonRpcResponse<T>;

  if (payload.error) {
    const odooMessage =
      payload.error.data?.message ??
      payload.error.message ??
      "Odoo JSON-RPC returned an error.";

    throw new OdooDiagnosticError(
      buildOdooFailureDiagnostics({
        step,
        config,
        message: odooMessage,
        odooErrorMessage: odooMessage,
      }),
    );
  }

  if (payload.result === undefined) {
    throw new OdooDiagnosticError(
      buildOdooFailureDiagnostics({
        step,
        config,
        message: "Odoo JSON-RPC returned an empty response.",
      }),
    );
  }

  return payload.result;
}

async function authenticate(config: OdooConfig) {
  const uid = await callOdooJsonRpc<number | false>(
    config,
    "authenticate",
    {
      service: "common",
      method: "authenticate",
      args: [config.db, config.user, config.apiKey, {}],
    },
  );

  if (!uid) {
    throw new OdooDiagnosticError(
      buildOdooFailureDiagnostics({
        step: "authenticate",
        config,
        message:
          "Odoo authentication failed. Check ODOO_DB, ODOO_USER, and ODOO_API_KEY.",
      }),
    );
  }

  return uid;
}

async function executeKw<T>(
  config: OdooConfig,
  uid: number,
  step: OdooDiagnosticStep,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {},
) {
  return callOdooJsonRpc<T>(config, step, {
    service: "object",
    method: "execute_kw",
    args: [config.db, uid, config.apiKey, model, method, args, kwargs],
  });
}

async function findCountryId(
  config: OdooConfig,
  uid: number,
  countryCode?: string | null,
  countryName?: string | null,
) {
  if (countryCode) {
    const matches = await executeKw<number[]>(
      config,
      uid,
      "search country",
      "res.country",
      "search",
      [[["code", "=", countryCode.trim().toUpperCase()]]],
      { limit: 1 },
    );

    if (matches[0]) {
      return matches[0];
    }
  }

  if (countryName) {
    const matches = await executeKw<number[]>(
      config,
      uid,
      "search country",
      "res.country",
      "search",
      [[["name", "ilike", countryName.trim()]]],
      { limit: 1 },
    );

    if (matches[0]) {
      return matches[0];
    }
  }

  return null;
}

async function findExistingPartnerId(
  config: OdooConfig,
  uid: number,
  payload: OdooVendorSyncPayload,
) {
  if (payload.existingPartnerId) {
    return payload.existingPartnerId;
  }

  if (payload.vat) {
    const matches = await executeKw<number[]>(
      config,
      uid,
      "search existing partner",
      "res.partner",
      "search",
      [[["vat", "=", payload.vat.trim()]]],
      { limit: 1 },
    );

    if (matches[0]) {
      return matches[0];
    }
  }

  if (payload.email) {
    const matches = await executeKw<number[]>(
      config,
      uid,
      "search existing partner",
      "res.partner",
      "search",
      [[["email", "=", payload.email.trim().toLowerCase()]]],
      { limit: 1 },
    );

    if (matches[0]) {
      return matches[0];
    }
  }

  return null;
}

export async function syncVendorPartnerToOdoo(
  payload: OdooVendorSyncPayload,
): Promise<OdooVendorSyncResult> {
  const configResult = getOdooConfig();

  if (!configResult.ok) {
    const diagnostics = buildOdooFailureDiagnostics({
      step: "configuration",
      message: configResult.error,
    });

    return {
      status: "FAILED",
      partnerId: null,
      syncedAt: null,
      error: configResult.error,
      diagnostics,
    };
  }

  try {
    const { config } = configResult;
    const uid = await authenticate(config);
    const countryId = await findCountryId(
      config,
      uid,
      payload.countryCode,
      payload.countryName,
    );
    const partnerValues: Record<string, string | number | boolean> = {
      name: payload.name.trim(),
      supplier_rank: 1,
      is_company: true,
    };

    if (payload.email) {
      partnerValues.email = payload.email.trim().toLowerCase();
    }

    if (payload.phone) {
      partnerValues.phone = payload.phone.trim();
    }

    if (payload.vat) {
      partnerValues.vat = payload.vat.trim();
    }

    if (payload.city) {
      partnerValues.city = payload.city.trim();
    }

    if (countryId) {
      partnerValues.country_id = countryId;
    }

    const existingPartnerId = await findExistingPartnerId(config, uid, payload);
    let partnerId = existingPartnerId;

    if (partnerId) {
      await executeKw<boolean>(
        config,
        uid,
        "update partner",
        "res.partner",
        "write",
        [[partnerId], partnerValues],
      );
    } else {
      partnerId = await executeKw<number>(
        config,
        uid,
        "create partner",
        "res.partner",
        "create",
        [partnerValues],
      );
    }

    return {
      status: "SYNCED",
      partnerId,
      syncedAt: new Date(),
      error: null,
    };
  } catch (error) {
    const sanitized = sanitizeOdooError(error, "create partner");
    return {
      status: "FAILED",
      partnerId: null,
      syncedAt: null,
      error: sanitized.message,
      diagnostics: sanitized.diagnostics,
    };
  }
}

export async function testOdooConnection(): Promise<OdooConnectionTestResult> {
  const configResult = getOdooConfig();

  if (!configResult.ok) {
    const diagnostics = buildOdooFailureDiagnostics({
      step: "configuration",
      message: configResult.error,
    });

    return {
      status: "FAILED",
      error: formatOdooDiagnosticMessage(diagnostics),
      diagnostics,
    };
  }

  try {
    const { config } = configResult;
    const uid = await authenticate(config);
    const partnerCount = await executeKw<number>(
      config,
      uid,
      "test partner access",
      "res.partner",
      "search_count",
      [[]],
    );

    return {
      status: "CONNECTED",
      uid,
      partnerCount,
      db: config.db,
      url: sanitizeOdooUrl(config.url) ?? config.url,
    };
  } catch (error) {
    const sanitized = sanitizeOdooError(error, "authenticate");

    return {
      status: "FAILED",
      error: sanitized.message,
      diagnostics: sanitized.diagnostics,
    };
  }
}
