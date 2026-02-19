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
declare global {
    var __prisma: PrismaClient | undefined;
}
/**
 * The application-wide Prisma client.
 *
 * In production: a fresh instance per process (serverless or long-running).
 * In development: persisted on `globalThis` to survive hot-reloads.
 */
export declare const prisma: PrismaClient;
//# sourceMappingURL=client.d.ts.map