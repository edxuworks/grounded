/**
 * Auth Router
 *
 * Handles user identity — specifically, syncing the Supabase auth user into
 * our public.users table on first login.
 *
 * WHY do we need a sync step?
 * Supabase Auth stores users in a separate `auth.users` schema that our app
 * cannot directly query via Prisma. We maintain a mirror in `public.users`
 * so we can do standard FK joins (e.g. Comment → User → fullName).
 *
 * The sync happens via `auth.syncUser` which is called by the frontend
 * immediately after a successful login/signup. It's idempotent (upsert).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/trpc";

export const authRouter = router({
  /**
   * Returns the current authenticated user's profile from our public.users table.
   * If the user exists in Supabase auth but not in our table yet (first login),
   * returns null — the frontend should then call auth.syncUser.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
        // Include workspace memberships so the frontend can redirect to
        // the user's workspace without a second API call.
        workspaceMemberships: {
          select: {
            role: true,
            workspace: {
              select: { id: true, name: true, slug: true, plan: true },
            },
          },
        },
      },
    });
    return user;
  }),

  /**
   * Upserts the authenticated user into public.users.
   * Called by the frontend after every successful login/signup.
   * Safe to call multiple times — uses upsert to avoid duplicates.
   */
  syncUser: protectedProcedure
    .input(
      z.object({
        fullName: z.string().max(200).optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.upsert({
          where: { id: ctx.user.id },
          create: {
            id: ctx.user.id,
            email: ctx.user.email,
            fullName: input.fullName ?? null,
            avatarUrl: input.avatarUrl ?? null,
          },
          update: {
            // Only update if the value is provided — don't overwrite with null.
            ...(input.fullName && { fullName: input.fullName }),
            ...(input.avatarUrl && { avatarUrl: input.avatarUrl }),
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        });
        return user;
      } catch (error) {
        // If the upsert fails (e.g. DB connectivity issue), throw a clear
        // error rather than letting an unhandled exception reach the client.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync user profile. Please try again.",
          cause: error,
        });
      }
    }),
});
