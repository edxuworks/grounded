/**
 * Field Definition Router
 *
 * Manages the custom field schema for deal cards within a workspace.
 * Field definitions determine what fields appear on every deal card
 * and what input type each field uses (text, number, date).
 *
 * Key design note:
 * Field definitions are workspace-level config, not per-deal. Adding a field
 * definition immediately makes that field available on ALL deals in the workspace.
 * Existing deals will have no value for the new field (fieldValues[newId] = undefined)
 * until the user fills it in.
 *
 * Deleting a field definition does NOT delete the stored values in deal.fieldValues
 * JSONB — orphaned values are simply ignored by the frontend. This is intentional
 * to prevent accidental data loss.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { workspaceProcedure, router } from "@/trpc";
import {
  CreateFieldDefSchema,
  UpdateFieldDefSchema,
  ReorderFieldDefsSchema,
} from "@grounded/types";

export const fieldDefRouter = router({
  /** Lists all field definitions for the workspace, in display order. */
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.dealFieldDefinition.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { displayOrder: "asc" },
      });
    }),

  /** Creates a new custom field. MEMBER role or above required. */
  create: workspaceProcedure
    .input(CreateFieldDefSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot create field definitions.",
        });
      }

      // Place the new field at the end of the list by finding the current max order.
      const maxOrder = await ctx.db.dealFieldDefinition.aggregate({
        where: { workspaceId: input.workspaceId },
        _max: { displayOrder: true },
      });
      const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

      return ctx.db.dealFieldDefinition.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          fieldType: input.fieldType,
          displayOrder: input.displayOrder ?? nextOrder,
          isRequired: input.isRequired,
        },
      });
    }),

  /** Updates a field's name, type, or required flag. ADMIN/OWNER only. */
  update: workspaceProcedure
    .input(UpdateFieldDefSchema)
    .mutation(async ({ ctx, input }) => {
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can modify field definitions.",
        });
      }

      // Verify the field definition belongs to this workspace.
      const existing = await ctx.db.dealFieldDefinition.findFirst({
        where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Field definition not found." });
      }

      return ctx.db.dealFieldDefinition.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.fieldType !== undefined && { fieldType: input.fieldType }),
          ...(input.isRequired !== undefined && { isRequired: input.isRequired }),
        },
      });
    }),

  /**
   * Reorders field definitions by accepting an array of IDs in the desired order.
   * Uses a transaction to update all displayOrder values atomically — prevents
   * a partial update leaving inconsistent ordering.
   */
  reorder: workspaceProcedure
    .input(ReorderFieldDefsSchema)
    .mutation(async ({ ctx, input }) => {
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can reorder fields.",
        });
      }

      // Update all displayOrder values in a transaction.
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.dealFieldDefinition.update({
            where: { id, workspaceId: input.workspaceId },
            data: { displayOrder: index },
          })
        )
      );

      // Return the updated list in the new order.
      return ctx.db.dealFieldDefinition.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { displayOrder: "asc" },
      });
    }),

  /**
   * Deletes a field definition.
   * Note: orphaned values in deal.fieldValues JSONB are retained (not deleted).
   * See module comment above for rationale.
   */
  delete: workspaceProcedure
    .input(z.object({ id: z.string().min(1), workspaceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete field definitions.",
        });
      }

      const existing = await ctx.db.dealFieldDefinition.findFirst({
        where: { id: input.id, workspaceId: input.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Field definition not found." });
      }

      await ctx.db.dealFieldDefinition.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
