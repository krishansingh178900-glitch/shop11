import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __sqliteWalApplied: boolean | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Ultra-fast SQLite WAL Mode & PRAGMA optimizations for local development
if (!global.__sqliteWalApplied) {
  global.__sqliteWalApplied = true;
  const isPostgres = process.env.DATABASE_URL?.startsWith("postgres");
  if (!isPostgres) {
    // Run asynchronously with $queryRawUnsafe to consume PRAGMA result rows safely
    prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
      .then(() => prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"))
      .then(() => prisma.$queryRawUnsafe("PRAGMA cache_size = -64000;")) // 64MB cache
      .then(() => prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY;"))
      .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
      .catch(() => {});
  }
}
