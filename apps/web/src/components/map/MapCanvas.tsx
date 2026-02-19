/**
 * MapCanvas — Full-Screen Mapbox GL Map
 *
 * The primary visual surface of the application. Renders:
 *  1. The Mapbox base map (satellite/streets tiles)
 *  2. Deal markers (one per deal, positioned at deal coordinates)
 *  3. Annotation polygons (GeoJSON layers for the active deal)
 *  4. Optional data layers (transport POI — toggled via LayerControl)
 *  5. Drawing mode overlay (when annotation drawing is active)
 *
 * Click handling:
 *  - Click on empty map → sets a pending pin + opens the create deal form
 *  - Click on a deal marker → opens the deal sidebar
 *  - Click on an annotation → shows the annotation detail popup
 *
 * The map instance is obtained via useRef so we can call map.flyTo()
 * imperatively when flyToTarget changes in the UI store.
 *
 * Phase 4: DealMarkers ✓
 * Phase 6: AnnotationLayer — pending
 * Phase 7: TransportPOILayer — pending
 */

import { useCallback, useEffect, useRef } from "react";
import Map, { type MapRef } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { DealMarkers } from "@/components/map/DealMarker";

const MAPBOX_TOKEN = import.meta.env["VITE_MAPBOX_PUBLIC_TOKEN"] as string | undefined;

// Default view: central London
const DEFAULT_VIEW = {
  longitude: -0.1276,
  latitude: 51.5074,
  zoom: 13,
};

export function MapCanvas() {
  const mapRef = useRef<MapRef>(null);
  const { setPendingPin, openLeftPanel, flyToTarget, setFlyToTarget } = useUIStore();

  // When the user clicks an empty area of the map, set a pending pin
  // and open the left panel in "create deal" mode.
  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      setPendingPin({ longitude: event.lngLat.lng, latitude: event.lngLat.lat });
      openLeftPanel("create-deal");
    },
    [setPendingPin, openLeftPanel]
  );

  // Respond to flyToTarget changes from the UI store.
  // useEffect (not onLoad) so flyTo works after the map is loaded, not just on initial load.
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.longitude, flyToTarget.latitude],
        zoom: flyToTarget.zoom ?? 15,
        duration: 1000,
      });
      setFlyToTarget(null);
    }
  }, [flyToTarget, setFlyToTarget]);

  const handleMapLoad = useCallback(() => {
    // Map is ready — any post-load setup can go here.
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-land-bg">
        <div className="text-center p-8">
          <p className="text-red-400 font-medium">Map unavailable</p>
          <p className="text-land-muted text-sm mt-1">
            VITE_MAPBOX_PUBLIC_TOKEN is not set. Add it to apps/web/.env
          </p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={DEFAULT_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      onClick={handleMapClick}
      onLoad={handleMapLoad}
    >
      {/* Each child component subscribes to its own query — SRP. */}
      <DealMarkers />
      {/* AnnotationLayer added in Phase 6 */}
      {/* TransportPOILayer added in Phase 7 */}
    </Map>
  );
}
