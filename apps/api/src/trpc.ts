/**
 * tRPC Initialisation — Procedure Builders & Middleware
 *
 * This file creates the three procedure types used throughout the app:
 *
 *  publicProcedure    — No auth required (health check, public data)
 *  protectedProcedure — Requires valid JWT; throws UNAUTHORIZED if absent
 *  workspaceProcedure — Requires auth + workspace membership; throws FORBIDDEN
 *                       if the user is not a member of the target workspace
 *
 * WHY separate procedure types (ISP principle)?
 * Routers only declare which procedure type they need — they don't implement
 * auth checking themselves. Auth logic lives here, once, in middleware. This
 * makes it impossible to accidentally skip auth on a protected route.
 *
 * HOW workspace access is enforced:
 * Any procedure that accepts a `workspaceId` input and uses `workspaceProcedure`
 * will automatically verify membership before the handler runs. The verified
 * workspace member record (including role) is attached to ctx for use in
 * role-based checks (e.g. only OWNER can delete workspace).
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { Context } from "@/context";

const t = initTRPC.context<Context>().create({
  /**
   * Error formatter — adds Zod validation details to error responses.
   * Without this, Zod errors are swallowed into a generic INTERNAL_SERVER_ERROR.
   * With it, the frontend receives field-level validation messages.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * Auth middleware: verifies ctx.user is present.
 * Creates a narrowed context where user is guaranteed non-null,
 * so downstream procedures can safely access ctx.user.id without null checks.
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action.",
    });
  }
  // Pass context with user type narrowed to non-null.
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Workspace access middleware: verifies the authenticated user is a member
 * of the workspace specified in the procedure input.
 *
 * NOTE: This middleware reads the raw input — it expects the input to contain
 * a `workspaceId` field. Procedures that use workspaceProcedure MUST include
 * `workspaceId` in their input schema, or this check will be bypassed silently.
 *
 * tRPC v11 API note: `rawInput` was changed from a direct value to `getRawInput`,
 * an async function. We call `await getRawInput()` to obtain the unparsed input
 * before the procedure's .input() Zod schema runs.
 *
 * The workspace member record (including role) is attached to ctx.workspaceMember
 * for use in role-based checks within the procedure handler.
 */
const hasWorkspaceAccess = t.middleware(async ({ ctx, getRawInput, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // getRawInput() is async in tRPC v11 — it returns the raw, pre-parse input.
  const rawInput = await getRawInput();

  // Extract workspaceId from raw input. This is safe because we only attach
  // this middleware to procedures that declare workspaceId in their schema.
  const workspaceId =
    rawInput && typeof rawInput === "object" && "workspaceId" in rawInput
      ? (rawInput as { workspaceId: unknown }).workspaceId
      : null;

  if (!workspaceId || typeof workspaceId !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "workspaceId is required for this operation.",
    });
  }

  const member = await ctx.db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: ctx.user.id,
      },
    },
    include: { workspace: true },
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this workspace.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      // Attach the member record so handlers can check roles without
      // an additional DB query.
      workspaceMember: member,
    },
  });
});

// ── Exported Procedure Builders ────────────────────────────────────────────

export const router = t.router;
export const mergeRouters = t.mergeRouters;

/** For routes that don't require authentication (e.g. health check) */
export const publicProcedure = t.procedure;

/** For routes that require a valid logged-in user */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * For routes that require workspace membership.
 * The input MUST contain a `workspaceId: string` field.
 */
export const workspaceProcedure = t.procedure
  .use(isAuthenticated)
  .use(hasWorkspaceAccess);
