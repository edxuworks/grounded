/**
 * @grounded/db — Public API
 *
 * This is the only entry point for other packages to consume the database layer.
 * Exporting from a single index file means that if we reorganise internals
 * (e.g. split client.ts into multiple files), consumers don't need updating.
 *
 * What's exported:
 *  - prisma: the singleton PrismaClient instance
 *  - All Prisma-generated types (Deal, Workspace, Annotation etc.) so that
 *    apps/api can import them from '@grounded/db' instead of the generated path
 */
export { prisma } from "./client";
export type { User, Workspace, WorkspaceMember, DealFile, DealFieldDefinition, Deal, Annotation, Comment, Prisma, } from "./generated/client";
export { WorkspaceMemberRole, DealStatus, FieldType, AnnotationCategory, } from "./generated/client";
//# sourceMappingURL=index.d.ts.map