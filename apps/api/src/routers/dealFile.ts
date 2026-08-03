/**
 * Deal File Router
 *
 * Manages deal "folders" — named collections that group related deals.
 * Each deal file appears as a toggle-able layer on the map (colour-coded).
 *
 * All operations are workspace-scoped via workspaceProcedure, ensuring users
 * can only access deal files in workspaces they belong to.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { workspaceProcedure, router } from "@/trpc";
import { CreateDealFileSchema, UpdateDealFileSchema } from "@grounded/types";

export const dealFileRouter = router({
  /**
   * Lists all deal files in a workspace, ordered alphabetically.
   * Includes a count of deals in each file for the UI summary.
   */
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.dealFile.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          _count: { select: { deals: true } },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  /** Creates a new deal file in the workspace. */
  create: workspaceProcedure
    .input(CreateDealFileSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dealFile.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description ?? null,
          color: input.color,
          createdById: ctx.user.id,
        },
        include: {
          _count: { select: { deals: true } },
        },
      });
    }),

  /**
   * Updates a deal file's display properties.
   * Only members with MEMBER role or above can edit.
   * Viewers (read-only role) cannot modify deal files.
   */
  update: workspaceProcedure
    .input(UpdateDealFileSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot edit deal files.",
        });
      }

      // Verify the deal file exists and belongs to the user's workspace.
      const existing = await ctx.db.dealFile.findFirst({
        where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal file not found.",
        });
      }

      return ctx.db.dealFile.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.color !== undefined && { color: input.color }),
        },
      });
    }),

  /**
   * Deletes a deal file and all contained deals (cascade).
   * Restricted to OWNER and ADMIN to prevent accidental data loss.
   */
  delete: workspaceProcedure
    .input(z.object({ id: z.string().min(1), workspaceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete deal files.",
        });
      }

      // Verify ownership before delete — prevents deleting another workspace's files.
      const existing = await ctx.db.dealFile.findFirst({
        where: { id: input.id, workspaceId: input.workspaceId },
        include: { _count: { select: { deals: true } } },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal file not found.",
        });
      }

      // Cascade delete is configured in the Prisma schema (onDelete: Cascade),
      // so deleting the DealFile automatically deletes all contained Deals,
      // their Annotations, and Comments.
      await ctx.db.dealFile.delete({ where: { id: input.id } });

      return { success: true, deletedCount: existing._count.deals };
    }),
});
