/**
 * Layer Registry — Data-Driven Map Layer Configuration
 *
 * Central registry of all toggleable map layers. LayerControl.tsx iterates
 * this array to render toggles, grouped by category. MapCanvas.tsx uses
 * layer IDs to conditionally render layer components.
 *
 * To add a new layer:
 *  1. Add an entry here
 *  2. Create the layer component (e.g. FloodZoneLayer.tsx)
 *  3. Render it conditionally in MapCanvas.tsx
 *  — LayerControl automatically picks it up from this registry
 */

export interface LayerDefinition {
  /** Unique identifier used in useUIStore.enabledLayers */
  id: string;
  /** Human-readable label shown in LayerControl */
  label: string;
  /** Grouping category for the layer control panel */
  category: "Transport" | "Planning" | "Environment" | "Crime" | "Property";
  /** Whether this layer only renders when a deal is selected */
  requiresDealSelection: boolean;
}

export const LAYER_REGISTRY: LayerDefinition[] = [
  // ── Transport ──────────────────────────────────────────────────────────
  {
    id: "transport-poi",
    label: "Transport POI",
    category: "Transport",
    requiresDealSelection: true,
  },
  // PTAL layer requires bulk PostGIS data ingest — disabled until data is loaded
  // {
  //   id: "ptal",
  //   label: "PTAL Scores",
  //   category: "Transport",
  //   requiresDealSelection: true,
  // },

  // ── Planning ───────────────────────────────────────────────────────────
  {
    id: "planning-constraints",
    label: "Planning Constraints",
    category: "Planning",
    requiresDealSelection: true,
  },
  {
    id: "planning-applications",
    label: "Planning Applications",
    category: "Planning",
    requiresDealSelection: true,
  },

  // ── Environment ────────────────────────────────────────────────────────
  {
    id: "flood-zones",
    label: "Flood Zones",
    category: "Environment",
    requiresDealSelection: false,
  },

  // ── Crime ──────────────────────────────────────────────────────────────
  {
    id: "crime-heatmap",
    label: "Crime Heatmap",
    category: "Crime",
    requiresDealSelection: true,
  },
];

/** Get all unique categories from the registry (preserves order) */
export function getLayerCategories(): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const layer of LAYER_REGISTRY) {
    if (!seen.has(layer.category)) {
      seen.add(layer.category);
      categories.push(layer.category);
    }
  }
  return categories;
}
