/**
 * tRPC Context
 *
 * The context is created once per request and passed to every tRPC procedure.
 * It is the primary mechanism for Dependency Injection in our tRPC layer (DIP):
 *  - ctx.db    — Prisma client (or mock in tests)
 *  - ctx.user  — Verified Supabase user (or null for unauthenticated requests)
 *
 * In tests, we construct a mock context directly (no HTTP layer), so
 * protectedProcedure tests can inject any user shape they need.
 *
 * WHY pass db via context instead of importing prisma directly in each router?
 * If we import prisma directly in routers, tests must mock the module-level
 * import, which is brittle and environment-dependent. Context injection means
 * each test can provide its own mock db object cleanly.
 */

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { PrismaClient } from "@grounded/db";
import { prisma } from "@/lib/prisma";
import { createUserScopedClient } from "@/lib/supabase";

/** The shape of ctx.user — a minimal subset of the Supabase auth.User */
export interface AuthUser {
  id: string;
  email: string;
}

/** Full context shape available in every tRPC procedure */
export interface Context {
  /** Prisma client — replaced with a mock in unit tests */
  db: PrismaClient;
  /**
   * The authenticated user, or null if the request has no/invalid JWT.
   * Procedures that call `protectedProcedure` will throw UNAUTHORIZED if null.
   */
  user: AuthUser | null;
}

/**
 * Creates the tRPC context from an incoming Express request.
 * Called once per HTTP request by the tRPC Express adapter.
 */
export async function createContext({
  req,
}: CreateExpressContextOptions): Promise<Context> {
  // Extract the Bearer token from the Authorization header.
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  let user: AuthUser | null = null;

  if (token) {
    try {
      // Create a per-request Supabase client with the user's token, then
      // call getUser() — this hits the Supabase auth server to verify the JWT.
      // If the token is expired or invalid, getUser() returns an error.
      const supabase = createUserScopedClient(token);
      const { data, error } = await supabase.auth.getUser();

      if (!error && data.user?.email) {
        user = {
          id: data.user.id,
          email: data.user.email,
        };
      }
    } catch {
      // Malformed token or network error — treat as unauthenticated.
      // Don't throw here; the individual procedure will throw UNAUTHORIZED
      // if it requires authentication (via protectedProcedure).
      user = null;
    }
  }

  return {
    db: prisma,
    user,
  };
}
