/**
 * Deal Router
 *
 * Core CRUD for deals — the central entity in the application.
 * A deal is a real estate asset with a map location, pipeline status,
 * and workspace-defined custom field values.
 *
 * Geographic data:
 * Coordinates are stored as Float columns (longitude, latitude). The map
 * sends WGS84 decimal degrees from the click event, which we store directly.
 * Future geo-proximity queries (e.g. "deals within 1km of a station") will
 * use a PostGIS GEOMETRY column added via raw SQL migration.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { workspaceProcedure, router } from "@/trpc";
import {
  CreateDealSchema,
  UpdateDealSchema,
  UpdateFieldValuesSchema,
  ListDealsSchema,
} from "@grounded/types";

export const dealRouter = router({
  /**
   * Lists deals in a workspace, optionally filtered by deal file or status.
   * Returns coordinates so the map can render markers without separate calls.
   */
  list: workspaceProcedure
    .input(ListDealsSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.deal.findMany({
        where: {
          workspaceId: input.workspaceId,
          // Only filter by dealFileId if explicitly provided.
          ...(input.dealFileId && { dealFileId: input.dealFileId }),
          ...(input.status && { status: input.status }),
        },
        select: {
          id: true,
          title: true,
          address: true,
          longitude: true,
          latitude: true,
          status: true,
          pinned: true,
          updatedAt: true,
          dealFile: { select: { id: true, name: true, color: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { annotations: true, comments: true } },
        },
        orderBy: { updatedAt: "desc" },
        ...(input.limit && { take: input.limit }),
        ...(input.offset && { skip: input.offset }),
      });
    }),

  /**
   * Returns a single deal with full details: field values, annotations, comments.
   * Used when the user opens the deal sidebar.
   */
  getById: workspaceProcedure
    .input(z.object({ id: z.string().min(1), workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const deal = await ctx.db.deal.findFirst({
        where: { id: input.id, workspaceId: input.workspaceId },
        include: {
          dealFile: { select: { id: true, name: true, color: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          annotations: {
            orderBy: { createdAt: "asc" },
            include: {
              createdBy: { select: { id: true, fullName: true } },
            },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found.",
        });
      }

      return deal;
    }),

  /**
   * Creates a new deal pinned to a map location.
   * The dealFileId is validated to belong to the same workspace to prevent
   * cross-workspace data injection.
   */
  create: workspaceProcedure
    .input(CreateDealSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot create deals.",
        });
      }

      // Verify the dealFile belongs to this workspace.
      const dealFile = await ctx.db.dealFile.findFirst({
        where: {
          id: input.dealFileId,
          workspaceId: ctx.workspaceMember.workspaceId,
        },
      });
      if (!dealFile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal file not found in this workspace.",
        });
      }

      return ctx.db.deal.create({
        data: {
          dealFileId: input.dealFileId,
          workspaceId: ctx.workspaceMember.workspaceId,
          title: input.title,
          address: input.address,
          longitude: input.longitude,
          latitude: input.latitude,
          status: input.status,
          competitors: input.competitors.length > 0 ? input.competitors : undefined,
          createdById: ctx.user.id,
        },
        include: {
          dealFile: { select: { id: true, name: true, color: true } },
        },
      });
    }),

  /**
   * Updates deal metadata: title, address, status, pinned flag.
   * Does NOT update fieldValues — use deal.updateFieldValues for that.
   * Separating these prevents accidental overwrites of field values when
   * updating status (a common UI operation).
   */
  update: workspaceProcedure
    .input(UpdateDealSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot edit deals.",
        });
      }

      const existing = await ctx.db.deal.findFirst({
        where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
      }

      const { id, ...updates } = input;
      return ctx.db.deal.update({
        where: { id },
        data: updates,
      });
    }),

  /**
   * Updates only the custom field values (JSONB) for a deal.
   * Validates that each key in fieldValues corresponds to a known
   * DealFieldDefinition in the workspace.
   *
   * WHY a separate procedure for field values?
   * The PropertyGrid component patches individual field values frequently
   * (on blur of each input). Merging into deal.update risks the client
   * accidentally sending stale data and overwriting concurrent edits.
   */
  updateFieldValues: workspaceProcedure
    .input(UpdateFieldValuesSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.workspaceMember.role === "VIEWER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot edit deal fields.",
        });
      }

      // Validate that all keys in fieldValues are known field definitions.
      const knownDefs = await ctx.db.dealFieldDefinition.findMany({
        where: { workspaceId: ctx.workspaceMember.workspaceId },
        select: { id: true, fieldType: true },
      });
      const knownIds = new Set(knownDefs.map((d) => d.id));

      const unknownKeys = Object.keys(input.fieldValues).filter(
        (k) => !knownIds.has(k)
      );
      if (unknownKeys.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown field definition IDs: ${unknownKeys.join(", ")}`,
        });
      }

      // Merge new values into the existing JSONB — don't overwrite other fields.
      // Prisma's update with a JSON set replaces the entire column, so we need
      // to fetch current values and merge manually.
      const current = await ctx.db.deal.findFirst({
        where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId },
        select: { fieldValues: true },
      });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
      }

      const merged = {
        ...(typeof current.fieldValues === "object" ? current.fieldValues : {}),
        ...input.fieldValues,
      };

      return ctx.db.deal.update({
        where: { id: input.id },
        data: { fieldValues: merged },
        select: { id: true, fieldValues: true, updatedAt: true },
      });
    }),

  /** Deletes a deal and all associated annotations and comments (cascade). */
  delete: workspaceProcedure
    .input(z.object({ id: z.string().min(1), workspaceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { role } = ctx.workspaceMember;
      if (role !== "OWNER" && role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete deals.",
        });
      }

      const existing = await ctx.db.deal.findFirst({
        where: { id: input.id, workspaceId: input.workspaceId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
      }

      await ctx.db.deal.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
