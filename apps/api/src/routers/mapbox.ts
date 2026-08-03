/**
 * Mapbox Proxy Router
 *
 * Proxies geospatial data requests to Mapbox APIs server-side.
 *
 * WHY proxy through our API instead of calling Mapbox from the browser?
 *  1. Security: The Mapbox secret token (higher rate limits, tile access)
 *     never reaches the browser. The public token in apps/web is restricted
 *     to tile rendering only.
 *  2. Caching: Future versions can cache Tilequery results (e.g. Redis) to
 *     reduce Mapbox API costs. The interface stays the same.
 *  3. Cost control: Server-side calls can be rate-limited per user/workspace
 *     to prevent accidental or malicious overuse of the Mapbox quota.
 *
 * Current integrations:
 *  - Transport POI (Tilequery API): rail/subway stations within a given radius
 *
 * Future integrations (same pattern):
 *  - Geocoding (address → coordinates)
 *  - Isochrone API (travel time polygons)
 *  - Matrix API (travel time between multiple points)
 */

import { protectedProcedure, router } from "@/trpc";
import { MapboxTransportQuerySchema } from "@grounded/types";

/** Mapbox tileset ID for the streets/transit layer */
const MAPBOX_TRANSIT_TILESET = "mapbox.mapbox-streets-v8";

/** Feature properties layer names in the streets tileset that indicate transit stops */
const TRANSIT_LAYERS = ["transit_stop_label"];

export const mapboxRouter = router({
  /**
   * Queries transport POI (rail, underground, bus stations) within a radius
   * of a given coordinate using the Mapbox Tilequery API.
   *
   * Returns GeoJSON features with properties including:
   *  - name: station name
   *  - type: 'rail', 'subway', 'bus' etc.
   *  - distance: distance from query point in metres
   *
   * Graceful degradation: if the Mapbox API is unavailable, returns an empty
   * array rather than throwing — the map layer simply won't render, but the
   * rest of the application continues to function.
   */
  queryTransportPOI: protectedProcedure
    .input(MapboxTransportQuerySchema)
    .query(async ({ input }) => {
      const token = process.env["MAPBOX_SECRET_TOKEN"];
      if (!token) {
        // Log the misconfiguration but don't crash the app.
        console.error("[mapbox] MAPBOX_SECRET_TOKEN is not set");
        return { features: [], error: "Mapbox transport data unavailable" };
      }

      const params = new URLSearchParams({
        layers: TRANSIT_LAYERS.join(","),
        radius: String(input.radius),
        limit: "20",
        dedupe: "true",
        access_token: token,
      });

      const url =
        `https://api.mapbox.com/v4/${MAPBOX_TRANSIT_TILESET}/tilequery/` +
        `${input.longitude},${input.latitude}.json?${params.toString()}`;

      try {
        const response = await fetch(url, {
          // 8s timeout — Mapbox is usually <200ms; anything longer indicates
          // a problem we should surface gracefully rather than hang on.
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          // Log the status for debugging but don't propagate to the client.
          console.error(
            `[mapbox] Tilequery returned HTTP ${response.status} for ` +
              `${input.longitude},${input.latitude}`
          );
          return { features: [], error: `Mapbox API error: ${response.status}` };
        }

        const data = (await response.json()) as {
          features: unknown[];
          type: string;
        };

        return { features: data.features ?? [], error: null };
      } catch (err) {
        // Network error, timeout, or JSON parse failure.
        // Return empty data so the map degrades gracefully.
        console.error("[mapbox] Tilequery request failed:", err);
        return { features: [], error: "Transport data temporarily unavailable" };
      }
    }),
});
