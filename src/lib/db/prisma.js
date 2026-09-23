import dns from "dns";
import { PrismaClient } from "@prisma/client";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const globalForPrisma = globalThis;
const DEFAULT_CONNECTION_LIMIT = "10";
const DEFAULT_POOL_TIMEOUT = "60";
const DEFAULT_CONNECT_TIMEOUT = "30";

function getDatasourceUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const connectionLimit = Number(url.searchParams.get("connection_limit") || 0);
    const poolTimeout = Number(url.searchParams.get("pool_timeout") || 0);
    const connectTimeout = Number(url.searchParams.get("connect_timeout") || 0);

    if (!connectionLimit || connectionLimit <= 1) {
      url.searchParams.set(
        "connection_limit",
        process.env.PRISMA_CONNECTION_LIMIT || DEFAULT_CONNECTION_LIMIT,
      );
    }
    if (!poolTimeout || poolTimeout < Number(DEFAULT_POOL_TIMEOUT)) {
      url.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || DEFAULT_POOL_TIMEOUT);
    }
    if (!connectTimeout || connectTimeout < Number(DEFAULT_CONNECT_TIMEOUT)) {
      url.searchParams.set(
        "connect_timeout",
        process.env.PRISMA_CONNECT_TIMEOUT || DEFAULT_CONNECT_TIMEOUT,
      );
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export const prisma =
  (globalForPrisma.prisma && globalForPrisma.prisma.dailyPresence)
    ? globalForPrisma.prisma
    : new PrismaClient({
        log: [
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ],
        datasourceUrl: getDatasourceUrl(),
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
