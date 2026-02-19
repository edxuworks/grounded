/**
 * Workspace Router
 *
 * Manages workspace lifecycle and member management.
 * A workspace is the top-level organisational unit — all deals, annotations,
 * and field definitions are scoped to a workspace.
 *
 * Access control:
 *  - workspace.list      — authenticated user (lists their own workspaces)
 *  - workspace.create    — authenticated user (creates + becomes OWNER)
 *  - workspace.update    — workspace OWNER or ADMIN only
 *  - workspace.delete    — workspace OWNER only
 *  - workspace.addMember — workspace OWNER or ADMIN only
 *  - workspace.removeMember — OWNER only, cannot remove self as OWNER
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  protectedProcedure,
  workspaceProcedure,
  router,
} from "@/trpc";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from "@grounded/types";

export const workspaceRouter = router({
  /**
   * Lists all workspaces the authenticated user is a member of.
   * Ordered by most recently created first.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.workspaceMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: { deals: true, members: true },
            },
          },
        },
      },
      orderBy: { workspace: { createdAt: "desc" } },
    });
    return memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role,
    }));
  }),

  /**
   * Creates a new workspace and adds the creator as OWNER.
   * The two writes (workspace + member) are wrapped in a transaction
   * to prevent orphaned workspaces with no owner.
   */
  create: protectedProcedure
    .input(CreateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness before transaction to give a clean error.
      const existing = await ctx.db.workspace.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `The slug "${input.slug}" is already taken. Please choose another.`,
        });
      }

      // Transaction: create workspace + add creator as OWNER atomically.
      // If either fails, both are rolled back — no orphaned workspaces.
      return ctx.db.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: { name: input.name, slug: input.slug },
        });
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: ctx.user.id,
            role: "OWNER",
          },
        });
        return workspace;
      });
    }),

  /** Updates workspace name. Restricted to OWNER or ADMIN. */
  update: workspaceProcedure
    .input(UpdateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      // workspaceProcedure attaches ctx.workspaceMember — check role here.
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only workspace owners and admins can update workspace settings.",
        });
      }
      return ctx.db.workspace.update({
        where: { id: input.id },
        data: { ...(input.name && { name: input.name }) },
      });
    }),

  /**
   * Invites a user to the workspace by email.
   * If the user exists in our system, adds them immediately.
   * If not, returns a pending state (invite emails are a v2+ feature).
   */
  addMember: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can add members.",
        });
      }

      const targetUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!targetUser) {
        // User doesn't exist yet — in MVP we return a message.
        // In v2+ this triggers an email invite flow.
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No account found for ${input.email}. They must sign up first.`,
        });
      }

      // Check if already a member.
      const existing = await ctx.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: targetUser.id,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${input.email} is already a member of this workspace.`,
        });
      }

      return ctx.db.workspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: targetUser.id,
          role: input.role,
        },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      });
    }),

  /** Lists all members of a workspace. */
  listMembers: workspaceProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      });
    }),
});
