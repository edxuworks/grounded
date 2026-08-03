# Architecture

This document explains how Grounded is put together and, more importantly, *why*
the main decisions were made. For a feature overview see the [root README](../README.md);
for package specifics see each package's own README.

## Contents

- [Monorepo layout](#monorepo-layout)
- [End-to-end type safety](#end-to-end-type-safety)
- [Request lifecycle & auth](#request-lifecycle--auth)
- [Multi-tenancy & access control](#multi-tenancy--access-control)
- [The external-data proxy layer](#the-external-data-proxy-layer)
- [Data model](#data-model)
- [Custom deal fields](#custom-deal-fields)
- [Spatial data strategy](#spatial-data-strategy)
- [Frontend composition](#frontend-composition)
- [AI document ingestion](#ai-document-ingestion)
- [Known limitations](#known-limitations)

## Monorepo layout

Grounded is a [Turborepo](https://turbo.build/repo) monorepo on pnpm workspaces.
Turborepo orchestrates task graphs (`build`, `test`, `check-types`) with caching and
correct dependency ordering — `packages/types` and `packages/db` build before the apps
that consume them.

```
apps/
  web/         React 18 + Vite — the analyst-facing map SPA
  api/         tRPC v11 + Express — backend & data proxy
  marketing/   Next.js 15 — static landing page
packages/
  db/          Prisma schema, migrations, generated client
  types/       Shared Zod schemas (the API contract)
  config/      Shared TypeScript base configs
```

Two design rules keep the boundaries clean:

1. **`packages/types` has no runtime dependencies** beyond Zod. It is the neutral
   contract both the API and the web client depend on, so neither app depends on the
   other's internals.
2. **Everything compiles `src → dist`.** Compiled output never lives in `src/`; a
   `.gitignore` rule enforces this after stale in-`src` artifacts once shadowed the
   TypeScript sources and broke module resolution during tests.

## End-to-end type safety

The API is built with [tRPC v11](https://trpc.io/). The web client imports the API's
`AppRouter` *type* and infers every query/mutation signature from it — there is **no code
generation step and no OpenAPI schema to keep in sync**.

Input validation is shared rather than duplicated:

```
packages/types (Zod schemas)
        │
        ├──▶ apps/api   .input(CreateDealSchema)      // server-side validation
        └──▶ apps/web   zodResolver(CreateDealSchema) // react-hook-form validation
```

A change to an input shape is made once, in `packages/types`, and propagates to both the
server's runtime validation and the client's form validation and TypeScript types. This is
the single most important architectural lever in the codebase.

## Request lifecycle & auth

```
HTTP request
  → Express (helmet, cors)
  → tRPC handler
  → createContext()        // verify Supabase JWT → attach `user` + per-request db client
  → procedure middleware   // publicProcedure | protectedProcedure | workspaceProcedure
  → resolver               // Prisma query and/or external API call
```

Three procedure builders express the auth requirements declaratively
(`apps/api/src/trpc.ts`):

- **`publicProcedure`** — no auth.
- **`protectedProcedure`** — requires a valid authenticated user; the `isAuthenticated`
  middleware throws `UNAUTHORIZED` if `ctx.user` is null.
- **`workspaceProcedure`** — extends `protectedProcedure` with a `hasWorkspaceAccess`
  middleware that reads `workspaceId` from the raw input, confirms the caller is a member
  of that workspace, and attaches their `WorkspaceMember` record (including role) to the
  context for downstream RBAC checks.

The context (`apps/api/src/context.ts`) verifies the Supabase JWT and constructs a
**per-request** Supabase client rather than a singleton, so a request never sees another
user's auth scope. A `DEV_BYPASS_AUTH` mode injects the first DB user server-side for a
frictionless local loop.

## Multi-tenancy & access control

Every domain entity carries a `workspaceId` — multi-tenancy was designed in from the first
migration, not retrofitted. Access is gated in two layers:

1. **Membership** — `workspaceProcedure` guarantees the caller belongs to the workspace
   named in the input before any resolver runs.
2. **Role** — resolvers check the attached member role. The roles form a hierarchy:

   | Role | Can do |
   | --- | --- |
   | `OWNER` | Everything, including destructive deletes and member management |
   | `ADMIN` | Manage members, field definitions, delete deals/files |
   | `MEMBER` | Create/edit deals, annotations, comments, fields |
   | `VIEWER` | Read everything; may comment, but not edit |

## The external-data proxy layer

Ten-plus external APIs are **never called from the browser**. Each lives behind a tRPC
router (`planning`, `crime`, `environment`, `property`, `transport`, `demographics`,
`mapbox`, …) so that:

- **Secrets stay server-side** — the browser only ever holds the public Mapbox token.
- **Responses are normalised** — messy third-party payloads become tidy typed shapes.
- **Everything is cached** — an LRU cache (`apps/api/src/lib/cache.ts`) fronts each source
  with a TTL matched to how fast the underlying data changes: 15 minutes for live flood
  warnings, 6 hours for crime, 24 hours for planning boundaries, 7 days for broadband.
- **Failures degrade gracefully** — a missing key or a timed-out upstream returns empty
  data rather than breaking the map; each fetch is bounded by an 8-second timeout.

Swapping a data source or adding rate limiting is a server-only change; the client contract
never moves.

## Data model

The Prisma schema (`packages/db/prisma/schema.prisma`) centres on a small, sharp core:

```
Workspace ─┬─< WorkspaceMember >─ User
           ├─< DealFieldDefinition
           └─< DealFile ─< Deal ─┬─< Annotation
                                  └─< Comment
```

Plus reference tables for ingested open data: `Postcode` (ONS directory), `VOAProperty`
(rating list), `DeprivationIndex` (IMD). Enumerations model the domain vocabulary —
`DealStatus` (SOURCING → UNDERWRITING → LEGALS → PLANNING → APPROVED/REJECTED),
`AnnotationCategory` (ACCESS, GREEN_SPACE, COMPETITOR, HAZARD, …), and `WorkspaceMemberRole`.
Cascade deletes flow down the ownership tree (delete a `DealFile` → its `Deal`s →
their `Annotation`s and `Comment`s).

## Custom deal fields

Teams analyse deals differently, so the deal schema is user-extensible without per-tenant
migrations:

- **`DealFieldDefinition`** rows describe a workspace's custom fields (name, type, order,
  required).
- **`Deal.fieldValues`** is a JSONB column keyed by definition id.

This deliberately avoids the Entity-Attribute-Value anti-pattern (no join explosion) while
staying schema-flexible. Deleting a field definition leaves orphaned JSONB values in place
rather than destroying data.

## Spatial data strategy

Coordinates are stored as plain `Float` `latitude`/`longitude` columns so Prisma can read
and write them natively. A raw-SQL migration layers PostGIS `GEOMETRY` columns and GIST
indexes on top for spatial queries (nearest-neighbour PTAL lookups, radius searches). The
application works with coordinates today; heavier geospatial queries can be added later
without touching application code. Annotations are stored as GeoJSON polygons.

## Frontend composition

`MapShell` is an intentionally thin layout shell that wires four regions — the left panel
(create deal / files / upload), the Mapbox GL `MapCanvas` (rendered with react-map-gl), the
right `DealSidebar`, and the `LayerControl`. Business logic lives in the feature components,
not the shell.

- **State** — [Zustand](https://github.com/pmndrs/zustand) holds UI state (`useUIStore`:
  active workspace, layer visibility, sidebar tabs) and transient map-drawing state
  (`useDrawingStore`). Server state is owned by TanStack Query via the tRPC client.
- **Map layers** — a `layerRegistry` decouples layer metadata (name, icon, default
  visibility) from rendering, so each dataset is an independently toggleable Mapbox GL
  `Source`/`Layer` (via react-map-gl).

## AI document ingestion

The `document` router accepts a base64 PDF offering memorandum, sends it to Claude
(`claude-haiku-4-5`) with a structured extraction prompt, and returns the subject property
address and a competitor list. Addresses are then geocoded via Mapbox and materialised as
map pins — turning a manual data-entry step into a drag-and-drop.

## Known limitations

These are deliberate trade-offs for an MVP, tracked in the README roadmap:

- Schema changes use `prisma db push`; production would use tracked `migrate deploy`.
- The external-data routers are not yet unit-tested (they wrap third-party APIs).
- Some datasets (VOA, PTAL grid, CCOD/OCOD ownership) require a bulk-ingest job that is
  not yet built; their routers read from local tables that a pipeline would populate.
- Caching is in-process LRU; a multi-instance deployment would want a shared cache.
