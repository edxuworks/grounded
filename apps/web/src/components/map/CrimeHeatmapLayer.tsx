/**
 * CrimeHeatmapLayer — Police UK Crime Heatmap
 *
 * Renders crime data as a Mapbox-native heatmap layer.
 * Uses crime points from the Police UK API, with intensity weighted
 * by the number of crimes at each location.
 */

import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

export function CrimeHeatmapLayer() {
  const { activeDealId } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();

  const { data: deal } = trpc.deal.getById.useQuery(
    { id: activeDealId!, workspaceId: activeWorkspaceId },
    { enabled: !!activeDealId }
  );

  const { data } = trpc.crime.getStreetCrime.useQuery(
    { latitude: deal?.latitude ?? 0, longitude: deal?.longitude ?? 0 },
    { enabled: !!deal, staleTime: 86400000 }
  );

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!data?.points?.length) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: data.points.map((p: { latitude: number; longitude: number; category: string }) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.longitude, p.latitude],
        },
        properties: { category: p.category },
      })),
    };
  }, [data]);

  if (geojson.features.length === 0) return null;

  return (
    <Source id="crime-heatmap" type="geojson" data={geojson}>
      <Layer
        id="crime-heatmap-heat"
        type="heatmap"
        paint={{
          // Increase weight based on zoom (more granular at higher zoom)
          "heatmap-weight": 1,
          // Increase intensity at lower zoom levels
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"],
            10, 1,
            15, 3,
          ],
          // Color ramp from transparent to red
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(65,105,225,0.4)",
            0.4, "rgba(0,255,136,0.5)",
            0.6, "rgba(255,255,0,0.6)",
            0.8, "rgba(255,165,0,0.7)",
            1, "rgba(255,0,0,0.8)",
          ],
          // Adjust radius by zoom
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 15,
            15, 25,
          ],
          // Fade out at high zoom where individual points become visible
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"],
            14, 0.8,
            18, 0.3,
          ],
        }}
      />
    </Source>
  );
}
