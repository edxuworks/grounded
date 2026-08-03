/**
 * Prisma Client Singleton
 *
 * WHY a singleton?
 * Prisma opens a connection pool to the database. In development, hot-reload
 * (Vite HMR, nodemon) would create a new PrismaClient on every file change,
 * quickly exhausting the Postgres connection limit (default: 100).
 * The global singleton pattern prevents this by reusing the same instance.
 *
 * DIP note:
 * The rest of the application (apps/api) imports PrismaClient from this
 * module, NOT directly from @prisma/client. This means if we ever swap Prisma
 * for another ORM (Drizzle, Kysely), we only change this file and the
 * generated type imports — no changes needed in any router or procedure.
 */

import { PrismaClient } from "./generated/client";

// Extend the global object type to hold the Prisma client across hot reloads.
// This avoids TypeScript errors when writing to `global`.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? // In development, log queries, errors and warnings to the console.
          // This helps diagnose N+1 query issues during development.
          ["query", "error", "warn"]
        : // In production, log only errors to avoid leaking query details
          // into log aggregators (which could expose PII or schema info).
          ["error"],
  });
}

/**
 * The application-wide Prisma client.
 *
 * In production: a fresh instance per process (serverless or long-running).
 * In development: persisted on `globalThis` to survive hot-reloads.
 */
export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  // Attach to globalThis in non-production environments to prevent the
  // "too many clients" error during hot-reload development cycles.
  globalThis.__prisma = prisma;
}
