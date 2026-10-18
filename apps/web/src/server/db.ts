import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@klivexa/database";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDatabase = globalThis as unknown as { klivexaPrisma?: PrismaClient };

export const db =
  globalForDatabase.klivexaPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.klivexaPrisma = db;
}
