/**
 * AnnotationLayer — GeoJSON polygon layer for the active deal's annotations.
 *
 * Renders two sub-layers:
 *  - Fill (semi-transparent, colour-coded by category)
 *  - Outline (solid line, same colour)
 *
 * Click events are handled at the Map level via interactiveLayerIds in MapCanvas.
 * Hidden categories are filtered client-side via useUIStore.
 */

import { Source, Layer } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

/** Exported so MapCanvas can register it in interactiveLayerIds. */
export const ANNOTATION_FILL_LAYER_ID = "annotations-fill";

const CATEGORY_COLORS: Record<string, string> = {
  ACCESS: "#3b82f6",
  GREEN_SPACE: "#22c55e",
  COMPETITOR: "#ef4444",
  DEMAND_GENERATOR: "#f59e0b",
  HAZARD: "#f97316",
  RISK_ZONE: "#dc2626",
  NEW_PROJECT: "#8b5cf6",
};

export function AnnotationLayer() {
  const { activeDealId, hiddenAnnotationCategories } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();

  const { data: annotations } = trpc.annotation.listByDeal.useQuery(
    { dealId: activeDealId!, workspaceId: activeWorkspaceId },
    { enabled: !!activeDealId }
  );

  if (!annotations || annotations.length === 0) return null;

  // Cast to a flat shape to avoid TypeScript depth errors from Prisma.JsonValue recursion.
  type AnnotationItem = { id: string; name: string; category: string; geometry: unknown };
  const items = annotations as unknown as AnnotationItem[];

  const features: GeoJSON.Feature[] = items
    .filter((a) => !hiddenAnnotationCategories.includes(a.category))
    .map((a): GeoJSON.Feature => ({
      type: "Feature",
      id: a.id,
      properties: {
        id: a.id,
        name: a.name,
        category: a.category,
        color: CATEGORY_COLORS[a.category] ?? "#94a3b8",
      },
      geometry: a.geometry as unknown as GeoJSON.Polygon,
    }));

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return (
    <Source id="annotations" type="geojson" data={geojson}>
      <Layer
        id={ANNOTATION_FILL_LAYER_ID}
        type="fill"
        paint={{
          "fill-color": ["get", "color"],
          "fill-opacity": 0.2,
        }}
      />
      <Layer
        id="annotations-outline"
        type="line"
        paint={{
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.85,
        }}
      />
    </Source>
  );
}
