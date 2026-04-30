import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
  var prismaPoolGlobal: Pool | undefined;
}

let prismaInstance: PrismaClient | undefined;

function getSlowQueryThresholdMs() {
  const parsed = Number(process.env.PRISMA_SLOW_QUERY_MS ?? "300");

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

function getQuerySignature(query: string) {
  return query.replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ");
}

function shouldWarnAboutUnboundedListQuery(query: string) {
  const normalizedQuery = query.replace(/\s+/g, " ").trim().toLowerCase();

  if (!normalizedQuery.startsWith("select")) {
    return false;
  }

  if (!normalizedQuery.includes(" order by ")) {
    return false;
  }

  if (normalizedQuery.includes(" limit ")) {
    return false;
  }

  if (normalizedQuery.includes("count(") || normalizedQuery.includes("count(*)")) {
    return false;
  }

  return true;
}

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return connectionString;
}

function createPrismaClient() {
  if (global.prismaGlobal) {
    return global.prismaGlobal;
  }

  const pool =
    global.prismaPoolGlobal ??
    new Pool({
      connectionString: getConnectionString(),
    });
  const enableSlowQueryLogs =
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_PRISMA_SLOW_QUERY_LOGS === "true";

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: enableSlowQueryLogs
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
          { emit: "stdout", level: "warn" },
        ]
      : [{ emit: "stdout", level: "error" }],
  });

  if (enableSlowQueryLogs) {
    const slowQueryThresholdMs = getSlowQueryThresholdMs();

    client.$on("query", (event) => {
      if (event.duration >= slowQueryThresholdMs) {
        console.warn(
          `[perf][prisma] ${event.duration}ms exceeded ${slowQueryThresholdMs}ms ${getQuerySignature(event.query)}`,
        );
      }

      if (shouldWarnAboutUnboundedListQuery(event.query)) {
        console.warn(
          `[perf][prisma][unbounded-list] likely list query without LIMIT: ${getQuerySignature(event.query)}`,
        );
      }
    });
  }

  if (process.env.NODE_ENV !== "production") {
    global.prismaGlobal = client;
    global.prismaPoolGlobal = pool;
  }

  return client;
}

export function getPrismaClient() {
  prismaInstance ??= createPrismaClient();
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;
