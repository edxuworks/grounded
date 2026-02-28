/**
 * Root tRPC Router — AppRouter
 *
 * Combines all domain routers into a single AppRouter. The `AppRouter` type
 * is the contract exported to apps/web so the frontend gets end-to-end type
 * safety without any code generation step.
 *
 * Router namespace → frontend usage:
 *  trpc.auth.me.useQuery()
 *  trpc.workspace.list.useQuery()
 *  trpc.dealFile.create.useMutation()
 *  trpc.deal.list.useQuery({ workspaceId })
 *  trpc.annotation.create.useMutation()
 *  trpc.comment.listByDeal.useQuery({ dealId, workspaceId })
 *  trpc.fieldDef.reorder.useMutation()
 *  trpc.mapbox.queryTransportPOI.useQuery({ longitude, latitude })
 *  trpc.document.analyzeDocument.useMutation()
 *  trpc.document.geocodeAddress.useMutation()
 *
 * Adding a new domain:
 *  1. Create src/routers/newDomain.ts
 *  2. Import and add to appRouter below
 *  3. No other changes required — the type flows automatically to the frontend
 */

import { router } from "@/trpc";
import { authRouter } from "@/routers/auth";
import { workspaceRouter } from "@/routers/workspace";
import { dealFileRouter } from "@/routers/dealFile";
import { fieldDefRouter } from "@/routers/fieldDef";
import { dealRouter } from "@/routers/deal";
import { annotationRouter } from "@/routers/annotation";
import { commentRouter } from "@/routers/comment";
import { mapboxRouter } from "@/routers/mapbox";
import { documentRouter } from "@/routers/document";

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  dealFile: dealFileRouter,
  fieldDef: fieldDefRouter,
  deal: dealRouter,
  annotation: annotationRouter,
  comment: commentRouter,
  mapbox: mapboxRouter,
  document: documentRouter,
});

/**
 * The AppRouter type is the only thing apps/web imports from apps/api.
 * It's a pure TypeScript type — no runtime code — so there is no actual
 * dependency on the Node.js server code from the browser bundle.
 */
export type AppRouter = typeof appRouter;
