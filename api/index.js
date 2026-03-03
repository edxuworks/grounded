"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_dns = __toESM(require("dns"));
var import_express = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_helmet = __toESM(require("helmet"));
var import_express2 = require("@trpc/server/adapters/express");

// src/trpc.ts
var import_server = require("@trpc/server");
var import_zod = require("zod");
var t = import_server.initTRPC.context().create({
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
        zodError: error.cause instanceof import_zod.ZodError ? error.cause.flatten() : null
      }
    };
  }
});
var isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new import_server.TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action."
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
var hasWorkspaceAccess = t.middleware(async ({ ctx, getRawInput, next }) => {
  if (!ctx.user) {
    throw new import_server.TRPCError({ code: "UNAUTHORIZED" });
  }
  const rawInput = await getRawInput();
  const workspaceId = rawInput && typeof rawInput === "object" && "workspaceId" in rawInput ? rawInput.workspaceId : null;
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new import_server.TRPCError({
      code: "BAD_REQUEST",
      message: "workspaceId is required for this operation."
    });
  }
  const member = await ctx.db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: ctx.user.id
      }
    },
    include: { workspace: true }
  });
  if (!member) {
    throw new import_server.TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this workspace."
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      // Attach the member record so handlers can check roles without
      // an additional DB query.
      workspaceMember: member
    }
  });
});
var router = t.router;
var mergeRouters = t.mergeRouters;
var publicProcedure = t.procedure;
var protectedProcedure = t.procedure.use(isAuthenticated);
var workspaceProcedure = t.procedure.use(isAuthenticated).use(hasWorkspaceAccess);

// src/routers/auth.ts
var import_zod2 = require("zod");
var import_server2 = require("@trpc/server");
var authRouter = router({
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
              select: { id: true, name: true, slug: true, plan: true }
            }
          }
        }
      }
    });
    return user;
  }),
  /**
   * Upserts the authenticated user into public.users.
   * Called by the frontend after every successful login/signup.
   * Safe to call multiple times — uses upsert to avoid duplicates.
   */
  syncUser: protectedProcedure.input(
    import_zod2.z.object({
      fullName: import_zod2.z.string().max(200).optional(),
      avatarUrl: import_zod2.z.string().url().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const user = await ctx.db.user.upsert({
        where: { id: ctx.user.id },
        create: {
          id: ctx.user.id,
          email: ctx.user.email,
          fullName: input.fullName ?? null,
          avatarUrl: input.avatarUrl ?? null
        },
        update: {
          // Only update if the value is provided — don't overwrite with null.
          ...input.fullName && { fullName: input.fullName },
          ...input.avatarUrl && { avatarUrl: input.avatarUrl }
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true
        }
      });
      return user;
    } catch (error) {
      throw new import_server2.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to sync user profile. Please try again.",
        cause: error
      });
    }
  })
});

// src/routers/workspace.ts
var import_zod3 = require("zod");
var import_server3 = require("@trpc/server");
var import_types = require("@grounded/types");
var workspaceRouter = router({
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
              select: { deals: true, members: true }
            }
          }
        }
      },
      orderBy: { workspace: { createdAt: "desc" } }
    });
    return memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role
    }));
  }),
  /**
   * Creates a new workspace and adds the creator as OWNER.
   * The two writes (workspace + member) are wrapped in a transaction
   * to prevent orphaned workspaces with no owner.
   */
  create: protectedProcedure.input(import_types.CreateWorkspaceSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.workspace.findUnique({
      where: { slug: input.slug }
    });
    if (existing) {
      throw new import_server3.TRPCError({
        code: "CONFLICT",
        message: `The slug "${input.slug}" is already taken. Please choose another.`
      });
    }
    return ctx.db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: input.name, slug: input.slug }
      });
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: ctx.user.id,
          role: "OWNER"
        }
      });
      return workspace;
    });
  }),
  /** Updates workspace name. Restricted to OWNER or ADMIN. */
  update: workspaceProcedure.input(import_types.UpdateWorkspaceSchema).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server3.TRPCError({
        code: "FORBIDDEN",
        message: "Only workspace owners and admins can update workspace settings."
      });
    }
    return ctx.db.workspace.update({
      where: { id: input.id },
      data: { ...input.name && { name: input.name } }
    });
  }),
  /**
   * Invites a user to the workspace by email.
   * If the user exists in our system, adds them immediately.
   * If not, returns a pending state (invite emails are a v2+ feature).
   */
  addMember: workspaceProcedure.input(
    import_zod3.z.object({
      workspaceId: import_zod3.z.string().min(1),
      email: import_zod3.z.string().email(),
      role: import_zod3.z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER")
    })
  ).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server3.TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can add members."
      });
    }
    const targetUser = await ctx.db.user.findUnique({
      where: { email: input.email }
    });
    if (!targetUser) {
      throw new import_server3.TRPCError({
        code: "NOT_FOUND",
        message: `No account found for ${input.email}. They must sign up first.`
      });
    }
    const existing = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: targetUser.id
        }
      }
    });
    if (existing) {
      throw new import_server3.TRPCError({
        code: "CONFLICT",
        message: `${input.email} is already a member of this workspace.`
      });
    }
    return ctx.db.workspaceMember.create({
      data: {
        workspaceId: input.workspaceId,
        userId: targetUser.id,
        role: input.role
      },
      include: { user: { select: { id: true, email: true, fullName: true } } }
    });
  }),
  /** Lists all members of a workspace. */
  listMembers: workspaceProcedure.input(import_zod3.z.object({ workspaceId: import_zod3.z.string().min(1) })).query(async ({ ctx, input }) => {
    return ctx.db.workspaceMember.findMany({
      where: { workspaceId: input.workspaceId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, avatarUrl: true }
        }
      },
      orderBy: { joinedAt: "asc" }
    });
  }),
  /**
   * Dev-only: returns the shared "playground" workspace, creating it if it
   * doesn't exist and ensuring the current dev user is a member.
   *
   * All devs who run with DEV_BYPASS_AUTH=true share this one workspace so
   * data (deals, annotations, etc.) persists and stays in sync across sessions.
   *
   * Throws FORBIDDEN if called outside of dev bypass mode.
   */
  getPlayground: protectedProcedure.query(async ({ ctx }) => {
    if (process.env["DEV_BYPASS_AUTH"] !== "true") {
      throw new import_server3.TRPCError({
        code: "FORBIDDEN",
        message: "getPlayground is only available when DEV_BYPASS_AUTH=true."
      });
    }
    const workspace = await ctx.db.workspace.upsert({
      where: { slug: "playground" },
      create: { name: "Playground", slug: "playground" },
      update: {}
    });
    await ctx.db.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: ctx.user.id
        }
      },
      create: {
        workspaceId: workspace.id,
        userId: ctx.user.id,
        role: "OWNER"
      },
      update: {}
    });
    return { ...workspace, myRole: "OWNER" };
  })
});

