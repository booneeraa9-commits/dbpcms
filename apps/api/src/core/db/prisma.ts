import { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";

/**
 * A single shared PrismaClient for the whole app (a "singleton").
 * Creating many clients would exhaust the database's connection pool, so we
 * make exactly one and reuse it everywhere.
 *
 * In development, `tsx watch` reloads the module on every file change; without
 * the global cache below that would leak a new client each time.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
