import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
  var prismaPoolGlobal: Pool | undefined;
}

let prismaInstance: PrismaClient | undefined;

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

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

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