// src/routers/dealFile.ts
var import_zod4 = require("zod");
var import_server4 = require("@trpc/server");
var import_types2 = require("@grounded/types");
var dealFileRouter = router({
  /**
   * Lists all deal files in a workspace, ordered alphabetically.
   * Includes a count of deals in each file for the UI summary.
   */
  list: workspaceProcedure.input(import_zod4.z.object({ workspaceId: import_zod4.z.string().min(1) })).query(async ({ ctx, input }) => {
    return ctx.db.dealFile.findMany({
      where: { workspaceId: input.workspaceId },
      include: {
        _count: { select: { deals: true } },
        createdBy: {
          select: { id: true, fullName: true, email: true }
        }
      },
      orderBy: { name: "asc" }
    });
  }),
  /** Creates a new deal file in the workspace. */
  create: workspaceProcedure.input(import_types2.CreateDealFileSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.dealFile.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        createdById: ctx.user.id
      },
      include: {
        _count: { select: { deals: true } }
      }
    });
  }),
  /**
   * Updates a deal file's display properties.
   * Only members with MEMBER role or above can edit.
   * Viewers (read-only role) cannot modify deal files.
   */
  update: workspaceProcedure.input(import_types2.UpdateDealFileSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server4.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot edit deal files."
      });
    }
    const existing = await ctx.db.dealFile.findFirst({
      where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId }
    });
    if (!existing) {
      throw new import_server4.TRPCError({
        code: "NOT_FOUND",
        message: "Deal file not found."
      });
    }
    return ctx.db.dealFile.update({
      where: { id: input.id },
      data: {
        ...input.name !== void 0 && { name: input.name },
        ...input.description !== void 0 && { description: input.description },
        ...input.color !== void 0 && { color: input.color }
      }
    });
  }),
  /**
   * Deletes a deal file and all contained deals (cascade).
   * Restricted to OWNER and ADMIN to prevent accidental data loss.
   */
  delete: workspaceProcedure.input(import_zod4.z.object({ id: import_zod4.z.string().min(1), workspaceId: import_zod4.z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server4.TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can delete deal files."
      });
    }
    const existing = await ctx.db.dealFile.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId },
      include: { _count: { select: { deals: true } } }
    });
    if (!existing) {
      throw new import_server4.TRPCError({
        code: "NOT_FOUND",
        message: "Deal file not found."
      });
    }
    await ctx.db.dealFile.delete({ where: { id: input.id } });
    return { success: true, deletedCount: existing._count.deals };
  })
});

// src/routers/fieldDef.ts
var import_zod5 = require("zod");
var import_server5 = require("@trpc/server");
var import_types3 = require("@grounded/types");
var fieldDefRouter = router({
  /** Lists all field definitions for the workspace, in display order. */
  list: workspaceProcedure.input(import_zod5.z.object({ workspaceId: import_zod5.z.string().min(1) })).query(async ({ ctx, input }) => {
    return ctx.db.dealFieldDefinition.findMany({
      where: { workspaceId: input.workspaceId },
      orderBy: { displayOrder: "asc" }
    });
  }),
  /** Creates a new custom field. MEMBER role or above required. */
  create: workspaceProcedure.input(import_types3.CreateFieldDefSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server5.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot create field definitions."
      });
    }
    const maxOrder = await ctx.db.dealFieldDefinition.aggregate({
      where: { workspaceId: input.workspaceId },
      _max: { displayOrder: true }
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    return ctx.db.dealFieldDefinition.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        fieldType: input.fieldType,
        displayOrder: input.displayOrder ?? nextOrder,
        isRequired: input.isRequired
      }
    });
  }),
  /** Updates a field's name, type, or required flag. ADMIN/OWNER only. */
  update: workspaceProcedure.input(import_types3.UpdateFieldDefSchema).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server5.TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can modify field definitions."
      });
    }
    const existing = await ctx.db.dealFieldDefinition.findFirst({
      where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId }
    });
    if (!existing) {
      throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Field definition not found." });
    }
    return ctx.db.dealFieldDefinition.update({
      where: { id: input.id },
      data: {
        ...input.name !== void 0 && { name: input.name },
        ...input.fieldType !== void 0 && { fieldType: input.fieldType },
        ...input.isRequired !== void 0 && { isRequired: input.isRequired }
      }
    });
  }),
  /**
   * Reorders field definitions by accepting an array of IDs in the desired order.
   * Uses a transaction to update all displayOrder values atomically — prevents
   * a partial update leaving inconsistent ordering.
   */
  reorder: workspaceProcedure.input(import_types3.ReorderFieldDefsSchema).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server5.TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can reorder fields."
      });
    }
    await ctx.db.$transaction(
      input.orderedIds.map(
        (id, index) => ctx.db.dealFieldDefinition.update({
          where: { id, workspaceId: input.workspaceId },
          data: { displayOrder: index }
        })
      )
    );
    return ctx.db.dealFieldDefinition.findMany({
      where: { workspaceId: input.workspaceId },
      orderBy: { displayOrder: "asc" }
    });
  }),
  /**
   * Deletes a field definition.
   * Note: orphaned values in deal.fieldValues JSONB are retained (not deleted).
   * See module comment above for rationale.
   */
  delete: workspaceProcedure.input(import_zod5.z.object({ id: import_zod5.z.string().min(1), workspaceId: import_zod5.z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server5.TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can delete field definitions."
      });
    }
    const existing = await ctx.db.dealFieldDefinition.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId }
    });
    if (!existing) {
      throw new import_server5.TRPCError({ code: "NOT_FOUND", message: "Field definition not found." });
    }
    await ctx.db.dealFieldDefinition.delete({ where: { id: input.id } });
    return { success: true };
  })
});

