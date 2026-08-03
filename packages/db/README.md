# @grounded/db

Prisma schema, migrations, and the generated client for Grounded — the database layer
shared by the API. Backed by **PostgreSQL + PostGIS** (via Supabase).

## What's here

```
prisma/
  schema.prisma      # models, enums, indexes, relations
src/
  index.ts           # exports the singleton PrismaClient
  client.ts          # PrismaClient construction
  generated/         # generated Prisma client (gitignored)
```

The package builds `src → dist`; consumers import `@grounded/db` and get a typed
`PrismaClient` plus the generated model types.

## Data model

The schema centres on a workspace-scoped ownership tree:

```
Workspace ─┬─< WorkspaceMember >─ User
           ├─< DealFieldDefinition
           └─< DealFile ─< Deal ─┬─< Annotation
                                  └─< Comment
```

| Model | Purpose |
| --- | --- |
| `User` | Mirror of the Supabase auth user. |
| `Workspace` | Tenant boundary; every entity below is scoped to one. |
| `WorkspaceMember` | User ↔ Workspace join carrying a `role`. |
| `DealFieldDefinition` | Per-workspace custom field schema for deals. |
| `DealFile` | A folder / collection of deals. |
| `Deal` | A property under evaluation — coordinates, status, JSONB `fieldValues`. |
| `Annotation` | A GeoJSON polygon drawn against a deal. |
| `Comment` | Collaboration thread on a deal. |
| `Postcode` | ONS postcode directory (reference data). |
| `VOAProperty` | VOA rating-list comparables (reference data). |
| `DeprivationIndex` | IMD deprivation scores by LSOA (reference data). |

### Enums

- `WorkspaceMemberRole` — `OWNER` · `ADMIN` · `MEMBER` · `VIEWER`
- `DealStatus` — `SOURCING` · `UNDERWRITING` · `LEGALS` · `PLANNING` · `APPROVED` · `REJECTED`
- `FieldType` — `TEXT` · `NUMBER` · `DATE`
- `AnnotationCategory` — `ACCESS` · `GREEN_SPACE` · `COMPETITOR` · `DEMAND_GENERATOR` · `HAZARD` · `RISK_ZONE` · `NEW_PROJECT`

See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the reasoning behind
JSONB custom fields, the spatial-data strategy, and cascade-delete design.

## Configuration

The Prisma CLI reads two connection strings from `packages/db/.env` (gitignored):

```bash
DATABASE_URL=          # pooled connection (pgBouncer, port 6543) — app queries
DATABASE_DIRECT_URL=   # direct connection (port 5432) — migrations only
```

## Commands

Run from the repo root:

```bash
pnpm db:generate       # regenerate the Prisma client after editing schema.prisma
pnpm db:push           # push schema to the database (development)
pnpm db:migrate        # create a tracked migration (staging / production)
pnpm db:studio         # open Prisma Studio (visual DB browser)
```

Or scoped: `pnpm --filter @grounded/db db:seed` to run the seed script.

> **Note:** development currently uses `db push` for fast iteration. Production
> deployments should switch to tracked migrations (`db:migrate:deploy`).
