/**
 * TransportPOILayer — Transit Station Markers
 *
 * Queries transport POI (rail/underground stations) via the server-side
 * Mapbox Tilequery proxy (trpc.mapbox.queryTransportPOI), centred on the
 * active deal's location. Renders each station as a coloured circle on the map.
 *
 * Only active when:
 *  1. transportPOIEnabled is true in UIStore
 *  2. An active deal is selected (provides the query centre point)
 *
 * Graceful degradation: if the API call fails or MAPBOX_SECRET_TOKEN is not
 * set on the server, the layer silently renders nothing.
 */

import { Source, Layer } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

const DEFAULT_RADIUS_METRES = 800;

export function TransportPOILayer() {
  const { activeDealId } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();

  // Fetch the active deal to get its coordinates.
  const { data: deal } = trpc.deal.getById.useQuery(
    { id: activeDealId!, workspaceId: activeWorkspaceId },
    { enabled: !!activeDealId }
  );

  // Only query when we have deal coordinates.
  const { data: poiData } = trpc.mapbox.queryTransportPOI.useQuery(
    {
      longitude: deal?.longitude ?? 0,
      latitude: deal?.latitude ?? 0,
      radius: DEFAULT_RADIUS_METRES,
    },
    { enabled: !!deal }
  );

  if (!poiData || poiData.features.length === 0) return null;

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: poiData.features as GeoJSON.Feature[],
  };

  return (
    <Source id="transport-poi" type="geojson" data={geojson}>
      <Layer
        id="transport-poi-circles"
        type="circle"
        paint={{
          "circle-radius": 6,
          "circle-color": "#f59e0b",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        }}
      />
    </Source>
  );
}