// src/routers/deal.ts
var import_zod6 = require("zod");
var import_server6 = require("@trpc/server");
var import_types4 = require("@grounded/types");
var dealRouter = router({
  /**
   * Lists deals in a workspace, optionally filtered by deal file or status.
   * Returns coordinates so the map can render markers without separate calls.
   */
  list: workspaceProcedure.input(import_types4.ListDealsSchema).query(async ({ ctx, input }) => {
    return ctx.db.deal.findMany({
      where: {
        workspaceId: input.workspaceId,
        // Only filter by dealFileId if explicitly provided.
        ...input.dealFileId && { dealFileId: input.dealFileId },
        ...input.status && { status: input.status }
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
        _count: { select: { annotations: true, comments: true } }
      },
      orderBy: { updatedAt: "desc" },
      ...input.limit && { take: input.limit },
      ...input.offset && { skip: input.offset }
    });
  }),
  /**
   * Returns a single deal with full details: field values, annotations, comments.
   * Used when the user opens the deal sidebar.
   */
  getById: workspaceProcedure.input(import_zod6.z.object({ id: import_zod6.z.string().min(1), workspaceId: import_zod6.z.string().min(1) })).query(async ({ ctx, input }) => {
    const deal = await ctx.db.deal.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId },
      include: {
        dealFile: { select: { id: true, name: true, color: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        annotations: {
          orderBy: { createdAt: "asc" },
          include: {
            createdBy: { select: { id: true, fullName: true } }
          }
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
    if (!deal) {
      throw new import_server6.TRPCError({
        code: "NOT_FOUND",
        message: "Deal not found."
      });
    }
    return deal;
  }),
  /**
   * Creates a new deal pinned to a map location.
   * The dealFileId is validated to belong to the same workspace to prevent
   * cross-workspace data injection.
   */
  create: workspaceProcedure.input(import_types4.CreateDealSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server6.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot create deals."
      });
    }
    const dealFile = await ctx.db.dealFile.findFirst({
      where: {
        id: input.dealFileId,
        workspaceId: ctx.workspaceMember.workspaceId
      }
    });
    if (!dealFile) {
      throw new import_server6.TRPCError({
        code: "NOT_FOUND",
        message: "Deal file not found in this workspace."
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
        competitors: input.competitors.length > 0 ? input.competitors : void 0,
        createdById: ctx.user.id
      },
      include: {
        dealFile: { select: { id: true, name: true, color: true } }
      }
    });
  }),
  /**
   * Updates deal metadata: title, address, status, pinned flag.
   * Does NOT update fieldValues — use deal.updateFieldValues for that.
   * Separating these prevents accidental overwrites of field values when
   * updating status (a common UI operation).
   */
  update: workspaceProcedure.input(import_types4.UpdateDealSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server6.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot edit deals."
      });
    }
    const existing = await ctx.db.deal.findFirst({
      where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId }
    });
    if (!existing) {
      throw new import_server6.TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
    }
    const { id, ...updates } = input;
    return ctx.db.deal.update({
      where: { id },
      data: updates
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
  updateFieldValues: workspaceProcedure.input(import_types4.UpdateFieldValuesSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server6.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot edit deal fields."
      });
    }
    const knownDefs = await ctx.db.dealFieldDefinition.findMany({
      where: { workspaceId: ctx.workspaceMember.workspaceId },
      select: { id: true, fieldType: true }
    });
    const knownIds = new Set(knownDefs.map((d) => d.id));
    const unknownKeys = Object.keys(input.fieldValues).filter(
      (k) => !knownIds.has(k)
    );
    if (unknownKeys.length > 0) {
      throw new import_server6.TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown field definition IDs: ${unknownKeys.join(", ")}`
      });
    }
    const current = await ctx.db.deal.findFirst({
      where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId },
      select: { fieldValues: true }
    });
    if (!current) {
      throw new import_server6.TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
    }
    const merged = {
      ...typeof current.fieldValues === "object" ? current.fieldValues : {},
      ...input.fieldValues
    };
    return ctx.db.deal.update({
      where: { id: input.id },
      data: { fieldValues: merged },
      select: { id: true, fieldValues: true, updatedAt: true }
    });
  }),
  /** Deletes a deal and all associated annotations and comments (cascade). */
  delete: workspaceProcedure.input(import_zod6.z.object({ id: import_zod6.z.string().min(1), workspaceId: import_zod6.z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const { role } = ctx.workspaceMember;
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new import_server6.TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can delete deals."
      });
    }
    const existing = await ctx.db.deal.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId }
    });
    if (!existing) {
      throw new import_server6.TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
    }
    await ctx.db.deal.delete({ where: { id: input.id } });
    return { success: true };
  })
});

// src/routers/annotation.ts
var import_zod7 = require("zod");
var import_server7 = require("@trpc/server");
var import_types5 = require("@grounded/types");
var annotationRouter = router({
  /**
   * Lists all annotations for a specific deal.
   * Returns geometry so the map can render all polygons without
   * a separate call per annotation.
   */
  listByDeal: workspaceProcedure.input(
    import_zod7.z.object({
      dealId: import_zod7.z.string().min(1),
      workspaceId: import_zod7.z.string().min(1)
    })
  ).query(async ({ ctx, input }) => {
    const deal = await ctx.db.deal.findFirst({
      where: { id: input.dealId, workspaceId: input.workspaceId },
      select: { id: true }
    });
    if (!deal) {
      throw new import_server7.TRPCError({
        code: "NOT_FOUND",
        message: "Deal not found in this workspace."
      });
    }
    return ctx.db.annotation.findMany({
      where: { dealId: input.dealId },
      include: {
        createdBy: { select: { id: true, fullName: true } }
      },
      orderBy: { createdAt: "asc" }
    });
  }),
  /**
   * Creates a new annotation from a map drawing.
   * The geometry is GeoJSON Polygon as produced by @mapbox/mapbox-gl-draw.
   * Validated against the GeoJSONPolygonSchema in @grounded/types.
   */
  create: workspaceProcedure.input(import_types5.CreateAnnotationSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server7.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot create annotations."
      });
    }
    const deal = await ctx.db.deal.findFirst({
      where: {
        id: input.dealId,
        workspaceId: ctx.workspaceMember.workspaceId
      },
      select: { id: true }
    });
    if (!deal) {
      throw new import_server7.TRPCError({
        code: "NOT_FOUND",
        message: "Deal not found in this workspace."
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
        createdById: ctx.user.id
      },
      include: {
        createdBy: { select: { id: true, fullName: true } }
      }
    });
  }),
  /**
   * Updates an annotation's metadata or geometry.
   * A user can edit an annotation they didn't create (team collaboration).
   * Only the workspace role is checked — not the original creator.
   */
  update: workspaceProcedure.input(import_types5.UpdateAnnotationSchema).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server7.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot edit annotations."
      });
    }
    const existing = await ctx.db.annotation.findFirst({
      where: { id: input.id, workspaceId: ctx.workspaceMember.workspaceId }
    });
    if (!existing) {
      throw new import_server7.TRPCError({ code: "NOT_FOUND", message: "Annotation not found." });
    }
    const { id, ...updates } = input;
    return ctx.db.annotation.update({
      where: { id },
      data: updates
    });
  }),
  /** Deletes an annotation. Any member (non-viewer) can delete. */
  delete: workspaceProcedure.input(
    import_zod7.z.object({ id: import_zod7.z.string().min(1), workspaceId: import_zod7.z.string().min(1) })
  ).mutation(async ({ ctx, input }) => {
    if (ctx.workspaceMember.role === "VIEWER") {
      throw new import_server7.TRPCError({
        code: "FORBIDDEN",
        message: "Viewers cannot delete annotations."
      });
    }
    const existing = await ctx.db.annotation.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId }
    });
    if (!existing) {
      throw new import_server7.TRPCError({ code: "NOT_FOUND", message: "Annotation not found." });
    }
    await ctx.db.annotation.delete({ where: { id: input.id } });
    return { success: true };
  })
});

// src/routers/comment.ts
var import_zod8 = require("zod");
var import_server8 = require("@trpc/server");
var import_types6 = require("@grounded/types");
var commentRouter = router({
  /**
   * Lists all comments for a deal, oldest first.
   * Includes the author's workspace role so the UI can display role badges
   * (e.g. "Analyst", "Investor") without a separate lookup.
   */
  listByDeal: workspaceProcedure.input(
    import_zod8.z.object({
      dealId: import_zod8.z.string().min(1),
      workspaceId: import_zod8.z.string().min(1)
    })
  ).query(async ({ ctx, input }) => {
    const deal = await ctx.db.deal.findFirst({
      where: { id: input.dealId, workspaceId: input.workspaceId },
      select: { id: true }
    });
    if (!deal) {
      throw new import_server8.TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
    }
    const comments = await ctx.db.comment.findMany({
      where: { dealId: input.dealId },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    const authorIds = [...new Set(comments.map((c) => c.author.id))];
    const memberships = await ctx.db.workspaceMember.findMany({
      where: {
        workspaceId: input.workspaceId,
        userId: { in: authorIds }
      },
      select: { userId: true, role: true }
    });
    const roleByUserId = new Map(memberships.map((m) => [m.userId, m.role]));
    return comments.map((comment) => ({
      ...comment,
      // 'role' is the author's workspace membership role at time of retrieval.
      // It reflects their current role, not their role when they posted.
      authorRole: roleByUserId.get(comment.author.id) ?? null
    }));
  }),
  /**
   * Creates a new comment on a deal.
   * All workspace members (including VIEWERs) can comment — commenting
   * is a read-adjacent collaborative action, not a data modification.
   */
  create: workspaceProcedure.input(import_types6.CreateCommentSchema).mutation(async ({ ctx, input }) => {
    const deal = await ctx.db.deal.findFirst({
      where: {
        id: input.dealId,
        workspaceId: ctx.workspaceMember.workspaceId
      },
      select: { id: true }
    });
    if (!deal) {
      throw new import_server8.TRPCError({ code: "NOT_FOUND", message: "Deal not found." });
    }
    return ctx.db.comment.create({
      data: {
        dealId: input.dealId,
        workspaceId: ctx.workspaceMember.workspaceId,
        authorId: ctx.user.id,
        text: input.text
      },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarUrl: true }
        }
      }
    });
  }),
  /**
   * Deletes a comment. Users can delete their own comments.
   * ADMIN and OWNER can delete any comment (moderation).
   */
  delete: workspaceProcedure.input(
    import_zod8.z.object({ id: import_zod8.z.string().min(1), workspaceId: import_zod8.z.string().min(1) })
  ).mutation(async ({ ctx, input }) => {
    const comment = await ctx.db.comment.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId }
    });
    if (!comment) {
      throw new import_server8.TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
    }
    const { role } = ctx.workspaceMember;
    const isOwnComment = comment.authorId === ctx.user.id;
    const isModeratorRole = role === "OWNER" || role === "ADMIN";
    if (!isOwnComment && !isModeratorRole) {
      throw new import_server8.TRPCError({
        code: "FORBIDDEN",
        message: "You can only delete your own comments."
      });
    }
    await ctx.db.comment.delete({ where: { id: input.id } });
    return { success: true };
  })
});

// src/routers/mapbox.ts
var import_types7 = require("@grounded/types");
var MAPBOX_TRANSIT_TILESET = "mapbox.mapbox-streets-v8";
var TRANSIT_LAYERS = ["transit_stop_label"];
var mapboxRouter = router({
  /**
   * Queries transport POI (rail, underground, bus stations) within a radius
   * of a given coordinate using the Mapbox Tilequery API.
   *
   * Returns GeoJSON features with properties including:
   *  - name: station name
   *  - type: 'rail', 'subway', 'bus' etc.
   *  - distance: distance from query point in metres
   *
   * Graceful degradation: if the Mapbox API is unavailable, returns an empty
   * array rather than throwing — the map layer simply won't render, but the
   * rest of the application continues to function.
   */
  queryTransportPOI: protectedProcedure.input(import_types7.MapboxTransportQuerySchema).query(async ({ input }) => {
    const token = process.env["MAPBOX_SECRET_TOKEN"];
    if (!token) {
      console.error("[mapbox] MAPBOX_SECRET_TOKEN is not set");
      return { features: [], error: "Mapbox transport data unavailable" };
    }
    const params = new URLSearchParams({
      layers: TRANSIT_LAYERS.join(","),
      radius: String(input.radius),
      limit: "20",
      dedupe: "true",
      access_token: token
    });
    const url = `https://api.mapbox.com/v4/${MAPBOX_TRANSIT_TILESET}/tilequery/${input.longitude},${input.latitude}.json?${params.toString()}`;
    try {
      const response = await fetch(url, {
        // 8s timeout — Mapbox is usually <200ms; anything longer indicates
        // a problem we should surface gracefully rather than hang on.
        signal: AbortSignal.timeout(8e3)
      });
      if (!response.ok) {
        console.error(
          `[mapbox] Tilequery returned HTTP ${response.status} for ${input.longitude},${input.latitude}`
        );
        return { features: [], error: `Mapbox API error: ${response.status}` };
      }
      const data = await response.json();
      return { features: data.features ?? [], error: null };
    } catch (err) {
      console.error("[mapbox] Tilequery request failed:", err);
      return { features: [], error: "Transport data temporarily unavailable" };
    }
  })
});

