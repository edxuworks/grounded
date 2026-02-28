/**
 * MapCanvas — Full-Screen Mapbox GL Map
 *
 * Renders the base map, deal markers, annotation polygons, and (Phase 7)
 * transport POI layers.
 *
 * Click handling:
 *  - Drawing active → adds a polygon vertex to useDrawingStore
 *  - Otherwise      → sets a pending pin + opens the create deal form
 *  - Annotation polygon clicked → selects the annotation in UIStore
 */

import { useCallback, useEffect, useRef } from "react";
import Map, { type MapRef } from "react-map-gl";
import type { MapLayerMouseEvent } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useDrawingStore } from "@/store/useDrawingStore";
import { DealMarkers } from "@/components/map/DealMarker";
import { AnnotationLayer, ANNOTATION_FILL_LAYER_ID } from "@/components/map/AnnotationLayer";
import { TransportPOILayer } from "@/components/map/TransportPOILayer";
import { PreviewPinMarker } from "@/components/map/PreviewPinMarker";

const MAPBOX_TOKEN = import.meta.env["VITE_MAPBOX_PUBLIC_TOKEN"] as string | undefined;

const DEFAULT_VIEW = {
  longitude: -0.1276,
  latitude: 51.5074,
  zoom: 13,
};

export function MapCanvas() {
  const mapRef = useRef<MapRef>(null);
  const {
    setPendingPin,
    openLeftPanel,
    flyToTarget,
    setFlyToTarget,
    selectAnnotation,
    transportPOIEnabled,
    previewPin,
  } = useUIStore();
  const { isDrawing, addPoint, currentPoints } = useDrawingStore();

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (isDrawing) {
        addPoint([event.lngLat.lng, event.lngLat.lat]);
        return;
      }
      // If the click hit an annotation polygon, select it instead of creating a deal.
      const annotationId = event.features?.find(
        (f) => f.layer?.id === ANNOTATION_FILL_LAYER_ID
      )?.properties?.id as string | undefined;
      if (annotationId) {
        selectAnnotation(annotationId);
        return;
      }
      setPendingPin({ longitude: event.lngLat.lng, latitude: event.lngLat.lat });
      openLeftPanel("create-deal");
    },
    [isDrawing, addPoint, selectAnnotation, setPendingPin, openLeftPanel]
  );

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

  // Fly to preview pin when it is first set (after OM analysis).
  useEffect(() => {
    if (previewPin && mapRef.current) {
      mapRef.current.flyTo({
        center: [previewPin.longitude, previewPin.latitude],
        zoom: 15,
        duration: 1200,
      });
    }
  }, [previewPin]);

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
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={DEFAULT_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onClick={handleMapClick}
        cursor={isDrawing ? "crosshair" : "grab"}
        interactiveLayerIds={[ANNOTATION_FILL_LAYER_ID]}
      >
        <DealMarkers />
        <AnnotationLayer />
        {transportPOIEnabled && <TransportPOILayer />}
        <PreviewPinMarker />
      </Map>

      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-land-surface/90 border border-land-accent/40 rounded-full text-xs text-land-text backdrop-blur-sm pointer-events-none">
          Click to place vertices ({currentPoints.length} placed) — click Finish in the Annotations tab
        </div>
      )}
    </div>
  );
}
