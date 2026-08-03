<div align="center">

# Grounded

**A geospatial intelligence platform for UK commercial real-estate investment.**

Plot deals on a map, enrich each site with live data from 10+ UK government and commercial APIs, and collaborate with your team — all behind end-to-end type safety.

[![CI](https://github.com/edxuworks/grounded/actions/workflows/ci.yml/badge.svg)](https://github.com/edxuworks/grounded/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)](https://trpc.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)

</div>

---

> **What is it?** Commercial property investors evaluate a site by pulling together dozens of disconnected data points — planning constraints, flood risk, crime, transport access, energy performance, demographics, ownership. Grounded collapses that research into a single map: drop a pin on a building and every relevant UK dataset resolves around it, live.

> **Status** — a functional MVP. The full stack runs end to end: the map UI, the tRPC API with 15 domain routers, 10+ live UK data integrations, Supabase auth, and the Postgres/PostGIS database. Run `pnpm dev` (or set `VITE_DEMO_MODE=true` for a no-login map).

<!-- To add a hero image later, drop it in docs/assets/ and embed it here. -->


## Highlights

- **Map-first workflow** — an interactive Mapbox GL canvas (via [react-map-gl](https://visgl.github.io/react-map-gl/)) where deals are pins, areas of interest are hand-drawn polygons, and every data source is a toggleable layer.
- **10+ live UK data integrations** — planning (MHCLG, PlanIt), crime (Police UK), flood risk (Environment Agency), transport (TfL, PTAL), energy (EPC), broadband (Ofcom), demographics (NOMIS), corporate ownership (Companies House) and more — all proxied server-side and cached. See [`docs/uk-data-sources.md`](docs/uk-data-sources.md) for the full 60+ API research catalogue.
- **AI document ingestion** — upload an offering memorandum (PDF) and Claude extracts the subject property address and competitor set, which are geocoded and dropped onto the map automatically.
- **End-to-end type safety** — a tRPC v11 API and a React client share one set of Zod schemas. No codegen, no drift: change an input shape once and both the server validation and the frontend form update.
- **Multi-tenant from day one** — workspace-scoped data with role-based access control (Owner / Admin / Member / Viewer) enforced in middleware.
- **Flexible deal schema** — teams define their own custom deal fields per workspace, stored as JSONB against a schema table (no EAV, no migrations per field).

## Architecture

Grounded is a [Turborepo](https://turbo.build/repo) monorepo of three apps and three shared packages, managed with pnpm workspaces.

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────────┐
│  apps/marketing │     │    apps/web     │────▶│        apps/api          │
│   Next.js 15    │     │  React 18 +Vite │tRPC │   tRPC v11 + Express      │
│  landing page   │     │   map SPA       │◀────│                          │
└─────────────────┘     └─────────────────┘     └────────────┬─────────────┘
        │                       │                             │
   GitHub Pages         Mapbox GL / react-map-gl    ┌─────────┴──────────┐
                                                     │                    │
                                          ┌──────────▼─────────┐  ┌───────▼────────┐
                                          │  Supabase          │  │ 10+ UK data    │
                                          │  Postgres+PostGIS  │  │ APIs (proxied, │
                                          │  + Auth (Prisma)   │  │ cached, LRU)   │
                                          └────────────────────┘  └────────────────┘
```

| Package | Description |
| --- | --- |
| [`apps/web`](apps/web) | React 18 + Vite single-page map application (the analyst UI). |
| [`apps/api`](apps/api) | tRPC v11 + Express backend: 15 domain routers, auth, and the external-data proxy layer. |
| [`apps/marketing`](apps/marketing) | Next.js 15 static marketing site, deployed to GitHub Pages. |
| [`packages/db`](packages/db) | Prisma schema, migrations, and the generated client (Postgres + PostGIS). |
| [`packages/types`](packages/types) | Shared Zod schemas — the single source of truth for the API contract. |
| [`packages/config`](packages/config) | Shared TypeScript base configs. |

For a deeper tour of the design decisions, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tech stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite, TypeScript, Mapbox GL, react-map-gl, Mapbox GL Draw, Zustand, TanStack Query, Radix UI, Tailwind CSS, react-hook-form |
| **API** | Node.js 20, tRPC v11, Express, Zod, Prisma, LRU cache, Anthropic SDK |
| **Data** | Supabase (Postgres + PostGIS + Auth) |
| **Marketing** | Next.js 15, React 19, Framer Motion, Tailwind CSS |
| **Tooling** | Turborepo, pnpm workspaces, Vitest, Prettier, GitHub Actions |

## Location intelligence

Every external dataset is fetched **server-side** (keeping API keys off the client), normalised, and cached with a source-appropriate TTL. Most are free UK open-data APIs.

| Domain | Source | Auth | What it surfaces |
| --- | --- | --- | --- |
| Planning constraints | MHCLG Planning Data | none | Conservation areas, Article 4, listed buildings, green belt, brownfield |
| Planning applications | PlanIt | none | Nearby applications & development pipeline |
| Crime | Police UK | none | Street-level crime heatmap + category breakdown |
| Flood risk | Environment Agency | none | Active flood warnings & nearest monitoring station |
| Transport (POI) | Mapbox Tilequery | key | Rail / tube / bus stations within radius |
| Transport (access) | TfL + PTAL grid | key | Journey times to key hubs, PTAL accessibility score |
| Energy | EPC Register | key | Non-domestic energy rating, floor area, MEES compliance |
| Broadband | Ofcom | key | Download/upload speeds, ultrafast availability |
| Demographics | NOMIS / DfT | none | Business counts, census population, road traffic flow |
| Corporate | Companies House | key | Company profile, status, SIC codes |
| Valuation | VOA rating list | (ingest) | Rateable-value comparables |

> A comprehensive survey of 60+ UK CRE data APIs — with coverage, formats and integration notes — lives in [`docs/uk-data-sources.md`](docs/uk-data-sources.md).

## Getting started

### Prerequisites

- **Node.js** ≥ 20 · **pnpm** ≥ 9
- A **Supabase** project (free tier) — Postgres + PostGIS + Auth
- A **Mapbox** account (free tier) — map tiles + Tilequery

### Setup

```bash
git clone git@github.com:edxuworks/grounded.git
cd grounded

# One-shot: installs deps, copies .env files, generates the Prisma client, builds packages
./setup.sh
```

Then fill in the generated `.env` files (each app ships a heavily-commented `.env.example` explaining every variable and where to find it), push the schema, and start everything:

```bash
pnpm db:push     # push the Prisma schema to your Supabase database
pnpm dev         # run all three apps in watch mode
```

| Service | URL |
| --- | --- |
| Marketing site | http://localhost:3000 |
| Web app | http://localhost:5173 |
| API | http://localhost:3001 |

> **Just want to see the map?** Set `VITE_DEMO_MODE=true` in `apps/web/.env` to land straight on the map interface with no login or database required.

## Development

All commands run from the repo root and fan out across the workspace via Turborepo:

```bash
pnpm dev            # run every app in watch mode
pnpm build          # production build of everything
pnpm test           # run all unit tests
pnpm check-types    # type-check every package
pnpm format         # format with Prettier

pnpm db:generate    # regenerate the Prisma client after a schema change
pnpm db:push        # push schema to the database (development)
pnpm db:migrate     # create a tracked migration (staging / production)
pnpm db:studio      # open Prisma Studio
```

Scope any command to one package with a filter, e.g. `pnpm --filter @grounded/api test`.

## Testing

Unit tests run on [Vitest](https://vitest.dev). The API is tested by calling tRPC procedures directly through `createCaller` against a mock Prisma client — no HTTP layer, no database, fully deterministic.

```bash
pnpm test                                  # everything
pnpm --filter @grounded/api test           # API router tests (34 tests)
pnpm --filter @grounded/api test:coverage  # with coverage
```

Current coverage focuses on the core write paths (deals, deal files, annotations, custom fields). The external-integration routers are proxies over third-party APIs and are not yet unit-tested — see the [roadmap](#roadmap).

## Deployment

| App | Target | Mechanism |
| --- | --- | --- |
| Marketing | GitHub Pages | GitHub Actions (`.github/workflows/deploy-marketing.yml`) on push |
| Web | Vercel | Static Vite build, root `apps/web` |
| API | Vercel (serverless) | Bundled via `apps/api/build-vercel.mjs` |
| Database | Supabase | Managed Postgres + PostGIS |

CI (`.github/workflows/ci.yml`) type-checks, tests, and builds the whole monorepo on every push and pull request.

## Roadmap

Natural next steps to take Grounded from MVP to production:

- **Tracked migrations** — move from `db push` to versioned Prisma migrations.
- **Broader test coverage** — extend beyond the core router tests to the external-data integrations and frontend components.
- **Data-ingestion pipelines** — bulk-load VOA rating lists, the PTAL grid, and corporate ownership (CCOD/OCOD).
- **Production hardening** — per-user rate limiting and a shared (Redis) cache layer.

## License

[MIT](LICENSE) © Edward Xu