// src/routers/document.ts
var import_zod9 = require("zod");
var import_server9 = require("@trpc/server");
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
function getAnthropicClient() {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new import_server9.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ANTHROPIC_API_KEY is not configured on the server."
    });
  }
  return new import_sdk.default({ apiKey });
}
var documentRouter = router({
  /**
   * Sends a base64-encoded PDF to Claude and extracts the primary subject
   * property address. Returns structured address fields or throws if no
   * address can be found.
   *
   * Model: claude-haiku-4-5 — address extraction is a simple task and
   * Haiku is ~10x cheaper than Sonnet with no quality difference here.
   *
   * PDF limits: Claude supports up to 32MB / ~100 pages. The frontend
   * validates size before calling this endpoint.
   */
  analyzeDocument: protectedProcedure.input(
    import_zod9.z.object({
      fileBase64: import_zod9.z.string().min(1),
      fileName: import_zod9.z.string().min(1).max(255)
    })
  ).mutation(async ({ input }) => {
    const anthropic = getAnthropicClient();
    let response;
    try {
      response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: input.fileBase64
                }
              },
              {
                type: "text",
                text: `You are a real estate document analyst. Extract the subject property address and any competitor properties from this offering memorandum or property investment document.

Return ONLY a valid JSON object with these exact fields:
{
  "subject": {
    "address": "street address",
    "city": "city name",
    "state": "state or county",
    "zip": "postcode or zip code",
    "full_address": "full formatted address on one line"
  },
  "competitors": [
    { "name": "Property name", "address": "full address on one line or null if not stated in document" }
  ]
}

Rules:
- "subject" is the primary property being offered/sold. If not found, return { "error": "Address not found" } at the top level instead.
- "competitors" is a list of competing properties explicitly mentioned in the document (comparable sales, competing hotels, nearby retail etc.). Set "address" to null if the document does not include the competitor's address.
- Return an empty array [] for "competitors" if none are mentioned.
- Do not include any text outside the JSON object.`
              }
            ]
          }
        ]
      });
    } catch (err) {
      console.error("[document] Claude API request failed:", err);
      throw new import_server9.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to analyse document. Please try again."
      });
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new import_server9.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected response format from Claude."
      });
    }
    const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[document] Failed to parse Claude response as JSON:", raw);
      throw new import_server9.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not parse address from document. Try a different file."
      });
    }
    if ("error" in parsed) {
      throw new import_server9.TRPCError({
        code: "UNPROCESSABLE_CONTENT",
        message: "No property address found in this document. Please check the file and try again."
      });
    }
    return {
      ...parsed.subject,
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : []
    };
  }),
  /**
   * Geocodes a free-text address to coordinates using the Mapbox Geocoding API.
   * Falls back to the public Mapbox token if the secret token is not set —
   * the geocoding endpoint works with both.
   *
   * Returns { lat, lng, place_name } where place_name is Mapbox's normalised
   * formatted address (useful to display back to the user).
   */
  geocodeAddress: protectedProcedure.input(import_zod9.z.object({ full_address: import_zod9.z.string().min(1).max(500) })).mutation(async ({ input }) => {
    const token = process.env["MAPBOX_SECRET_TOKEN"] || process.env["VITE_MAPBOX_PUBLIC_TOKEN"];
    if (!token) {
      throw new import_server9.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Mapbox token is not configured on the server."
      });
    }
    const encoded = encodeURIComponent(input.full_address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`;
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
    } catch (err) {
      console.error("[document] Mapbox geocoding request failed:", err);
      throw new import_server9.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Geocoding request timed out. Please try again."
      });
    }
    if (!response.ok) {
      console.error(`[document] Mapbox geocoding returned HTTP ${response.status}`);
      throw new import_server9.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Geocoding failed (HTTP ${response.status}). Please try again.`
      });
    }
    const data = await response.json();
    const feature = data.features[0];
    if (!feature) {
      throw new import_server9.TRPCError({
        code: "UNPROCESSABLE_CONTENT",
        message: "Could not find this address on the map. You can plot it manually instead."
      });
    }
    return {
      lng: feature.center[0],
      lat: feature.center[1],
      place_name: feature.place_name
    };
  })
});

