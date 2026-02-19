# Grounded v2

Geospatial real estate investment analysis platform.

## Architecture

```
grounded-v2/
├── apps/
│   ├── web/          # React 18 + Vite frontend (map interface)
│   └── api/          # Node.js tRPC backend
├── packages/
│   ├── db/           # Prisma schema + Supabase migrations
│   ├── types/        # Shared Zod schemas (API contracts)
│   └── config/       # Shared TypeScript + ESLint config
```

**Key tech decisions:**
- **tRPC**: end-to-end TypeScript type safety with zero code generation
- **Supabase**: PostgreSQL + PostGIS + Auth in one managed service
- **Prisma**: schema-first ORM with migration tracking
- **Turborepo**: monorepo build orchestration with caching

Full architecture decision record: see `.claude/plans/serialized-gliding-pike.md`

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A Supabase project (free tier is fine for development)
- A Mapbox account (free tier is fine)

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Fill in Supabase URL, keys, and Mapbox token

# 3. Generate the Prisma client
pnpm db:generate

# 4. Push the schema to your Supabase database
pnpm db:push

# 5. Start both the API and frontend in dev mode
pnpm dev
```

The frontend will be at http://localhost:5173
The API will be at http://localhost:3001

## Development Commands

```bash
pnpm dev              # Start all apps in watch mode
pnpm test             # Run all tests
pnpm build            # Production build all packages
pnpm check-types      # TypeScript type-check all packages

pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:push          # Push schema to database (development)
pnpm db:migrate       # Create a tracked migration (staging/production)
pnpm db:studio        # Open Prisma Studio (visual DB browser)
```

## Testing

```bash
# All tests
pnpm test

# API tests only (fast, no DB needed)
cd apps/api && pnpm test

# Frontend tests
cd apps/web && pnpm test

# Coverage report
cd apps/api && pnpm test:coverage
```

## Deployment

- **Frontend**: Vercel — connect the GitLab repo, set `apps/web` as the root directory
- **API**: Railway — connect the repo, set `apps/api` as the service directory
- **Database**: Supabase Pro ($25/mo)

For production deployments, run `pnpm db:migrate:deploy` instead of `pnpm db:push`.

## Implementation Phases

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Monorepo scaffold, shared config, Prisma schema |
| 1 | Next | Supabase migration + seed data |
| 2 | Pending | API core with TDD |
| 3 | Pending | Frontend auth + workspace |
| 4 | Pending | Map + Deal CRUD |
| 5 | Pending | Custom field definitions |
| 6 | Pending | Annotations (map drawing) |
| 7 | Pending | Comments + Transport POI |
| 8 | Pending | Polish + E2E tests |
