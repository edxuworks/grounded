# @grounded/types

The shared **API contract** for Grounded: a single set of [Zod](https://zod.dev) schemas
(and their inferred TypeScript types) consumed by both the API and the web client.

## Why it exists

tRPC validates procedure inputs with Zod on the server; the frontend validates the same
forms with the same schemas via `@hookform/resolvers/zod`. Keeping both on one source of
truth means an input shape is defined **once** — change it here and server validation,
client validation, and TypeScript types all update together. No code generation, no drift.

```
packages/types (Zod schemas)
        ├──▶ apps/api   .input(CreateDealSchema)
        └──▶ apps/web   zodResolver(CreateDealSchema)
```

## What's here

`src/schemas/index.ts` is the single export surface (re-exported from `src/index.ts`),
organised by tRPC router domain:

- **Common** — `GeoJSONPolygonSchema`, `PaginationSchema`
- **Workspaces** — create / update
- **Deal files** — create / update
- **Deals** — create, update, update field values, list
- **Field definitions** — create, update, reorder
- **Annotations** — create / update (GeoJSON geometry)
- **Comments** — create
- **Location intelligence queries** — planning, crime, flood, EPC, broadband, VOA,
  ownership, Companies House, PTAL, journey times, demographics, traffic, transport POI

Every schema is exported alongside its `z.infer<>` type (e.g. `CreateDealInput`) for use
in components and resolvers.

## Usage

```ts
import { CreateDealSchema, type CreateDealInput } from "@grounded/types";
```

The package has no runtime dependencies beyond Zod, so depending on it never pulls app
code into another app.

## Build

```bash
pnpm --filter @grounded/types build        # tsc → dist
pnpm --filter @grounded/types check-types
```
