# Contributing

Thanks for taking a look at Grounded. This guide covers the local workflow and the
conventions the codebase follows.

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`corepack enable` will pin the version in `package.json`)
- A **Supabase** project (free tier) — Postgres + PostGIS + Auth
- A **Mapbox** account (free tier) — map tiles + Tilequery

## Getting set up

```bash
git clone git@github.com:edxuworks/grounded.git
cd grounded
./setup.sh          # installs deps, copies .env files, generates Prisma client, builds packages
```

Then fill in the generated `.env` files (see each app's `.env.example` for what every
variable is and where to find it) and start the stack:

```bash
pnpm dev
```

| Service        | URL                     |
| -------------- | ----------------------- |
| Marketing site | http://localhost:3000   |
| Web app        | http://localhost:5173   |
| API            | http://localhost:3001   |

## Repository layout

This is a [Turborepo](https://turbo.build/repo) monorepo managed with pnpm workspaces.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture and each package's
own `README.md` for details.

```
apps/
  web/         React 18 + Vite — the map application
  api/         tRPC + Express — the backend
  marketing/   Next.js — the public landing page
packages/
  db/          Prisma schema, migrations, generated client
  types/       Shared Zod schemas (the API contract)
  config/      Shared TypeScript / ESLint / Vitest config
```

## Everyday commands

All commands run from the repo root and fan out across the workspace via Turborepo:

```bash
pnpm dev            # run every app in watch mode
pnpm build          # production build of everything
pnpm test           # run all unit tests
pnpm check-types    # type-check every package
pnpm format         # format the codebase with Prettier

pnpm db:generate    # regenerate the Prisma client after a schema change
pnpm db:push        # push the schema to the database (development)
pnpm db:migrate     # create a tracked migration (staging / production)
pnpm db:studio      # open Prisma Studio
```

To run a single package's script, filter it:

```bash
pnpm --filter @grounded/api test:coverage
pnpm --filter @grounded/web dev
```

## Conventions

- **Type safety end to end.** The API contract lives in `packages/types` as Zod schemas.
  tRPC infers client types from the server — there is no codegen step and no drift.
- **Tests live next to code** and run on [Vitest](https://vitest.dev). Prefer testing
  behaviour through the tRPC routers and React hooks rather than implementation details.
- **Secrets never get committed.** Every `.env` is gitignored; only `.env.example` files
  are tracked. Server-only secrets (service-role keys, Mapbox *secret* token, Anthropic
  key) stay in `apps/api` and are never exposed to the browser.
- **Formatting** is handled by Prettier — run `pnpm format` before opening a PR.

## Pull requests

1. Branch off `main`.
2. Keep the change focused; update the relevant `README` / docs when behaviour changes.
3. Make sure `pnpm check-types`, `pnpm test`, and `pnpm build` all pass — CI runs the same
   three on every push and PR.
