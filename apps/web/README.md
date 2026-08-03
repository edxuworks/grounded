# @grounded/web

**Analyst-facing map workspace for Grounded** — a single-page React application for sourcing, annotating, and analysing UK real-estate deals directly on an interactive map.

## Overview

`@grounded/web` is the frontend of the Grounded platform: a map-centric workspace where property analysts work spatially rather than in spreadsheets. Within a workspace, users can:

- **Create deals as map pins** — click the map to drop a pin, then fill in a deal record.
- **Draw spatial annotations** — sketch polygons and rectangles over the map to mark boundaries, red-line sites, or areas of interest, attached to a specific deal.
- **Upload offering-memoranda PDFs** — an OM is base64-encoded in the browser and sent to the API, where Claude extracts the subject-property address and any competitor properties in a single LLM call; addresses are geocoded via Mapbox and plotted.
- **Read a Location Intelligence panel** — for the selected deal, a board aggregates 10+ public UK data sources (EPC/property, crime, planning constraints and applications, transport/PTAL, flood risk, broadband) into collapsible sections.

The app is deliberately a thin, type-safe client: all business logic and data live behind the [`@grounded/api`](../api) tRPC server, and the frontend infers its types directly from that router with no codegen step.

## Tech stack

| Concern | Library | Version |
| --- | --- | --- |
| UI framework | [React](https://react.dev) | `^18.3.1` |
| Build tool / dev server | [Vite](https://vitejs.dev) | `^6.0.7` |
| Language | [TypeScript](https://www.typescriptlang.org) | `^5.7.3` |
| Map rendering | [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | `^3.9.3` |
| React map bindings | [react-map-gl](https://visgl.github.io/react-map-gl/) | `^7.1.8` |
| Map drawing | [@mapbox/mapbox-gl-draw](https://github.com/mapbox/mapbox-gl-draw) | `^1.5.1` |
| GPU data-viz layers | [deck.gl](https://deck.gl) (`@deck.gl/core`, `/layers`, `/react`) | `^9.1.4` |
| API client | [@trpc/client](https://trpc.io) + [@trpc/react-query](https://trpc.io) | `^11.0.0` |
| Server-state / caching | [@tanstack/react-query](https://tanstack.com/query) | `^5.64.2` |
| Client-state | [Zustand](https://zustand-demo.pmnd.rs) | `^5.0.3` |
| Accessible primitives | [Radix UI](https://www.radix-ui.com) (dialog, dropdown, select, switch, tooltip, scroll-area, separator) | `^1.x–2.x` |
| Styling | [Tailwind CSS](https://tailwindcss.com) + `tailwindcss-animate` | `^3.4.17` |
| Forms | [react-hook-form](https://react-hook-form.com) + `@hookform/resolvers` | `^7.54.2` |
| Validation | [Zod](https://zod.dev) | `^3.24.1` |
| Auth / session | [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) | `^2.48.1` |
| Icons | [lucide-react](https://lucide.dev) | `^0.468.0` |

## Architecture

### Layout shell

[`MapShell`](src/components/MapShell.tsx) is the root layout for the app. It renders a full-screen [`MapCanvas`](src/components/map/MapCanvas.tsx) as the base layer and overlays floating panels with absolute positioning and a fixed z-index stack:

```
┌─────────────────────────────────────────────┐
│ [LeftPanel]              [2D/3D] [LayerControl]│
│                                               │
│                 MapCanvas                     │
│            (Mapbox GL, full-screen)           │
│                                               │
│                              [DealSidebar]    │
│ [Upload OM]                                   │
└─────────────────────────────────────────────┘
```

Panels are wired independently — [`LeftPanel`](src/components/left-panel/LeftPanel.tsx), [`DealSidebar`](src/components/sidebar/DealSidebar.tsx), and [`LayerControl`](src/components/map/LayerControl.tsx) — each wrapped in an `ErrorBoundary` so one panel failing never takes down the map. [`App`](src/App.tsx) sits above `MapShell`, providing the tRPC + React Query context and routing between the [`WorkspaceDashboard`](src/features/workspace/WorkspaceDashboard.tsx) and the map via [`WorkspaceProvider`](src/features/workspace/WorkspaceProvider.tsx).

### End-to-end type safety

The tRPC client ([`src/api/trpc.ts`](src/api/trpc.ts)) is typed with the API's `AppRouter`, imported **as a type only** from `@grounded/api`:

```ts
import type { AppRouter } from "@grounded/api";
export const trpc = createTRPCReact<AppRouter>();
```

No runtime code from the API ships to the browser and there is **no codegen step** — TypeScript infers every procedure's input and output straight from the router definition, so a breaking API change surfaces as a compile error in the frontend. Requests go through a single `httpBatchLink`, and each request attaches the Supabase JWT (`Authorization: Bearer …`) unless dev-bypass auth is enabled.

### State management

Server state and client state are kept strictly separate:

- **React Query** owns all server data (deals, comments, intelligence) — caching, background refetch, and invalidation. Defaults: `staleTime` 60s, `retry` 1, focus-refetch only in production.
- **Zustand** owns purely client-side UI state, in two focused stores:
  - [`useUIStore`](src/store/useUIStore.ts) — panel visibility (`sidebarOpen`, `leftPanelOpen`, `leftPanelMode`), active selections (`activeDealId`, `pendingPin`, `previewPin`, `activeWorkspaceId`), map control (`flyToTarget`), annotation selection/hiding, competitor pins, and the `enabledLayers` map that drives layer toggles.
  - [`useDrawingStore`](src/store/useDrawingStore.ts) — the annotation drawing lifecycle (`activeTool`, `currentPoints`, `isDrawing`, `completedPolygon`). Kept separate so high-frequency drawing updates don't re-render the sidebar or left panel.

### Map-layer registry

Toggleable data layers are declared once in [`src/components/map/layerRegistry.ts`](src/components/map/layerRegistry.ts). `LayerControl` iterates the registry to render grouped toggles (Transport, Planning, Environment, Crime, Property); each entry declares whether it `requiresDealSelection`. `MapCanvas` conditionally mounts the matching layer component based on `useUIStore.enabledLayers`. Adding a layer is: add a registry entry → create the layer component → mount it in `MapCanvas`; the control panel picks it up automatically.

## Key features & UI areas

- **Map canvas & deal markers** — [`MapCanvas`](src/components/map/MapCanvas.tsx) renders the Mapbox GL map with a 2D/3D toggle. [`DealMarkers`](src/components/map/DealMarker.tsx) plots every deal in the workspace as a clickable marker that opens the sidebar.
- **Drawing annotations** — polygon and rectangle tools ([`useDrawingStore`](src/store/useDrawingStore.ts)) let users draw geometry over the map; [`DrawingPreviewLayer`](src/components/map/DrawingPreviewLayer.tsx) shows the in-progress shape, and [`AnnotationPanel`](src/components/sidebar/AnnotationPanel.tsx) saves it against the deal.
- **Left panel** — [`LeftPanel`](src/components/left-panel/LeftPanel.tsx) toggles between [`DealFileManager`](src/components/left-panel/DealFileManager.tsx) (list/create/delete deal files), [`CreateDealForm`](src/components/left-panel/CreateDealForm.tsx) (add a deal at the pending pin, react-hook-form + Zod), and [`FieldDefManager`](src/components/sidebar/FieldDefManager.tsx) (custom field definitions).
- **OM upload** — [`UploadOMModal`](src/components/upload/UploadOMModal.tsx) provides a drag-and-drop dropzone with `idle → analysing → result → error` states, editable extracted-address fields, and a competitor list before plotting.
- **Deal sidebar** — [`DealSidebar`](src/components/sidebar/DealSidebar.tsx) is a tabbed panel: **Overview** (address, status badge, custom fields via [`PropertyGrid`](src/components/sidebar/PropertyGrid.tsx), competitor distances), **Intelligence**, **Comments** ([`CommentStream`](src/components/sidebar/CommentStream.tsx)), and **Annotations**.
- **Location Intelligence board** — [`LocationIntelligenceBoard`](src/components/sidebar/intelligence/LocationIntelligenceBoard.tsx) renders independent collapsible sections, each backed by its own tRPC query keyed to the deal's coordinates/address so one failing source never blocks the rest:

  | Section | Component | Data |
  | --- | --- | --- |
  | Property | [`PropertySection`](src/components/sidebar/intelligence/PropertySection.tsx) | EPC certificate (`property.getEPC`) |
  | Environment | [`EnvironmentSection`](src/components/sidebar/intelligence/EnvironmentSection.tsx) | Flood risk (`environment.getFloodRisk`) |
  | Crime | [`CrimeSection`](src/components/sidebar/intelligence/CrimeSection.tsx) | Street-level crime (`crime.getStreetCrime`) |
  | Transport | [`TransportSection`](src/components/sidebar/intelligence/TransportSection.tsx) | PTAL score + TfL journey times (`transport.getPTAL`, `transport.getJourneyTimes`) |
  | Planning | [`PlanningSection`](src/components/sidebar/intelligence/PlanningSection.tsx) | Constraints + applications (`planning.getConstraints`, `planning.getApplications`) |
  | Broadband | [`BroadbandSection`](src/components/sidebar/intelligence/BroadbandSection.tsx) | Broadband availability (`property.getBroadband`) |

## Map layers

Layers under [`src/components/map/`](src/components/map/) are drawn with react-map-gl's native Mapbox GL `Source`/`Layer` and `Marker` components (deck.gl is available in the stack for GPU-accelerated layers):

| Layer | Component | Renders |
| --- | --- | --- |
| Deal markers | [`DealMarker`](src/components/map/DealMarker.tsx) | Workspace deals as clickable pins |
| Competitor pins | [`CompetitorPinsLayer`](src/components/map/CompetitorPinsLayer.tsx) | Competitor properties extracted from OMs, as red pins |
| Preview pin | [`PreviewPinMarker`](src/components/map/PreviewPinMarker.tsx) | Pulsing marker for a freshly geocoded OM address, pending save |
| Annotations | [`AnnotationLayer`](src/components/map/AnnotationLayer.tsx) | Saved polygon/rectangle annotations as filled GeoJSON |
| Drawing preview | [`DrawingPreviewLayer`](src/components/map/DrawingPreviewLayer.tsx) | The in-progress shape while drawing |
| Crime heatmap | [`CrimeHeatmapLayer`](src/components/map/CrimeHeatmapLayer.tsx) | Police-UK street crime as a heatmap around the deal |
| Transport POI | [`TransportPOILayer`](src/components/map/TransportPOILayer.tsx) | Nearby transport points of interest |
| Planning constraints | [`PlanningConstraintsLayer`](src/components/map/PlanningConstraintsLayer.tsx) | Planning constraint polygons |
| Planning applications | [`PlanningApplicationsLayer`](src/components/map/PlanningApplicationsLayer.tsx) | Nearby planning application points |
| Flood zones | [`FloodZoneLayer`](src/components/map/FloodZoneLayer.tsx) | Environment Agency flood-zone polygons |

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in the values (never commit `.env`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the Grounded API. In dev, leave as `http://localhost:3001` (Vite also proxies `/api`). In prod, the deployed API URL. |
| `VITE_SUPABASE_URL` | Supabase project URL (public by design). |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public by design). |
| `VITE_MAPBOX_PUBLIC_TOKEN` | Mapbox **public** token (`pk.…`) for browser tile/style rendering. |

> **Token safety:** the public Mapbox token is browser-safe but should be **domain-restricted** in the Mapbox dashboard (scopes `styles:read`, `tiles:read`). The **secret** Mapbox token (geocoding, tilequery) stays server-side in the API and is never exposed here.

Additional flags read from the code:

- `VITE_DEMO_MODE` — when `true` at build time, skips auth and workspace selection entirely and drops straight into the map with a stub workspace and no database ([`App.tsx`](src/App.tsx), [`WorkspaceProvider.tsx`](src/features/workspace/WorkspaceProvider.tsx)). Used for the public portfolio deployment.
- `VITE_DEV_BYPASS_AUTH` — when `true`, the client sends no Authorization header and relies on the API's dev-user injection.
- `VITE_HOME_URL` — URL for the "GROUNDED" home link (defaults to the marketing site).

## Development

Run from the monorepo root with pnpm workspace filters:

```bash
# Start the Vite dev server on http://localhost:5173
pnpm --filter @grounded/web dev

# Type-check the whole app (no emit)
pnpm --filter @grounded/web check-types

# Production build (tsc + vite build → dist/)
pnpm --filter @grounded/web build

# Preview the production build locally
pnpm --filter @grounded/web preview
```

The dev server proxies `/api` to `http://localhost:3001` (see [`vite.config.ts`](vite.config.ts)), so the app and API appear same-origin in the browser and there are no CORS issues in development. Imports use the `@/` alias mapped to `src/`.

## Testing

Vitest and Testing Library (`@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8`) are configured, but **unit tests are not yet written** — the `test` script runs with `--passWithNoTests`, so it currently passes vacuously.

```bash
pnpm --filter @grounded/web test          # run once (passes with no tests)
pnpm --filter @grounded/web test:watch    # watch mode
pnpm --filter @grounded/web test:coverage # coverage report
```
