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

import { z } from "zod";

// =============================================================================
// Common / Reusable
// =============================================================================

/** GeoJSON Polygon geometry. Used for annotation drawings. */
export const GeoJSONPolygonSchema = z.object({
  type: z.literal("Polygon"),
  // Array of coordinate rings. First ring = exterior, subsequent = holes.
  // Each coordinate is [longitude, latitude] (GeoJSON spec: lon before lat).
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});
export type GeoJSONPolygon = z.infer<typeof GeoJSONPolygonSchema>;

/** Pagination parameters shared across list procedures. */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// =============================================================================
// Workspaces
// =============================================================================

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  // Slug: lowercase letters, numbers, hyphens only. No leading/trailing hyphens.
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers and hyphens only"
    ),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
});
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;

// =============================================================================
// Deal Files
// =============================================================================

export const CreateDealFileSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1, "Folder name is required").max(100),
  description: z.string().max(500).optional(),
  // Must be a valid CSS hex colour (3 or 6 digit).
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex colour")
    .default("#3b82f6"),
});
export type CreateDealFileInput = z.infer<typeof CreateDealFileSchema>;

export const UpdateDealFileSchema = z.object({
  id: z.string().min(1),
  // workspaceId required so workspaceProcedure middleware can verify membership.
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
});
export type UpdateDealFileInput = z.infer<typeof UpdateDealFileSchema>;

// =============================================================================
// Deal Field Definitions
// =============================================================================

export const FieldTypeSchema = z.enum(["TEXT", "NUMBER", "DATE"]);
export type FieldTypeValue = z.infer<typeof FieldTypeSchema>;

export const CreateFieldDefSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1, "Field name is required").max(100),
  fieldType: FieldTypeSchema,
  // optional — when omitted, the API auto-assigns max(displayOrder) + 1.
  // A Zod default(0) would prevent the auto-order logic (router uses ?? operator).
  displayOrder: z.number().int().min(0).optional(),
  isRequired: z.boolean().default(false),
});
export type CreateFieldDefInput = z.infer<typeof CreateFieldDefSchema>;

export const UpdateFieldDefSchema = z.object({
  id: z.string().min(1),
  // workspaceId required so workspaceProcedure middleware can verify membership.
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  fieldType: FieldTypeSchema.optional(),
  isRequired: z.boolean().optional(),
});
export type UpdateFieldDefInput = z.infer<typeof UpdateFieldDefSchema>;

