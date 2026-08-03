/**
 * DrawingPreviewLayer — Live preview while drawing a polygon annotation
 *
 * Renders three visual elements on the map while the user is placing vertices:
 *  1. Solid line connecting all placed vertices + cursor (shows progress)
 *  2. Dashed closing line from cursor back to first vertex (shows polygon shape)
 *  3. Amber circle dots on each placed vertex
 *
 * The closing dashed line only appears once ≥ 2 vertices are placed so the
 * user can see what the finished polygon will look like as they draw.
 *
 * Props:
 *  cursorPosition — current map cursor coordinates [lng, lat], or null if the
 *                   cursor is outside the map. Passed from MapCanvas onMouseMove.
 */

import { Source, Layer } from "react-map-gl";
import { useDrawingStore } from "@/store/useDrawingStore";

interface Props {
  cursorPosition: [number, number] | null;
}

export function DrawingPreviewLayer({ cursorPosition }: Props) {
  const { isDrawing, currentPoints } = useDrawingStore();

  if (!isDrawing || currentPoints.length === 0) return null;

  const features: {
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }[] = [];

  // ── Main line: placed vertices → cursor ──────────────────────────────────
  // Show line as soon as we have at least 1 vertex and a cursor position.
  const mainLineCoords =
    cursorPosition ? [...currentPoints, cursorPosition] : currentPoints;

  if (mainLineCoords.length >= 2) {
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: mainLineCoords },
      properties: {},
    });
  }

  // ── Closing line: cursor → first vertex (dashed) ─────────────────────────
  // Only show once ≥ 2 vertices are placed so the user sees the polygon shape.
  if (currentPoints.length >= 2 && cursorPosition) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [cursorPosition, currentPoints[0]!],
      },
      properties: { closing: true },
    });
  }

  // ── Vertex dots ───────────────────────────────────────────────────────────
  for (const point of currentPoints) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: point },
      properties: {},
    });
  }

  const geojson = { type: "FeatureCollection" as const, features };

  return (
    <Source id="drawing-preview" type="geojson" data={geojson}>
      {/* Solid line: placed vertices + rubber-band to cursor */}
      <Layer
        id="drawing-preview-line"
        type="line"
        filter={["!", ["has", "closing"]]}
        paint={{
          "line-color": "#f59e0b",
          "line-width": 2,
        }}
      />
      {/* Dashed closing line: cursor → first vertex */}
      <Layer
        id="drawing-preview-closing"
        type="line"
        filter={["has", "closing"]}
        paint={{
          "line-color": "#f59e0b",
          "line-width": 1.5,
          "line-dasharray": [3, 3],
        }}
      />
      {/* Vertex dots */}
      <Layer
        id="drawing-preview-vertices"
        type="circle"
        paint={{
          "circle-radius": 5,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        }}
      />
    </Source>
  );
}
