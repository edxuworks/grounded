/**
 * Comment Router
 *
 * Manages stakeholder comments on deals.
 * Comments are threaded per-deal and tied to the commenting user's
 * workspace membership (their role — OWNER, ADMIN, MEMBER, VIEWER — is
 * included in the query response for display in the UI).
 *
 * MVP scope: create and list only. Delete is included for moderation.
 * Edit is not supported in MVP (editing requires an audit trail — v2+).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { workspaceProcedure, router } from "@/trpc";
import { CreateCommentSchema } from "@grounded/types";

export const commentRouter = router({
  /**
   * Lists all comments for a deal, oldest first.
   * Includes the author's workspace role so the UI can display role badges
   * (e.g. "Analyst", "Investor") without a separate lookup.
   */
  listByDeal: workspaceProcedure
    .input(
      z.object({
        dealId: z.string().min(1),
        workspaceId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify the deal exists in this workspace before returning comments.
      const deal = await ctx.db.deal.findFirst({
        where: { id: input.dealId, workspaceId: input.workspaceId },
        select: { id: true },
      });
      if (!deal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
      }

      const comments = await ctx.db.comment.findMany({
        where: { dealId: input.dealId },
        include: {
          author: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Enrich each comment with the author's workspace role.
      // We do a single bulk lookup of all relevant memberships to avoid N+1.
      const authorIds = [...new Set(comments.map((c) => c.author.id))];
      const memberships = await ctx.db.workspaceMember.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: { in: authorIds },
        },
        select: { userId: true, role: true },
      });
      const roleByUserId = new Map(memberships.map((m) => [m.userId, m.role]));

      return comments.map((comment) => ({
        ...comment,
        // 'role' is the author's workspace membership role at time of retrieval.
        // It reflects their current role, not their role when they posted.
        authorRole: roleByUserId.get(comment.author.id) ?? null,
      }));
    }),

  /**
   * Creates a new comment on a deal.
   * All workspace members (including VIEWERs) can comment — commenting
   * is a read-adjacent collaborative action, not a data modification.
   */
  create: workspaceProcedure
    .input(CreateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the deal exists in the user's workspace.
      const deal = await ctx.db.deal.findFirst({
        where: {
          id: input.dealId,
          workspaceId: ctx.workspaceMember.workspaceId,
        },
        select: { id: true },
      });
      if (!deal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
      }

      return ctx.db.comment.create({
        data: {
          dealId: input.dealId,
          workspaceId: ctx.workspaceMember.workspaceId,
          authorId: ctx.user.id,
          text: input.text,
        },
        include: {
          author: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
      });
    }),

  /**
   * Deletes a comment. Users can delete their own comments.
   * ADMIN and OWNER can delete any comment (moderation).
   */
  delete: workspaceProcedure
    .input(
      z.object({ id: z.string().min(1), workspaceId: z.string().min(1) })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findFirst({
        where: { id: input.id, workspaceId: input.workspaceId },
      });
      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
      }

      const { role } = ctx.workspaceMember;
      const isOwnComment = comment.authorId === ctx.user.id;
      const isModeratorRole = role === "OWNER" || role === "ADMIN";

      if (!isOwnComment && !isModeratorRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments.",
        });
      }

      await ctx.db.comment.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
