"use strict";
/**
 * Shared Zod Schemas — Single Source of Truth for Input/Output Contracts
 *
 * WHY this file exists:
 * tRPC uses Zod schemas for input validation on the API. The same schemas can
 * be used on the frontend for form validation (via react-hook-form + zodResolver).
 * Having one source of truth means a change to an input shape is reflected
 * in both API validation and frontend form validation automatically.
 *
 * WHY z.string().min(1) instead of z.string().cuid() for IDs:
 * CUIDs are a Prisma implementation detail. The API only ever receives IDs it
 * previously returned, so they will always be CUIDs in practice.  Enforcing
 * the CUID format in schemas adds no real security benefit and makes testing
 * unnecessarily painful (test fixtures would need real CUID values).
 *
 * WHY workspaceId appears on every schema (including updates/deletes):
 * `workspaceProcedure` reads workspaceId from raw input to verify the caller
 * is a member of that workspace before the handler runs.  Every workspace-scoped
 * operation must include workspaceId so the membership check can execute.
 *
 * Structure:
 *  - Each section corresponds to a tRPC router domain.
 *  - "Input" schemas define what the API accepts.
 *  - Inferred TypeScript types (z.infer<>) are exported for use in components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapboxTransportQuerySchema = exports.CreateCommentSchema = exports.UpdateAnnotationSchema = exports.CreateAnnotationSchema = exports.AnnotationCategorySchema = exports.ListDealsSchema = exports.UpdateFieldValuesSchema = exports.UpdateDealSchema = exports.CreateDealSchema = exports.DealStatusSchema = exports.ReorderFieldDefsSchema = exports.UpdateFieldDefSchema = exports.CreateFieldDefSchema = exports.FieldTypeSchema = exports.UpdateDealFileSchema = exports.CreateDealFileSchema = exports.UpdateWorkspaceSchema = exports.CreateWorkspaceSchema = exports.PaginationSchema = exports.GeoJSONPolygonSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// Common / Reusable
// =============================================================================
/** GeoJSON Polygon geometry. Used for annotation drawings. */
exports.GeoJSONPolygonSchema = zod_1.z.object({
    type: zod_1.z.literal("Polygon"),
    // Array of coordinate rings. First ring = exterior, subsequent = holes.
    // Each coordinate is [longitude, latitude] (GeoJSON spec: lon before lat).
    coordinates: zod_1.z.array(zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]))),
});
/** Pagination parameters shared across list procedures. */
exports.PaginationSchema = zod_1.z.object({
    limit: zod_1.z.number().int().min(1).max(100).default(50),
    offset: zod_1.z.number().int().min(0).default(0),
});
// =============================================================================
// Workspaces
// =============================================================================
exports.CreateWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Workspace name is required").max(100),
    // Slug: lowercase letters, numbers, hyphens only. No leading/trailing hyphens.
    slug: zod_1.z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers and hyphens only"),
});
exports.UpdateWorkspaceSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(100).optional(),
});
// =============================================================================
// Deal Files
// =============================================================================
exports.CreateDealFileSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1, "Folder name is required").max(100),
    description: zod_1.z.string().max(500).optional(),
    // Must be a valid CSS hex colour (3 or 6 digit).
    color: zod_1.z
        .string()
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex colour")
        .default("#3b82f6"),
});
exports.UpdateDealFileSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    // workspaceId required so workspaceProcedure middleware can verify membership.
    workspaceId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    color: zod_1.z
        .string()
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
        .optional(),
});
// =============================================================================
// Deal Field Definitions
// =============================================================================
exports.FieldTypeSchema = zod_1.z.enum(["TEXT", "NUMBER", "DATE"]);
exports.CreateFieldDefSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1, "Field name is required").max(100),
    fieldType: exports.FieldTypeSchema,
    // optional — when omitted, the API auto-assigns max(displayOrder) + 1.
    // A Zod default(0) would prevent the auto-order logic (router uses ?? operator).
    displayOrder: zod_1.z.number().int().min(0).optional(),
    isRequired: zod_1.z.boolean().default(false),
});
exports.UpdateFieldDefSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    // workspaceId required so workspaceProcedure middleware can verify membership.
    workspaceId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(100).optional(),
    fieldType: exports.FieldTypeSchema.optional(),
    isRequired: zod_1.z.boolean().optional(),
});
exports.ReorderFieldDefsSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().min(1),
    // Array of field definition IDs in the desired display order.
    orderedIds: zod_1.z.array(zod_1.z.string().min(1)).min(1),
});
// =============================================================================
// Deals
// =============================================================================
exports.DealStatusSchema = zod_1.z.enum([
    "SOURCING",
    "UNDERWRITING",
    "LEGALS",
    "PLANNING",
    "APPROVED",
    "REJECTED",
]);
exports.CreateDealSchema = zod_1.z.object({
    // workspaceId required for middleware; dealFileId must belong to this workspace.
    workspaceId: zod_1.z.string().min(1),
    dealFileId: zod_1.z.string().min(1),
    // Title is what shows on the map marker tooltip and deal card header.
    title: zod_1.z.string().min(1, "Deal title is required").max(200),
    // Full address for display purposes (not used for geocoding — coordinates
    // come from the map click, not from address lookup).
    address: zod_1.z.string().min(1, "Address is required").max(500),
    // WGS84 decimal degrees. Validated to roughly plausible geographic ranges.
    longitude: zod_1.z.number().min(-180).max(180),
    latitude: zod_1.z.number().min(-90).max(90),
    status: exports.DealStatusSchema.default("SOURCING"),
});
exports.UpdateDealSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    // workspaceId required so workspaceProcedure middleware can verify membership.
    workspaceId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1).max(200).optional(),
    address: zod_1.z.string().min(1).max(500).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    status: exports.DealStatusSchema.optional(),
    pinned: zod_1.z.boolean().optional(),
});
// Field values are a free-form map keyed by DealFieldDefinition.id.
// The API layer validates that each key is a known definition ID and that
// the value type matches the definition's fieldType.
exports.UpdateFieldValuesSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    // workspaceId required so workspaceProcedure middleware can verify membership.
    workspaceId: zod_1.z.string().min(1),
    fieldValues: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()])),
});
exports.ListDealsSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().min(1),
    // Optional filter by deal file — when null, returns all deals in workspace.
    dealFileId: zod_1.z.string().min(1).optional(),
    status: exports.DealStatusSchema.optional(),
}).merge(exports.PaginationSchema.partial());
// =============================================================================
// Annotations
// =============================================================================
exports.AnnotationCategorySchema = zod_1.z.enum([
    "ACCESS",
    "GREEN_SPACE",
    "COMPETITOR",
    "DEMAND_GENERATOR",
    "HAZARD",
    "RISK_ZONE",
    "NEW_PROJECT",
]);
exports.CreateAnnotationSchema = zod_1.z.object({
    // workspaceId required for middleware; dealId must belong to this workspace.
    workspaceId: zod_1.z.string().min(1),
    dealId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1, "Annotation name is required").max(100),
    description: zod_1.z.string().max(500).optional(),
    category: exports.AnnotationCategorySchema,
    // GeoJSON Polygon from the map drawing tools.
    geometry: exports.GeoJSONPolygonSchema,
});
exports.UpdateAnnotationSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    // workspaceId required so workspaceProcedure middleware can verify membership.
    workspaceId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    category: exports.AnnotationCategorySchema.optional(),
    geometry: exports.GeoJSONPolygonSchema.optional(),
});
// =============================================================================
// Comments
// =============================================================================
exports.CreateCommentSchema = zod_1.z.object({
    // workspaceId required for middleware; dealId must belong to this workspace.
    workspaceId: zod_1.z.string().min(1),
    dealId: zod_1.z.string().min(1),
    text: zod_1.z.string().min(1, "Comment cannot be empty").max(2000),
});
// =============================================================================
// Mapbox (Transport POI Proxy)
// =============================================================================
exports.MapboxTransportQuerySchema = zod_1.z.object({
    // Map click coordinates — WGS84 decimal degrees.
    longitude: zod_1.z.number().min(-180).max(180),
    latitude: zod_1.z.number().min(-90).max(90),
    // Search radius in metres. Default 500m is appropriate for walkability context.
    radius: zod_1.z.number().int().min(1).max(5000).default(500),
});
//# sourceMappingURL=index.js.map