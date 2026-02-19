/**
 * Annotation Router
 *
 * Manages spatial drawings (polygon annotations) associated with deals.
 * Annotations are drawn on the map by users to mark areas of interest
 * around a property (e.g. competitor locations, access routes, risk zones).
 *
 * All operations require the user to be a workspace member of the deal's
 * workspace — enforced by verifying deal ownership before any write.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { workspaceProcedure, router } from "@/trpc";
import { CreateAnnotationSchema, UpdateAnnotationSchema } from "@grounded/types";

export const annotationRouter = router({
  /**
   * Lists all annotations for a specific deal.
   * Returns geometry so the map can render all polygons without
   * a separate call per annotation.
   */
  listByDeal: workspaceProcedure
    .input(
      z.object({
        dealId: z.string().min(1),
        workspaceId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify the deal belongs to the user's workspace before returning data.
      const deal = await ctx.db.deal.findFirst({
        where: { id: input.dealId, workspaceId: input.workspaceId },
        select: { id: true },
      });
      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found in this workspace.",
        });
      }

      return ctx.db.annotation.findMany({
        where: { dealId: input.dealId },
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /**
   * Creates a new annotation from a map drawing.
   * The geometry is GeoJSON Polygon as produced by @mapbox/mapbox-gl-draw.
   * Validated against the GeoJSONPolygonSchema in @grounded/types.
   */
  create: workspaceProcedure
    .input(CreateAnnotationSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot create annotations.",
        });
      }

      // Verify the deal belongs to this workspace before creating the annotation.
      const deal = await ctx.db.deal.findFirst({
        where: {
          id: input.dealId,
          workspaceId: ctx.workspaceMember.workspaceId,
        },
        select: { id: true },
      });
      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found in this workspace.",
        });
      }

      return ctx.db.annotation.create({
        data: {
          dealId: input.dealId,
          workspaceId: ctx.workspaceMember.workspaceId,
          name: input.name,
          description: input.description ?? null,
          category: input.category,
          // geometry is stored as Json — the GeoJSON Polygon object from the map.
          geometry: input.geometry,
          createdById: ctx.user.id,
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      });
    }),

  /**
   * Updates an annotation's metadata or geometry.
   * A user can edit an annotation they didn't create (team collaboration).
   * Only the workspace role is checked — not the original creator.
   */
  update: workspaceProcedure
    .input(UpdateAnnotationSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot edit annotations.",
        });
      }

      const existing = await ctx.db.annotation.findFirst({
        where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Annotation not found." });
      }

      const { id, ...updates } = input;
      return ctx.db.annotation.update({
        where: { id },
        data: updates,
      });
    }),

  /** Deletes an annotation. Any member (non-viewer) can delete. */
  delete: workspaceProcedure
    .input(
      z.object({ id: z.string().min(1), workspaceId: z.string().min(1) })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot delete annotations.",
        });
      }

      const existing = await ctx.db.annotation.findFirst({
        where: { id: input.id, workspaceId: input.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Annotation not found." });
      }

      await ctx.db.annotation.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
