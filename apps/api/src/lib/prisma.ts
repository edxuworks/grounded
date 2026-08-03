/**
 * API-layer Prisma client re-export.
 *
 * apps/api imports the Prisma client from here (not directly from @grounded/db)
 * so that if we ever want to add API-specific middleware to the Prisma client
 * (e.g. soft-delete extension, audit log extension), we do it in one place.
 *
 * Currently this is a pass-through — the singleton lives in @grounded/db/client.
 */

export { prisma } from "@grounded/db";
export type { Prisma } from "@grounded/db";
