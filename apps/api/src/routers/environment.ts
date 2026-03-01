/**
 * Environment Router — EA Flood Risk Data
 *
 * Integrates with the Environment Agency APIs:
 *  1. Flood Monitoring API — active warnings and monitoring stations
 *  2. Flood Map for Planning — flood zone classification (WMS served directly to browser)
 *
 * API: Free, no auth, no rate limits documented.
 */

import { protectedProcedure, router } from "@/trpc";
import { FloodRiskQuerySchema } from "@grounded/types";
import { createApiCache } from "@/lib/cache";

// ── Cache (15min TTL for warnings — they change frequently) ─────────────────

export interface FloodResult {
  floodZone: string | null;
  activeWarnings: number;
  warnings: Array<{
    severity: string;
    message: string;
    timeRaised: string;
  }>;
  nearestStation: string | null;
}

const floodCache = createApiCache<FloodResult>({
  maxSize: 500,
  ttlMs: 900000, // 15 min
});

// ── Router ───────────────────────────────────────────────────────────────────

export const environmentRouter = router({
  /**
   * Get flood risk data for a location.
   * Returns flood zone classification, active warnings, and nearest monitoring station.
   */
  getFloodRisk: protectedProcedure
    .input(FloodRiskQuerySchema)
    .query(async ({ input }): Promise<FloodResult> => {
      const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
      const cached = floodCache.get(cacheKey);
      if (cached) return cached;

      // Fetch active flood warnings and monitoring stations in parallel
      const [warnings, stations] = await Promise.all([
        fetchFloodWarnings(input.latitude, input.longitude),
        fetchMonitoringStations(input.latitude, input.longitude),
      ]);

      const result: FloodResult = {
        floodZone: null, // Flood zones come from WMS overlay — not available via REST API
        activeWarnings: warnings.length,
        warnings: warnings.map((w) => ({
          severity: w.severityLevel ?? "Unknown",
          message: w.message ?? "",
          timeRaised: w.timeRaised ?? "",
        })),
        nearestStation: stations[0]?.label ?? null,
      };

      floodCache.set(cacheKey, result);
      return result;
    }),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

interface FloodWarning {
  severityLevel?: string;
  message?: string;
  timeRaised?: string;
}

async function fetchFloodWarnings(
  lat: number,
  lng: number
): Promise<FloodWarning[]> {
  try {
    // EA flood warnings within ~5km of the point
    const url =
      `https://environment.data.gov.uk/flood-monitoring/id/floods` +
      `?lat=${lat}&long=${lng}&dist=5`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      items?: Array<{
        severityLevel?: number;
        severity?: string;
        message?: string;
        timeRaised?: string;
      }>;
    };

    return (data.items ?? []).map((item) => ({
      severityLevel: item.severity ?? `Level ${item.severityLevel}`,
      message: item.message ?? "",
      timeRaised: item.timeRaised ?? "",
    }));
  } catch {
    return [];
  }
}

interface MonitoringStation {
  label: string;
  distance: number;
}

async function fetchMonitoringStations(
  lat: number,
  lng: number
): Promise<MonitoringStation[]> {
  try {
    const url =
      `https://environment.data.gov.uk/flood-monitoring/id/stations` +
      `?lat=${lat}&long=${lng}&dist=3&_limit=1`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      items?: Array<{
        label?: string;
        dist?: number;
      }>;
    };

    return (data.items ?? []).map((item) => ({
      label: item.label ?? "Unknown station",
      distance: item.dist ?? 0,
    }));
  } catch {
    return [];
  }
}
