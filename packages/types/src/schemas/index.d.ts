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
/** GeoJSON Polygon geometry. Used for annotation drawings. */
export declare const GeoJSONPolygonSchema: z.ZodObject<{
    type: z.ZodLiteral<"Polygon">;
    coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    type: "Polygon";
    coordinates: [number, number][][];
}, {
    type: "Polygon";
    coordinates: [number, number][][];
}>;
export type GeoJSONPolygon = z.infer<typeof GeoJSONPolygonSchema>;
/** Pagination parameters shared across list procedures. */
export declare const PaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const CreateWorkspaceSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export declare const UpdateWorkspaceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name?: string | undefined;
}, {
    id: string;
    name?: string | undefined;
}>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export declare const CreateDealFileSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    workspaceId: string;
    color: string;
    description?: string | undefined;
}, {
    name: string;
    workspaceId: string;
    description?: string | undefined;
    color?: string | undefined;
}>;
export type CreateDealFileInput = z.infer<typeof CreateDealFileSchema>;
export declare const UpdateDealFileSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    workspaceId: string;
    name?: string | undefined;
    description?: string | undefined;
    color?: string | undefined;
}, {
    id: string;
    workspaceId: string;
    name?: string | undefined;
    description?: string | undefined;
    color?: string | undefined;
}>;
export type UpdateDealFileInput = z.infer<typeof UpdateDealFileSchema>;
export declare const FieldTypeSchema: z.ZodEnum<["TEXT", "NUMBER", "DATE"]>;
export type FieldTypeValue = z.infer<typeof FieldTypeSchema>;
export declare const CreateFieldDefSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    name: z.ZodString;
    fieldType: z.ZodEnum<["TEXT", "NUMBER", "DATE"]>;
    displayOrder: z.ZodOptional<z.ZodNumber>;
    isRequired: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    workspaceId: string;
    fieldType: "TEXT" | "NUMBER" | "DATE";
    isRequired: boolean;
    displayOrder?: number | undefined;
}, {
    name: string;
    workspaceId: string;
    fieldType: "TEXT" | "NUMBER" | "DATE";
    displayOrder?: number | undefined;
    isRequired?: boolean | undefined;
}>;
export type CreateFieldDefInput = z.infer<typeof CreateFieldDefSchema>;
export declare const UpdateFieldDefSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    fieldType: z.ZodOptional<z.ZodEnum<["TEXT", "NUMBER", "DATE"]>>;
    isRequired: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    workspaceId: string;
    name?: string | undefined;
    fieldType?: "TEXT" | "NUMBER" | "DATE" | undefined;
    isRequired?: boolean | undefined;
}, {
    id: string;
    workspaceId: string;
    name?: string | undefined;
    fieldType?: "TEXT" | "NUMBER" | "DATE" | undefined;
    isRequired?: boolean | undefined;
}>;
export type UpdateFieldDefInput = z.infer<typeof UpdateFieldDefSchema>;
export declare const ReorderFieldDefsSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    orderedIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    orderedIds: string[];
}, {
    workspaceId: string;
    orderedIds: string[];
}>;
export type ReorderFieldDefsInput = z.infer<typeof ReorderFieldDefsSchema>;
export declare const DealStatusSchema: z.ZodEnum<["SOURCING", "UNDERWRITING", "LEGALS", "PLANNING", "APPROVED", "REJECTED"]>;
export type DealStatusValue = z.infer<typeof DealStatusSchema>;
export declare const CreateDealSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    dealFileId: z.ZodString;
    title: z.ZodString;
    address: z.ZodString;
    longitude: z.ZodNumber;
    latitude: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["SOURCING", "UNDERWRITING", "LEGALS", "PLANNING", "APPROVED", "REJECTED"]>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    dealFileId: string;
    title: string;
    address: string;
    longitude: number;
    latitude: number;
    status: "SOURCING" | "UNDERWRITING" | "LEGALS" | "PLANNING" | "APPROVED" | "REJECTED";
}, {
    workspaceId: string;
    dealFileId: string;
    title: string;
    address: string;
    longitude: number;
    latitude: number;
    status?: "SOURCING" | "UNDERWRITING" | "LEGALS" | "PLANNING" | "APPROVED" | "REJECTED" | undefined;
}>;
export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export declare const UpdateDealSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    longitude: z.ZodOptional<z.ZodNumber>;
    latitude: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["SOURCING", "UNDERWRITING", "LEGALS", "PLANNING", "APPROVED", "REJECTED"]>>;
    pinned: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    workspaceId: string;
    title?: string | undefined;
    address?: string | undefined;
    longitude?: number | undefined;
    latitude?: number | undefined;
    status?: "SOURCING" | "UNDERWRITING" | "LEGALS" | "PLANNING" | "APPROVED" | "REJECTED" | undefined;
    pinned?: boolean | undefined;
}, {
    id: string;
    workspaceId: string;
    title?: string | undefined;
    address?: string | undefined;
    longitude?: number | undefined;
    latitude?: number | undefined;
    status?: "SOURCING" | "UNDERWRITING" | "LEGALS" | "PLANNING" | "APPROVED" | "REJECTED" | undefined;
    pinned?: boolean | undefined;
}>;
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;
export declare const UpdateFieldValuesSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    fieldValues: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodNull]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    workspaceId: string;
    fieldValues: Record<string, string | number | null>;
}, {
    id: string;
    workspaceId: string;
    fieldValues: Record<string, string | number | null>;
}>;
export type UpdateFieldValuesInput = z.infer<typeof UpdateFieldValuesSchema>;
export declare const ListDealsSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    dealFileId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["SOURCING", "UNDERWRITING", "LEGALS", "PLANNING", "APPROVED", "REJECTED"]>>;
} & {
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    dealFileId?: string | undefined;
    status?: "SOURCING" | "UNDERWRITING" | "LEGALS" | "PLANNING" | "APPROVED" | "REJECTED" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    workspaceId: string;
    dealFileId?: string | undefined;
    status?: "SOURCING" | "UNDERWRITING" | "LEGALS" | "PLANNING" | "APPROVED" | "REJECTED" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const AnnotationCategorySchema: z.ZodEnum<["ACCESS", "GREEN_SPACE", "COMPETITOR", "DEMAND_GENERATOR", "HAZARD", "RISK_ZONE", "NEW_PROJECT"]>;
export type AnnotationCategoryValue = z.infer<typeof AnnotationCategorySchema>;
export declare const CreateAnnotationSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    dealId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["ACCESS", "GREEN_SPACE", "COMPETITOR", "DEMAND_GENERATOR", "HAZARD", "RISK_ZONE", "NEW_PROJECT"]>;
    geometry: z.ZodObject<{
        type: z.ZodLiteral<"Polygon">;
        coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "Polygon";
        coordinates: [number, number][][];
    }, {
        type: "Polygon";
        coordinates: [number, number][][];
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    workspaceId: string;
    dealId: string;
    category: "ACCESS" | "GREEN_SPACE" | "COMPETITOR" | "DEMAND_GENERATOR" | "HAZARD" | "RISK_ZONE" | "NEW_PROJECT";
    geometry: {
        type: "Polygon";
        coordinates: [number, number][][];
    };
    description?: string | undefined;
}, {
    name: string;
    workspaceId: string;
    dealId: string;
    category: "ACCESS" | "GREEN_SPACE" | "COMPETITOR" | "DEMAND_GENERATOR" | "HAZARD" | "RISK_ZONE" | "NEW_PROJECT";
    geometry: {
        type: "Polygon";
        coordinates: [number, number][][];
    };
    description?: string | undefined;
}>;
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>;
export declare const UpdateAnnotationSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["ACCESS", "GREEN_SPACE", "COMPETITOR", "DEMAND_GENERATOR", "HAZARD", "RISK_ZONE", "NEW_PROJECT"]>>;
    geometry: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"Polygon">;
        coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "Polygon";
        coordinates: [number, number][][];
    }, {
        type: "Polygon";
        coordinates: [number, number][][];
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    workspaceId: string;
    name?: string | undefined;
    description?: string | undefined;
    category?: "ACCESS" | "GREEN_SPACE" | "COMPETITOR" | "DEMAND_GENERATOR" | "HAZARD" | "RISK_ZONE" | "NEW_PROJECT" | undefined;
    geometry?: {
        type: "Polygon";
        coordinates: [number, number][][];
    } | undefined;
}, {
    id: string;
    workspaceId: string;
    name?: string | undefined;
    description?: string | undefined;
    category?: "ACCESS" | "GREEN_SPACE" | "COMPETITOR" | "DEMAND_GENERATOR" | "HAZARD" | "RISK_ZONE" | "NEW_PROJECT" | undefined;
    geometry?: {
        type: "Polygon";
        coordinates: [number, number][][];
    } | undefined;
}>;
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationSchema>;
export declare const CreateCommentSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    dealId: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    dealId: string;
    text: string;
}, {
    workspaceId: string;
    dealId: string;
    text: string;
}>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export declare const MapboxTransportQuerySchema: z.ZodObject<{
    longitude: z.ZodNumber;
    latitude: z.ZodNumber;
    radius: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    longitude: number;
    latitude: number;
    radius: number;
}, {
    longitude: number;
    latitude: number;
    radius?: number | undefined;
}>;
export type MapboxTransportQueryInput = z.infer<typeof MapboxTransportQuerySchema>;
//# sourceMappingURL=index.d.ts.map