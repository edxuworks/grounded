/**
 * FloodZoneLayer — EA Flood Zone WMS Overlay
 *
 * Renders flood zones 2 & 3 from the Environment Agency's WMS service
 * as a raster tile overlay. Served directly from EA servers, no proxy needed.
 *
 * Always visible when toggled on (not deal-dependent) — flood zones are
 * a geographic feature, not tied to a specific property.
 */

import { Source, Layer } from "react-map-gl";

/**
 * EA Flood Map for Planning WMS — combined flood zones 2 & 3.
 * Layer: Flood_Zones_2_3_Rivers_and_Sea
 * Zone 2 = medium probability, Zone 3 = high probability.
 * The WMS renders both together with distinct styling.
 */
const EA_FLOOD_WMS_URL =
  "https://environment.data.gov.uk/spatialdata/flood-map-for-planning-flood-zones/wms" +
  "?service=WMS&version=1.1.1&request=GetMap" +
  "&layers=Flood_Zones_2_3_Rivers_and_Sea" +
  "&srs=EPSG:3857&transparent=true&format=image/png" +
  "&bbox={bbox-epsg-3857}&width=256&height=256";

export function FloodZoneLayer() {
  return (
    <Source
      id="flood-zones"
      type="raster"
      tiles={[EA_FLOOD_WMS_URL]}
      tileSize={256}
    >
      <Layer
        id="flood-zones-tiles"
        type="raster"
        paint={{
          "raster-opacity": 0.45,
        }}
      />
    </Source>
  );
}
