import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" }
    ],
    datasourceUrl: process.env.DATABASE_URL
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