// src/routers/planning.ts
var import_types8 = require("@grounded/types");

// src/lib/cache.ts
var import_lru_cache = require("lru-cache");
function createApiCache(options) {
  const lru = new import_lru_cache.LRUCache({
    max: options.maxSize,
    ttl: options.ttlMs
  });
  return {
    get: (key) => lru.get(key),
    set: (key, value) => lru.set(key, value),
    has: (key) => lru.has(key),
    clear: () => lru.clear()
  };
}

// src/routers/planning.ts
var constraintsCache = createApiCache({
  maxSize: 500,
  ttlMs: 864e5
});
var applicationsCache = createApiCache({
  maxSize: 500,
  ttlMs: 864e5
});
async function fetchMHCLGDataset(dataset, lat, lng) {
  const url = `https://www.planning.data.gov.uk/entity.geojson?dataset=${dataset}&longitude=${lng}&latitude=${lat}&limit=20`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
    if (!response.ok) return { entities: [], count: 0 };
    const data = await response.json();
    return {
      entities: data.features ?? [],
      count: data.features?.length ?? 0
    };
  } catch {
    return { entities: [], count: 0 };
  }
}
var planningRouter = router({
  /**
   * Get planning constraints for a point from MHCLG Planning Data.
   * Parallel-fetches multiple dataset types and returns summary + GeoJSON features.
   */
  getConstraints: protectedProcedure.input(import_types8.PlanningConstraintsQuerySchema).query(async ({ input }) => {
    const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
    const cached = constraintsCache.get(cacheKey);
    if (cached) return cached;
    const [conservation, article4, listed, brownfield, greenBelt] = await Promise.all([
      fetchMHCLGDataset("conservation-area", input.latitude, input.longitude),
      fetchMHCLGDataset("article-4-direction-area", input.latitude, input.longitude),
      fetchMHCLGDataset("listed-building-outline", input.latitude, input.longitude),
      fetchMHCLGDataset("brownfield-land", input.latitude, input.longitude),
      fetchMHCLGDataset("green-belt-core", input.latitude, input.longitude)
    ]);
    const allFeatures = [
      ...conservation.entities,
      ...article4.entities,
      ...listed.entities,
      ...brownfield.entities,
      ...greenBelt.entities
    ];
    const result = {
      conservationArea: conservation.count > 0,
      article4: article4.count > 0,
      listedBuildingsCount: listed.count,
      greenBelt: greenBelt.count > 0,
      brownfield: brownfield.count > 0,
      features: allFeatures
    };
    constraintsCache.set(cacheKey, result);
    return result;
  }),
  /**
   * Get recent planning applications near a point from PlanIt.
   */
  getApplications: protectedProcedure.input(import_types8.PlanningApplicationsQuerySchema).query(async ({ input }) => {
    const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)},${input.radius}`;
    const cached = applicationsCache.get(cacheKey);
    if (cached) return cached;
    try {
      const krad = input.radius / 1e3;
      const url = `https://www.planit.org.uk/api/applics/json?lat=${input.latitude}&lng=${input.longitude}&krad=${krad}&pg_sz=20`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
      if (!response.ok) return { applications: [] };
      const data = await response.json();
      const applications = (data.records ?? []).map((r) => ({
        id: r.uid ?? "",
        description: r.description ?? "No description",
        status: r.app_state ?? "Pending",
        date: r.decided_date ?? r.start_date ?? "",
        latitude: r.location_y ?? 0,
        longitude: r.location_x ?? 0
      }));
      const result = { applications };
      applicationsCache.set(cacheKey, result);
      return result;
    } catch {
      return { applications: [] };
    }
  })
});

