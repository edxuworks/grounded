# @grounded/api

Type-safe tRPC + Express backend for Grounded — a real-estate deal-mapping platform that overlays UK planning, environmental, transport, and demographic data on an interactive map.

## Overview

`@grounded/api` is the server tier of the Grounded monorepo. It exposes a single [tRPC](https://trpc.dev) v11 endpoint at `/api/trpc`, backed by Express, Prisma (PostgreSQL via Supabase), and Supabase Auth. Fifteen domain routers cover the application's own data model (workspaces, deals, annotations, comments) as well as server-side proxies to 10+ external UK open-data APIs.

The frontend (`apps/web`) imports only the exported `AppRouter` **type** — there is no code generation or REST schema to keep in sync. End-to-end type safety flows directly from these router definitions to the React client.

**Request lifecycle:**

```
HTTP request
  → Express (helmet, CORS, JSON body parser)
  → tRPC Express adapter (/api/trpc)
  → createContext()        // verify Supabase JWT, inject Prisma client
  → procedure middleware   // isAuthenticated → hasWorkspaceAccess (RBAC)
  → router handler
  → Prisma (PostgreSQL) OR external API (with LRU cache)
  → typed response
```

## Tech stack

- **Runtime:** Node.js ≥ 20, TypeScript 5.7
- **API layer:** tRPC 11 (`@trpc/server`) over Express 4.21
- **Validation:** Zod 3.24 (shared input schemas from `@grounded/types`)
- **Database:** Prisma (`@grounded/db` workspace package) → PostgreSQL (Supabase)
- **Auth:** Supabase (`@supabase/supabase-js` 2.48) — JWT verification server-side
- **AI:** Anthropic Claude (`@anthropic-ai/sdk`) for PDF address extraction
- **Caching:** `lru-cache` 11 (in-process LRU per external-API router)
- **Security:** Helmet, configurable CORS allow-list
- **Testing:** Vitest 3 with `@vitest/coverage-v8`
- **Bundling:** esbuild (Vercel serverless target), `tsx` for local dev

## Architecture

### Three procedure types

All auth logic lives once in [`src/trpc.ts`](src/trpc.ts) as middleware, so routers only declare which guarantee they need — it is impossible to accidentally ship a protected route without a check.

| Procedure | Guarantee | Failure mode |
| --- | --- | --- |
| `publicProcedure` | No auth (health check, public data) | — |
| `protectedProcedure` | Valid Supabase JWT; `ctx.user` narrowed to non-null | `UNAUTHORIZED` |
| `workspaceProcedure` | Authenticated **and** a member of the target workspace | `UNAUTHORIZED` / `FORBIDDEN` |

### Auth middleware

- **`createContext`** ([`src/context.ts`](src/context.ts)) runs once per request. It reads the `Authorization: Bearer <token>` header and verifies the JWT by calling `supabase.auth.getUser()` with a per-request user-scoped client ([`src/lib/supabase.ts`](src/lib/supabase.ts)). A valid token yields `ctx.user = { id, email }`; anything invalid yields `null` (never throws — the procedure decides).
- **`isAuthenticated`** rejects requests where `ctx.user` is null.
- **`hasWorkspaceAccess`** reads the raw input's `workspaceId` (via tRPC v11's async `getRawInput()`), looks up the caller's `WorkspaceMember` record, and rejects non-members. The member record — **including role** — is attached to `ctx.workspaceMember`, so handlers perform role checks (OWNER / ADMIN / MEMBER / VIEWER) without an extra query.

A `DEV_BYPASS_AUTH=true` escape hatch impersonates the first DB user for local development. It is guarded and must never be set in production.

### Context injection (DI)

