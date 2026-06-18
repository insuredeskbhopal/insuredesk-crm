import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const DEFAULT_CONNECTION_LIMIT = "5";
const DEFAULT_POOL_TIMEOUT = "60";

function getDatasourceUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const connectionLimit = Number(url.searchParams.get("connection_limit") || 0);
    const poolTimeout = Number(url.searchParams.get("pool_timeout") || 0);

    if (!connectionLimit || connectionLimit <= 1) {
      url.searchParams.set(
        "connection_limit",
        process.env.PRISMA_CONNECTION_LIMIT || DEFAULT_CONNECTION_LIMIT,
      );
    }
    if (!poolTimeout || poolTimeout < Number(DEFAULT_POOL_TIMEOUT)) {
      url.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || DEFAULT_POOL_TIMEOUT);
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" },
    ],
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
