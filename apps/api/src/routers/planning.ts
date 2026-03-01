/**
 * Planning Router — MHCLG Constraints + PlanIt Applications
 *
 * Integrates with two free UK planning data APIs:
 *  1. MHCLG Planning Data (planning.data.gov.uk) — statutory planning constraints
 *     (conservation areas, Article 4 directions, listed buildings, green belt, brownfield)
 *  2. PlanIt (planit.org.uk) — planning applications near a location
 *
 * Both APIs are free, require no authentication, and support coordinate-based queries.
 */

import { protectedProcedure, router } from "@/trpc";
import {
  PlanningConstraintsQuerySchema,
  PlanningApplicationsQuerySchema,
} from "@grounded/types";
import { createApiCache } from "@/lib/cache";

// ── Cache (24h TTL — planning boundaries change at most quarterly) ───────────

const constraintsCache = createApiCache<ConstraintsResult>({
  maxSize: 500,
  ttlMs: 86400000,
});

const applicationsCache = createApiCache<ApplicationsResult>({
  maxSize: 500,
  ttlMs: 86400000,
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConstraintsResult {
  conservationArea: boolean;
  article4: boolean;
  listedBuildingsCount: number;
  greenBelt: boolean;
  brownfield: boolean;
  features: unknown[];
}

export interface PlanningApplication {
  id: string;
  description: string;
  status: string;
  date: string;
  latitude: number;
  longitude: number;
}

export interface ApplicationsResult {
  applications: PlanningApplication[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchMHCLGDataset(
  dataset: string,
  lat: number,
  lng: number
): Promise<{ entities: unknown[]; count: number }> {
  // Note: the correct endpoint is /entity.geojson at the root, NOT /api/v1/entity.geojson
  const url =
    `https://www.planning.data.gov.uk/entity.geojson` +
    `?dataset=${dataset}` +
    `&longitude=${lng}&latitude=${lat}` +
    `&limit=20`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { entities: [], count: 0 };

    const data = (await response.json()) as {
      features?: unknown[];
      count?: number;
    };

    return {
      entities: data.features ?? [],
      count: data.features?.length ?? 0,
    };
  } catch {
    return { entities: [], count: 0 };
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

export const planningRouter = router({
  /**
   * Get planning constraints for a point from MHCLG Planning Data.
   * Parallel-fetches multiple dataset types and returns summary + GeoJSON features.
   */
  getConstraints: protectedProcedure
    .input(PlanningConstraintsQuerySchema)
    .query(async ({ input }): Promise<ConstraintsResult> => {
      const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
      const cached = constraintsCache.get(cacheKey);
      if (cached) return cached;

      const [conservation, article4, listed, brownfield, greenBelt] =
        await Promise.all([
          fetchMHCLGDataset("conservation-area", input.latitude, input.longitude),
          fetchMHCLGDataset("article-4-direction-area", input.latitude, input.longitude),
          fetchMHCLGDataset("listed-building-outline", input.latitude, input.longitude),
          fetchMHCLGDataset("brownfield-land", input.latitude, input.longitude),
          fetchMHCLGDataset("green-belt-core", input.latitude, input.longitude),
        ]);

      const allFeatures = [
        ...conservation.entities,
        ...article4.entities,
        ...listed.entities,
        ...brownfield.entities,
        ...greenBelt.entities,
      ];

      const result: ConstraintsResult = {
        conservationArea: conservation.count > 0,
        article4: article4.count > 0,
        listedBuildingsCount: listed.count,
        greenBelt: greenBelt.count > 0,
        brownfield: brownfield.count > 0,
        features: allFeatures,
      };

      constraintsCache.set(cacheKey, result);
      return result;
    }),

  /**
   * Get recent planning applications near a point from PlanIt.
   */
  getApplications: protectedProcedure
    .input(PlanningApplicationsQuerySchema)
    .query(async ({ input }): Promise<ApplicationsResult> => {
      const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)},${input.radius}`;
      const cached = applicationsCache.get(cacheKey);
      if (cached) return cached;

      try {
        // PlanIt API uses krad (km) not radius (m), and pg_sz not limit
        const krad = input.radius / 1000;
        const url =
          `https://www.planit.org.uk/api/applics/json` +
          `?lat=${input.latitude}&lng=${input.longitude}` +
          `&krad=${krad}` +
          `&pg_sz=20`;

        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return { applications: [] };

        const data = (await response.json()) as {
          records?: Array<{
            uid?: string;
            description?: string;
            app_state?: string;
            decided_date?: string;
            start_date?: string;
            location_y?: number;
            location_x?: number;
          }>;
        };

        const applications: PlanningApplication[] = (data.records ?? []).map((r) => ({
          id: r.uid ?? "",
          description: r.description ?? "No description",
          status: r.app_state ?? "Pending",
          date: r.decided_date ?? r.start_date ?? "",
          latitude: r.location_y ?? 0,
          longitude: r.location_x ?? 0,
        }));

        const result: ApplicationsResult = { applications };
        applicationsCache.set(cacheKey, result);
        return result;
      } catch {
        return { applications: [] };
      }
    }),
});