// src/routers/crime.ts
var import_types9 = require("@grounded/types");
var crimeCache = createApiCache({
  maxSize: 500,
  ttlMs: 216e5
  // 6h
});
function formatCategory(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
var crimeRouter = router({
  /**
   * Get street crime data within 1 mile of a point.
   * Returns summary stats + raw points for heatmap rendering.
   */
  getStreetCrime: protectedProcedure.input(import_types9.CrimeQuerySchema).query(async ({ input }) => {
    const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
    const cached = crimeCache.get(cacheKey);
    if (cached) return cached;
    try {
      const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${input.latitude}&lng=${input.longitude}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
      if (!response.ok) {
        return { totalCrimes: 0, topCategories: [], period: null, points: [] };
      }
      const crimes = await response.json();
      const categoryMap = /* @__PURE__ */ new Map();
      const points = [];
      for (const crime of crimes) {
        const cat = formatCategory(crime.category);
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
        points.push({
          latitude: parseFloat(crime.location.latitude),
          longitude: parseFloat(crime.location.longitude),
          category: cat
        });
      }
      const topCategories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([category, count]) => ({ category, count }));
      const period = crimes[0]?.month ?? null;
      const result = {
        totalCrimes: crimes.length,
        topCategories,
        period,
        points
      };
      crimeCache.set(cacheKey, result);
      return result;
    } catch {
      return { totalCrimes: 0, topCategories: [], period: null, points: [] };
    }
  })
});

// src/routers/environment.ts
var import_types10 = require("@grounded/types");
var floodCache = createApiCache({
  maxSize: 500,
  ttlMs: 9e5
  // 15 min
});
var environmentRouter = router({
  /**
   * Get flood risk data for a location.
   * Returns flood zone classification, active warnings, and nearest monitoring station.
   */
  getFloodRisk: protectedProcedure.input(import_types10.FloodRiskQuerySchema).query(async ({ input }) => {
    const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
    const cached = floodCache.get(cacheKey);
    if (cached) return cached;
    const [warnings, stations] = await Promise.all([
      fetchFloodWarnings(input.latitude, input.longitude),
      fetchMonitoringStations(input.latitude, input.longitude)
    ]);
    const result = {
      floodZone: null,
      // Flood zones come from WMS overlay — not available via REST API
      activeWarnings: warnings.length,
      warnings: warnings.map((w) => ({
        severity: w.severityLevel ?? "Unknown",
        message: w.message ?? "",
        timeRaised: w.timeRaised ?? ""
      })),
      nearestStation: stations[0]?.label ?? null
    };
    floodCache.set(cacheKey, result);
    return result;
  })
});
async function fetchFloodWarnings(lat, lng) {
  try {
    const url = `https://environment.data.gov.uk/flood-monitoring/id/floods?lat=${lat}&long=${lng}&dist=5`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items ?? []).map((item) => ({
      severityLevel: item.severity ?? `Level ${item.severityLevel}`,
      message: item.message ?? "",
      timeRaised: item.timeRaised ?? ""
    }));
  } catch {
    return [];
  }
}
async function fetchMonitoringStations(lat, lng) {
  try {
    const url = `https://environment.data.gov.uk/flood-monitoring/id/stations?lat=${lat}&long=${lng}&dist=3&_limit=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items ?? []).map((item) => ({
      label: item.label ?? "Unknown station",
      distance: item.dist ?? 0
    }));
  } catch {
    return [];
  }
}

// src/routers/property.ts
var import_types11 = require("@grounded/types");
var epcCache = createApiCache({
  maxSize: 500,
  ttlMs: 864e5
  // 24h
});
var broadbandCache = createApiCache({
  maxSize: 500,
  ttlMs: 6048e5
  // 7 days
});
function extractPostcode(address) {
  const match = address.match(
    /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i
  );
  return match?.[1] ? match[1].toUpperCase().replace(/\s+/g, " ") : null;
}
var propertyRouter = router({
  /**
   * Get EPC (Energy Performance Certificate) data for a property.
   * Searches by postcode extracted from the address, then fuzzy-matches.
   */
  getEPC: protectedProcedure.input(import_types11.EPCQuerySchema).query(async ({ input }) => {
    const cacheKey = `epc:${input.address}`;
    const cached = epcCache.get(cacheKey);
    if (cached) return cached;
    const email = process.env["EPC_API_EMAIL"];
    const apiKey = process.env["EPC_API_KEY"];
    if (!email || !apiKey) {
      console.error("[property] EPC_API_EMAIL or EPC_API_KEY not configured");
      return null;
    }
    const postcode = extractPostcode(input.address);
    if (!postcode) return null;
    try {
      const encoded = encodeURIComponent(postcode);
      const url = `https://epc.opendatacommunities.org/api/v1/non-domestic/search?postcode=${encoded}&size=5`;
      const authToken = Buffer.from(`${email}:${apiKey}`).toString("base64");
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${authToken}`
        },
        signal: AbortSignal.timeout(8e3)
      });
      if (!response.ok) return null;
      const data = await response.json();
      const row = data.rows?.[0];
      if (!row) return null;
      const rating = row["current-energy-rating"] ?? "Unknown";
      const floorArea = row["floor-area"] ? parseFloat(row["floor-area"]) : null;
      const meesRatings = ["A", "B", "C", "D", "E"];
      const meesCompliant = meesRatings.includes(rating);
      const lodgementDate = row["lodgement-datetime"];
      let expiryDate = null;
      if (lodgementDate) {
        const lodged = new Date(lodgementDate);
        lodged.setFullYear(lodged.getFullYear() + 10);
        expiryDate = lodged.toISOString().split("T")[0];
      }
      const result = {
        rating,
        floorArea,
        meesCompliant,
        expiryDate,
        address: row.address ?? input.address
      };
      epcCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error("[property] EPC API request failed:", err);
      return null;
    }
  }),
  /**
   * Get broadband speed/availability data from Ofcom.
   * Searches by postcode extracted from the address.
   */
  getBroadband: protectedProcedure.input(import_types11.BroadbandQuerySchema).query(async ({ input }) => {
    const cacheKey = `broadband:${input.address}`;
    const cached = broadbandCache.get(cacheKey);
    if (cached) return cached;
    const apiKey = process.env["OFCOM_API_KEY"];
    if (!apiKey) {
      console.error("[property] OFCOM_API_KEY not configured");
      return null;
    }
    const postcode = extractPostcode(input.address);
    if (!postcode) return null;
    try {
      const encoded = encodeURIComponent(postcode.replace(/\s+/g, ""));
      const url = `https://api-proxy.ofcom.org.uk/broadband/basic?postcode=${encoded}`;
      const response = await fetch(url, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
        signal: AbortSignal.timeout(8e3)
      });
      if (!response.ok) return null;
      const data = await response.json();
      const entry = data.AvailabilityDetailed?.[0];
      if (!entry) return null;
      const result = {
        avgDownload: Math.round(entry.AverageDownloadSpeed ?? 0),
        avgUpload: Math.round(entry.AverageUploadSpeed ?? 0),
        maxDownload: entry.MaximumDownloadSpeed ? Math.round(entry.MaximumDownloadSpeed) : null,
        ultrafastAvailable: entry.UltrafastAvailable ?? false
      };
      broadbandCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error("[property] Ofcom API request failed:", err);
      return null;
    }
  }),
  /**
   * Get corporate ownership data from CCOD/OCOD (HM Land Registry).
   * Searches by postcode — requires bulk CCOD data to be ingested.
   * In the absence of a local database, this returns null gracefully.
   */
  getOwnership: protectedProcedure.input(import_types11.OwnershipQuerySchema).query(async ({ input }) => {
    void input;
    return null;
  }),
  /**
   * Get company profile from Companies House API.
   * Free, rate limited to 600 requests per 5 minutes.
   */
  getCompanyProfile: protectedProcedure.input(import_types11.CompanyProfileQuerySchema).query(async ({ input }) => {
    const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
    if (!apiKey) return null;
    try {
      const url = `https://api.company-information.service.gov.uk/company/${input.companyNumber}`;
      const authToken = Buffer.from(`${apiKey}:`).toString("base64");
      const response = await fetch(url, {
        headers: { Authorization: `Basic ${authToken}` },
        signal: AbortSignal.timeout(8e3)
      });
      if (!response.ok) return null;
      const data = await response.json();
      const addr = data.registered_office_address;
      return {
        companyName: data.company_name ?? "",
        companyNumber: data.company_number ?? input.companyNumber,
        status: data.company_status ?? "Unknown",
        sicCodes: data.sic_codes ?? [],
        incorporatedDate: data.date_of_creation ?? null,
        registeredAddress: addr ? [addr.address_line_1, addr.locality, addr.postal_code].filter(Boolean).join(", ") : null
      };
    } catch {
      return null;
    }
  }),
  /**
   * Get VOA rating list comparables near a location.
   * Queries the local VOAProperty database table.
   */
  getVOAComparables: protectedProcedure.input(import_types11.VOAComparablesQuerySchema).query(async ({ ctx, input }) => {
    try {
      const radiusDeg = input.radius / 111e3;
      const results = await ctx.db.vOAProperty.findMany({
        where: {
          latitude: {
            gte: input.latitude - radiusDeg,
            lte: input.latitude + radiusDeg
          },
          longitude: {
            gte: input.longitude - radiusDeg,
            lte: input.longitude + radiusDeg
          },
          rateableValue: { not: null }
        },
        take: 10,
        orderBy: { rateableValue: "desc" }
      });
      return results.map((r) => ({
        address: r.address,
        rateableValue: r.rateableValue ?? 0,
        description: r.description,
        distance: 0
        // approximate — Prisma doesn't support ST_Distance natively
      }));
    } catch {
      return [];
    }
  })
});