export const ReorderFieldDefsSchema = z.object({
  workspaceId: z.string().min(1),
  // Array of field definition IDs in the desired display order.
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderFieldDefsInput = z.infer<typeof ReorderFieldDefsSchema>;

// =============================================================================
// Deals
// =============================================================================

export const DealStatusSchema = z.enum([
  "SOURCING",
  "UNDERWRITING",
  "LEGALS",
  "PLANNING",
  "APPROVED",
  "REJECTED",
]);
export type DealStatusValue = z.infer<typeof DealStatusSchema>;

export const CreateDealSchema = z.object({
  // workspaceId required for middleware; dealFileId must belong to this workspace.
  workspaceId: z.string().min(1),
  dealFileId: z.string().min(1),
  // Title is what shows on the map marker tooltip and deal card header.
  title: z.string().min(1, "Deal title is required").max(200),
  // Full address for display purposes (not used for geocoding — coordinates
  // come from the map click, not from address lookup).
  address: z.string().min(1, "Address is required").max(500),
  // WGS84 decimal degrees. Validated to roughly plausible geographic ranges.
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  status: DealStatusSchema.default("SOURCING"),
  // Competitor properties extracted from the OM PDF. Empty array for map-click deals.
  competitors: z.array(z.object({
    name: z.string(),
    address: z.string(),
    longitude: z.number(),
    latitude: z.number(),
  })).optional().default([]),
});
export type CreateDealInput = z.infer<typeof CreateDealSchema>;

export const UpdateDealSchema = z.object({
  id: z.string().min(1),
  // workspaceId required so workspaceProcedure middleware can verify membership.
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  status: DealStatusSchema.optional(),
  pinned: z.boolean().optional(),
});
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;

// Field values are a free-form map keyed by DealFieldDefinition.id.
// The API layer validates that each key is a known definition ID and that
// the value type matches the definition's fieldType.
export const UpdateFieldValuesSchema = z.object({
  id: z.string().min(1),
  // workspaceId required so workspaceProcedure middleware can verify membership.
  workspaceId: z.string().min(1),
  fieldValues: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});
export type UpdateFieldValuesInput = z.infer<typeof UpdateFieldValuesSchema>;

export const ListDealsSchema = z.object({
  workspaceId: z.string().min(1),
  // Optional filter by deal file — when null, returns all deals in workspace.
  dealFileId: z.string().min(1).optional(),
  status: DealStatusSchema.optional(),
}).merge(PaginationSchema.partial());

// =============================================================================
// Annotations
// =============================================================================

export const AnnotationCategorySchema = z.enum([
  "ACCESS",
  "GREEN_SPACE",
  "COMPETITOR",
  "DEMAND_GENERATOR",
  "HAZARD",
  "RISK_ZONE",
  "NEW_PROJECT",
]);
export type AnnotationCategoryValue = z.infer<typeof AnnotationCategorySchema>;

export const CreateAnnotationSchema = z.object({
  // workspaceId required for middleware; dealId must belong to this workspace.
  workspaceId: z.string().min(1),
  dealId: z.string().min(1),
  name: z.string().min(1, "Annotation name is required").max(100),
  description: z.string().max(500).optional(),
  category: AnnotationCategorySchema,
  // GeoJSON Polygon from the map drawing tools.
  geometry: GeoJSONPolygonSchema,
});
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>;

export const UpdateAnnotationSchema = z.object({
  id: z.string().min(1),
  // workspaceId required so workspaceProcedure middleware can verify membership.
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: AnnotationCategorySchema.optional(),
  geometry: GeoJSONPolygonSchema.optional(),
});
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationSchema>;

// =============================================================================
// Comments
// =============================================================================

export const CreateCommentSchema = z.object({
  // workspaceId required for middleware; dealId must belong to this workspace.
  workspaceId: z.string().min(1),
  dealId: z.string().min(1),
  text: z.string().min(1, "Comment cannot be empty").max(2000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

// =============================================================================
// Planning (MHCLG Constraints + PlanIt Applications)
// =============================================================================

export const PlanningConstraintsQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type PlanningConstraintsQueryInput = z.infer<typeof PlanningConstraintsQuerySchema>;

export const PlanningApplicationsQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().int().min(100).max(2000).default(500),
});
export type PlanningApplicationsQueryInput = z.infer<typeof PlanningApplicationsQuerySchema>;

// =============================================================================
// Crime (Police UK Street Crime)
// =============================================================================

export const CrimeQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CrimeQueryInput = z.infer<typeof CrimeQuerySchema>;

// =============================================================================
// Environment (EA Flood Risk)
// =============================================================================

export const FloodRiskQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type FloodRiskQueryInput = z.infer<typeof FloodRiskQuerySchema>;

// =============================================================================
// Property (EPC + VOA + Broadband)
// =============================================================================

export const EPCQuerySchema = z.object({
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type EPCQueryInput = z.infer<typeof EPCQuerySchema>;

export const BroadbandQuerySchema = z.object({
  address: z.string().min(1).max(500),
});
export type BroadbandQueryInput = z.infer<typeof BroadbandQuerySchema>;

export const VOAComparablesQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().int().min(100).max(5000).default(500),
});
export type VOAComparablesQueryInput = z.infer<typeof VOAComparablesQuerySchema>;

export const OwnershipQuerySchema = z.object({
  postcode: z.string().min(1).max(10),
});
export type OwnershipQueryInput = z.infer<typeof OwnershipQuerySchema>;

export const CompanyProfileQuerySchema = z.object({
  companyNumber: z.string().min(1).max(20),
});
export type CompanyProfileQueryInput = z.infer<typeof CompanyProfileQuerySchema>;

export const TrafficFlowQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type TrafficFlowQueryInput = z.infer<typeof TrafficFlowQuerySchema>;

// =============================================================================
// Transport (PTAL + TfL Journey Times)
// =============================================================================

export const PTALQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type PTALQueryInput = z.infer<typeof PTALQuerySchema>;

export const JourneyTimeQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type JourneyTimeQueryInput = z.infer<typeof JourneyTimeQuerySchema>;

// =============================================================================
// Demographics (NOMIS + Census + IMD)
// =============================================================================

export const DemographicsQuerySchema = z.object({
  lsoa: z.string().min(1).optional(),
  msoa: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
});
export type DemographicsQueryInput = z.infer<typeof DemographicsQuerySchema>;

// =============================================================================
// Mapbox (Transport POI Proxy)
// =============================================================================

export const MapboxTransportQuerySchema = z.object({
  // Map click coordinates — WGS84 decimal degrees.
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  // Search radius in metres. Default 500m is appropriate for walkability context.
  radius: z.number().int().min(1).max(5000).default(500),
});
export type MapboxTransportQueryInput = z.infer<typeof MapboxTransportQuerySchema>;
