/**
 * PlanningApplicationsLayer — PlanIt Planning Application Markers
 *
 * Renders planning application markers near the active deal, colour-coded
 * by status (approved/refused/pending).
 */

import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

export function PlanningApplicationsLayer() {
  const { activeDealId } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();

  const { data: deal } = trpc.deal.getById.useQuery(
    { id: activeDealId!, workspaceId: activeWorkspaceId },
    { enabled: !!activeDealId }
  );

  const { data } = trpc.planning.getApplications.useQuery(
    {
      latitude: deal?.latitude ?? 0,
      longitude: deal?.longitude ?? 0,
      radius: 500,
    },
    { enabled: !!deal, staleTime: 86400000 }
  );

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!data?.applications?.length) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: data.applications
        .filter((a: { latitude: number; longitude: number }) => a.latitude && a.longitude)
        .map((a: { id: string; latitude: number; longitude: number; status: string; description: string }) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [a.longitude, a.latitude],
          },
          properties: {
            id: a.id,
            status: a.status,
            description: a.description,
          },
        })),
    };
  }, [data]);

  if (geojson.features.length === 0) return null;

  return (
    <Source id="planning-applications" type="geojson" data={geojson}>
      <Layer
        id="planning-applications-circles"
        type="circle"
        paint={{
          "circle-radius": 5,
          "circle-color": [
            "match",
            ["get", "status"],
            "Permitted", "#22c55e",     // green
            "Conditions", "#86efac",    // light green
            "Rejected", "#ef4444",      // red
            "Withdrawn", "#6b7280",     // grey
            "Undecided", "#f59e0b",     // amber
            "#f59e0b",                  // amber fallback
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.85,
        }}
      />
    </Source>
  );
}