// src/routers/transport.ts
var import_types12 = require("@grounded/types");
var ptalCache = createApiCache({
  maxSize: 1e3,
  ttlMs: 864e5
  // 24h
});
var journeyCache = createApiCache({
  maxSize: 500,
  ttlMs: 864e5
  // 24h
});
var KEY_DESTINATIONS = [
  { name: "Bank", lat: 51.5133, lng: -0.0886 },
  { name: "Liverpool Street", lat: 51.5178, lng: -0.0823 },
  { name: "King's Cross", lat: 51.5308, lng: -0.1238 },
  { name: "Canary Wharf", lat: 51.5054, lng: -0.0235 }
];
var PTAL_NUMERIC = {
  "0": 0,
  "1a": 1,
  "1b": 1.5,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6a": 6,
  "6b": 6.5
};
var transportRouter = router({
  /**
   * Get PTAL score for a location.
   * Queries the local ptal_grid table using nearest-point spatial query.
   * Falls back to raw SQL since Prisma doesn't support PostGIS spatial operators.
   */
  getPTAL: protectedProcedure.input(import_types12.PTALQuerySchema).query(async ({ ctx, input }) => {
    const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
    const cached = ptalCache.get(cacheKey);
    if (cached) return cached;
    try {
      const results = await ctx.db.$queryRawUnsafe(
        `SELECT ptal_score FROM ptal_grid
           ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
           LIMIT 1`,
        input.longitude,
        input.latitude
      );
      if (!results[0]) return null;
      const score = results[0].ptal_score;
      const result = {
        score,
        numericScore: PTAL_NUMERIC[score.toLowerCase()] ?? 0
      };
      ptalCache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }),
  /**
   * Get journey times from a location to key London destinations via TfL API.
   */
  getJourneyTimes: protectedProcedure.input(import_types12.JourneyTimeQuerySchema).query(async ({ input }) => {
    const cacheKey = `journeys:${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
    const cached = journeyCache.get(cacheKey);
    if (cached) return cached;
    const apiKey = process.env["TFL_API_KEY"];
    if (!apiKey) {
      return { journeys: [] };
    }
    const journeys = [];
    const promises = KEY_DESTINATIONS.map(async (dest) => {
      try {
        const from = `${input.latitude},${input.longitude}`;
        const to = `${dest.lat},${dest.lng}`;
        const url = `https://api.tfl.gov.uk/Journey/JourneyResults/${from}/to/${to}?app_key=${apiKey}&mode=tube,dlr,overground,elizabeth-line&timeIs=Departing`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
        if (!response.ok) return null;
        const data = await response.json();
        const duration = data.journeys?.[0]?.duration;
        if (duration) {
          return { destination: dest.name, minutes: duration };
        }
        return null;
      } catch {
        return null;
      }
    });
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) journeys.push(r);
    }
    journeys.sort((a, b) => a.minutes - b.minutes);
    const result = { journeys };
    journeyCache.set(cacheKey, result);
    return result;
  })
});