The context object (`ctx.db`, `ctx.user`, and `ctx.workspaceMember` on workspace procedures) is the dependency-injection seam. Routers call `ctx.db` rather than importing Prisma directly, which lets unit tests inject a fully mocked client with no module patching. See [Development](#development).

### Server-side API-proxy pattern

External integrations never run in the browser. Each proxy router:

1. Reads its API secret from `process.env` — secrets stay server-side.
2. Wraps `fetch` with an 8-second `AbortSignal.timeout`.
3. **Degrades gracefully** — on a missing key, non-2xx, timeout, or parse error it returns an empty/`null` result (and logs) instead of throwing, so the map keeps rendering.
4. Memoizes responses in a per-router **LRU cache** ([`src/lib/cache.ts`](src/lib/cache.ts)) keyed by rounded coordinates, with a TTL tuned to how often the source data changes.

## Routers

Combined in [`src/router.ts`](src/router.ts) as `appRouter`; the `AppRouter` type is the sole export consumed by the frontend.

| Router | File | Summary | Key procedures |
| --- | --- | --- | --- |
| `auth` | [`auth.ts`](src/routers/auth.ts) | Syncs Supabase auth users into `public.users`; returns current profile + memberships | `me`, `syncUser` |
| `workspace` | [`workspace.ts`](src/routers/workspace.ts) | Workspace lifecycle + member management with RBAC | `list`, `create`, `update`, `addMember`, `listMembers`, `getPlayground` |
| `deal` | [`deal.ts`](src/routers/deal.ts) | CRUD for deals (the core mapped entity) with custom JSONB field values | `list`, `getById`, `create`, `update`, `updateFieldValues`, `delete` |
| `dealFile` | [`dealFile.ts`](src/routers/dealFile.ts) | Colour-coded deal "folders" rendered as map layers | `list`, `create`, `update`, `delete` |
| `fieldDef` | [`fieldDef.ts`](src/routers/fieldDef.ts) | Workspace-level custom field schema for deal cards | `list`, `create`, `update`, `reorder`, `delete` |
| `annotation` | [`annotation.ts`](src/routers/annotation.ts) | GeoJSON polygon drawings attached to deals | `listByDeal`, `create`, `update`, `delete` |
| `comment` | [`comment.ts`](src/routers/comment.ts) | Threaded per-deal comments with author role enrichment | `listByDeal`, `create`, `delete` |
| `document` | [`document.ts`](src/routers/document.ts) | PDF → Claude address extraction, then Mapbox geocoding | `analyzeDocument`, `geocodeAddress` |
| `mapbox` | [`mapbox.ts`](src/routers/mapbox.ts) | Mapbox Tilequery proxy for transit-stop POIs near a point | `queryTransportPOI` |
| `planning` | [`planning.ts`](src/routers/planning.ts) | MHCLG planning constraints + PlanIt applications | `getConstraints`, `getApplications` |
| `crime` | [`crime.ts`](src/routers/crime.ts) | Police UK street-level crime (1-mile radius) | `getStreetCrime` |
| `environment` | [`environment.ts`](src/routers/environment.ts) | Environment Agency flood warnings + monitoring stations | `getFloodRisk` |
| `property` | [`property.ts`](src/routers/property.ts) | EPC, Ofcom broadband, Companies House, VOA comparables, ownership | `getEPC`, `getBroadband`, `getCompanyProfile`, `getVOAComparables`, `getOwnership` |
| `transport` | [`transport.ts`](src/routers/transport.ts) | PTAL scores (local DB) + TfL journey times to key London hubs | `getPTAL`, `getJourneyTimes` |
| `demographics` | [`demographics.ts`](src/routers/demographics.ts) | NOMIS business counts, ONS census, DfT traffic, local IMD deprivation | `getBusinessCounts`, `getCensus`, `getTrafficFlow`, `getDeprivation` |

## External integrations

All external calls are proxied server-side. Data-model routers (auth, workspace, deal, dealFile, fieldDef, annotation, comment) touch only Prisma and are omitted below.

| Service | Env var(s) | Auth | Cache TTL | Purpose |
| --- | --- | --- | --- | --- |
| Anthropic Claude | `ANTHROPIC_API_KEY` | Bearer key | — | Extract subject/competitor addresses from uploaded PDFs (`claude-haiku-4-5`) |
| Mapbox Geocoding | `MAPBOX_SECRET_TOKEN` (or public fallback) | Access token | — | Address → coordinates |
| Mapbox Tilequery | `MAPBOX_SECRET_TOKEN` | Access token | — | Transit-stop POIs near a point |
| MHCLG Planning Data | none | Public | 24 h | Conservation areas, Article 4, listed buildings, green belt, brownfield |
| PlanIt | none | Public | 24 h | Nearby planning applications |
| Police UK | none | Public | 6 h | Street-level crime |
| Environment Agency Flood | none | Public | 15 min | Active flood warnings + nearest station |
| EPC (opendatacommunities) | `EPC_API_EMAIL`, `EPC_API_KEY` | HTTP Basic | 24 h | Non-domestic energy performance certificates |
| Ofcom Broadband | `OFCOM_API_KEY` | Subscription key | 7 days | Broadband speed / availability |
| Companies House | `COMPANIES_HOUSE_API_KEY` | HTTP Basic | — | Company profile lookup |
| TfL Journey Planner | `TFL_API_KEY` | `app_key` param | 24 h | Journey times to key London destinations |
| NOMIS / ONS Census | none | Public | 24 h (business) | Business counts by SIC, census population |
| DfT Road Traffic | none | Public | — | Annual average daily flow at nearest count point |

Local-database "integrations" (VOA rateable values, PTAL grid, IMD deprivation) query Prisma / raw SQL directly and require no API key.

## Environment variables

See [`.env.example`](.env.example) for the canonical, commented list. Copy it to `.env` and fill in values; **never commit `.env`**.

Key groups:

- **Database** — `DATABASE_URL` (pooled, for app queries), `DATABASE_DIRECT_URL` (direct, for migrations).
- **Supabase Auth** — `SUPABASE_URL`, `SUPABASE_ANON_KEY` (used server-side for JWT verification), `SUPABASE_SERVICE_ROLE_KEY` (admin-only; bypasses RLS — keep secret).
- **Mapbox** — `MAPBOX_SECRET_TOKEN` for server-side Tilequery/geocoding.
- **Anthropic** — `ANTHROPIC_API_KEY` for document analysis.
- **UK data APIs** — `EPC_API_EMAIL` / `EPC_API_KEY`, `OFCOM_API_KEY`, `COMPANIES_HOUSE_API_KEY`, `TFL_API_KEY` (read at call time; a missing key degrades the corresponding router gracefully rather than crashing the server).
- **Runtime** — `PORT`, `ALLOWED_ORIGINS` (comma-separated CORS allow-list), optional `DEV_BYPASS_AUTH` (local only).

All third-party secrets are read exclusively in this package and are never bundled into the browser build.

## Development

Run commands from the repo root; the API package is `@grounded/api`.

```bash
# Start the dev server with file watching (tsx, loads .env)
pnpm --filter @grounded/api dev

# Run the unit test suite once
pnpm --filter @grounded/api test

# Watch mode / coverage
pnpm --filter @grounded/api test:watch
pnpm --filter @grounded/api test:coverage

# Type-check without emitting
pnpm --filter @grounded/api check-types

# Compile to dist/
pnpm --filter @grounded/api build
```

The server listens on `PORT` (default `3001`), exposing `/api/trpc` and a `/health` endpoint that pings the database (`SELECT 1`) and returns `503` if it is unreachable. `SIGTERM`/`SIGINT` trigger graceful shutdown (drain connections, disconnect Prisma).

### Testing approach

Tests exercise procedures **without any HTTP layer or real database**. The helper in [`src/__tests__/helpers.ts`](src/__tests__/helpers.ts) builds a mock context and calls procedures directly via tRPC's `appRouter.createCaller(ctx)`:

```ts
const { caller, mockDb } = createTestCaller({ role: "OWNER" });
mockDb.deal.findMany.mockResolvedValue([mockDeal]);
const result = await caller.deal.list({ workspaceId: "ws-1" });
```

`createTestCaller` injects a Vitest-mocked Prisma client (every model method is a `vi.fn()`) and pre-wires the `workspaceMember.findUnique` lookup the `hasWorkspaceAccess` middleware performs — pass `role` to simulate RBAC scenarios or override with `.mockResolvedValue(null)` to test a non-member. This makes tests fast, isolated, and type-safe (wrong inputs fail at compile time).

## Testing

34 unit tests cover the core data-model routers and their authorization paths:

| Router | Tests |
| --- | --- |
| `deal` | 14 |
| `annotation` | 7 |
| `dealFile` | 7 |
| `fieldDef` | 6 |

**Not yet covered:** the external-integration routers (`mapbox`, `document`, `planning`, `crime`, `environment`, `property`, `transport`, `demographics`) and `auth` / `workspace` / `comment` are not currently unit-tested. Because the proxy routers already degrade gracefully on upstream failure, the practical gap is in asserting their response-shaping and cache behavior — a planned follow-up.

## Deployment

The API targets **Vercel serverless**. Express is exported as the default handler and only calls `app.listen()` when not running on Vercel (`process.env.VERCEL`). [`build-vercel.mjs`](build-vercel.mjs) bundles the server (and the `@grounded/db` Prisma client) with esbuild into a self-contained `dist-vercel/` output, which [`vercel.json`](vercel.json) serves via `@vercel/node` with all routes pointing at the single function. Build locally with:

```bash
pnpm --filter @grounded/api build:vercel
```
