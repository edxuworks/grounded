/**
 * PlanningConstraintsLayer — MHCLG Planning Constraint Polygons
 *
 * Renders GeoJSON polygons from MHCLG planning data, colour-coded by
 * constraint type (conservation area, Article 4, green belt, etc.).
 * Only renders when the planning-constraints layer is enabled and a deal is selected.
 */

import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

/** Colour mapping for constraint types (from MHCLG dataset field) */
const CONSTRAINT_COLOURS: Record<string, string> = {
  "conservation-area": "#22c55e",       // green
  "article-4-direction-area": "#f59e0b", // amber
  "listed-building-outline": "#a855f7",  // purple
  "brownfield-land": "#78716c",          // stone
  "green-belt-core": "#16a34a",          // dark green
};

const DEFAULT_COLOUR = "#3b82f6"; // blue fallback

export function PlanningConstraintsLayer() {
  const { activeDealId } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();

  const { data: deal } = trpc.deal.getById.useQuery(
    { id: activeDealId!, workspaceId: activeWorkspaceId },
    { enabled: !!activeDealId }
  );

  const { data } = trpc.planning.getConstraints.useQuery(
    { latitude: deal?.latitude ?? 0, longitude: deal?.longitude ?? 0 },
    { enabled: !!deal, staleTime: 86400000 }
  );

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!data?.features?.length) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: data.features as GeoJSON.Feature[],
    };
  }, [data]);

  if (geojson.features.length === 0) return null;

  return (
    <Source id="planning-constraints" type="geojson" data={geojson}>
      <Layer
        id="planning-constraints-fill"
        type="fill"
        paint={{
          "fill-color": [
            "match",
            ["get", "dataset"],
            "conservation-area", CONSTRAINT_COLOURS["conservation-area"]!,
            "article-4-direction-area", CONSTRAINT_COLOURS["article-4-direction-area"]!,
            "listed-building-outline", CONSTRAINT_COLOURS["listed-building-outline"]!,
            "brownfield-land", CONSTRAINT_COLOURS["brownfield-land"]!,
            "green-belt-core", CONSTRAINT_COLOURS["green-belt-core"]!,
            DEFAULT_COLOUR,
          ],
          "fill-opacity": 0.2,
        }}
      />
      <Layer
        id="planning-constraints-outline"
        type="line"
        paint={{
          "line-color": [
            "match",
            ["get", "dataset"],
            "conservation-area", CONSTRAINT_COLOURS["conservation-area"]!,
            "article-4-direction-area", CONSTRAINT_COLOURS["article-4-direction-area"]!,
            "listed-building-outline", CONSTRAINT_COLOURS["listed-building-outline"]!,
            "brownfield-land", CONSTRAINT_COLOURS["brownfield-land"]!,
            "green-belt-core", CONSTRAINT_COLOURS["green-belt-core"]!,
            DEFAULT_COLOUR,
          ],
          "line-width": 2,
          "line-opacity": 0.7,
        }}
      />
    </Source>
  );
}