// src/routers/demographics.ts
var import_types13 = require("@grounded/types");
var businessCache = createApiCache({
  maxSize: 500,
  ttlMs: 864e5
  // 24h
});
var demographicsRouter = router({
  /**
   * Get business counts by SIC code for an MSOA from NOMIS.
   */
  getBusinessCounts: protectedProcedure.input(import_types13.DemographicsQuerySchema).query(async ({ input }) => {
    if (!input.msoa) return null;
    const cacheKey = `biz:${input.msoa}`;
    const cached = businessCache.get(cacheKey);
    if (cached) return cached;
    try {
      const url = `https://www.nomisweb.co.uk/api/v01/dataset/NM_142_1.data.json?geography=${input.msoa}&industry=37748736&employment_sizeband=0&legal_status=0&measures=20100`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
      if (!response.ok) return null;
      const data = await response.json();
      const total = data.obs?.[0]?.obs_value?.value ?? 0;
      const result = {
        totalBusinesses: total,
        topSectors: []
        // Detailed sector breakdown requires multiple API calls
      };
      businessCache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }),
  /**
   * Get IMD deprivation data for an LSOA from the local database.
   */
  getDeprivation: protectedProcedure.input(import_types13.DemographicsQuerySchema).query(async ({ ctx, input }) => {
    if (!input.lsoa) return null;
    try {
      const record = await ctx.db.deprivationIndex.findUnique({
        where: { lsoaCode: input.lsoa }
      });
      if (!record) return null;
      const descriptions = [
        "",
        // 0 (not used)
        "Most deprived 10%",
        "Most deprived 20%",
        "Most deprived 30%",
        "Below average",
        "Below average",
        "Above average",
        "Above average",
        "Least deprived 30%",
        "Least deprived 20%",
        "Least deprived 10%"
      ];
      return {
        imdRank: record.imdRank,
        imdDecile: record.imdDecile,
        description: descriptions[record.imdDecile] ?? "Unknown"
      };
    } catch {
      return null;
    }
  }),
  /**
   * Get DfT road traffic flow at the nearest count point.
   * Free, no auth, no rate limits.
   */
  getTrafficFlow: protectedProcedure.input(import_types13.TrafficFlowQuerySchema).query(async ({ input }) => {
    try {
      const url = `https://roadtraffic.dft.gov.uk/api/average-annual-daily-flow?filter[latitude]=${input.latitude}&filter[longitude]=${input.longitude}&filter[radius]=1000&page[size]=1`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
      if (!response.ok) return null;
      const data = await response.json();
      const entry = data.data?.[0]?.attributes;
      if (!entry) return null;
      return {
        aadt: entry.all_motor_vehicles ?? null,
        roadName: entry.road_name ?? null,
        year: entry.year ?? null
      };
    } catch {
      return null;
    }
  }),
  /**
   * Get census demographics for an LSOA.
   * Uses ONS Census 2021 API.
   */
  getCensus: protectedProcedure.input(import_types13.DemographicsQuerySchema).query(async ({ input }) => {
    if (!input.lsoa) return null;
    try {
      const url = `https://www.nomisweb.co.uk/api/v01/dataset/NM_2021_1.data.json?geography=${input.lsoa}&cell=0&measures=20100`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8e3) });
      if (!response.ok) return null;
      const data = await response.json();
      const population = data.obs?.[0]?.obs_value?.value ?? null;
      return {
        population,
        lsoa: input.lsoa
      };
    } catch {
      return null;
    }
  })
});

// src/router.ts
var appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  dealFile: dealFileRouter,
  fieldDef: fieldDefRouter,
  deal: dealRouter,
  annotation: annotationRouter,
  comment: commentRouter,
  mapbox: mapboxRouter,
  document: documentRouter,
  planning: planningRouter,
  crime: crimeRouter,
  environment: environmentRouter,
  property: propertyRouter,
  transport: transportRouter,
  demographics: demographicsRouter
});

// src/lib/prisma.ts
var import_db = require("@grounded/db");

// src/lib/supabase.ts
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env["SUPABASE_URL"];
var supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];
var supabaseServiceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY"
  );
}
function createUserScopedClient(accessToken) {
  return (0, import_supabase_js.createClient)(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    // Disable automatic token refresh — this is server-side, we don't persist sessions.
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
var supabaseAdmin = supabaseServiceRoleKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// src/context.ts
async function createContext({
  req
}) {
  if (process.env["DEV_BYPASS_AUTH"] === "true") {
    const devUser = await import_db.prisma.user.findFirst({ select: { id: true, email: true } });
    if (devUser) {
      return { db: import_db.prisma, user: { id: devUser.id, email: devUser.email } };
    }
  }
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  let user = null;
  if (token) {
    try {
      const supabase = createUserScopedClient(token);
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user?.email) {
        user = {
          id: data.user.id,
          email: data.user.email
        };
      }
    } catch {
      user = null;
    }
  }
  return {
    db: import_db.prisma,
    user
  };
}

// src/index.ts
import_dns.default.setDefaultResultOrder("ipv4first");
var app = (0, import_express.default)();
var PORT = Number(process.env["PORT"] ?? 3001);
app.use((0, import_helmet.default)());
var allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  (0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[cors] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    },
    credentials: true
  })
);
app.use(import_express.default.json({ limit: "50mb" }));
app.get("/health", async (_req, res) => {
  try {
    await import_db.prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("[health] Database ping failed:", error);
    res.status(503).json({
      status: "degraded",
      error: "Database unreachable",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.use(
  "/api/trpc",
  (0, import_express2.createExpressMiddleware)({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[trpc] Error on ${path ?? "unknown"}:`, error);
      }
    }
  })
);
if (!process.env["VERCEL"]) {
  const server = app.listen(PORT, () => {
    console.log(`[api] Server running on http://localhost:${PORT}`);
    console.log(`[api] tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  });
  const shutdown = async (signal) => {
    console.log(`[api] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await import_db.prisma.$disconnect();
      console.log("[api] Shutdown complete.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[api] Graceful shutdown timed out \u2014 forcing exit.");
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
var index_default = app;
