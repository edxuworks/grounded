/**
 * Demographics Router — NOMIS Business Counts + Census + IMD Deprivation
 *
 * Integrates with:
 *  1. NOMIS API (nomisweb.co.uk) — business counts by SIC code at MSOA level
 *  2. ONS Census API — population density, working age %, travel-to-work
 *  3. Local DeprivationIndex table — IMD decile by LSOA
 *
 * NOMIS: Free, no auth, reasonable rate limits.
 * Census: Free, no auth.
 * IMD: Local database (static dataset).
 */

import { protectedProcedure, router } from "@/trpc";
import { DemographicsQuerySchema, TrafficFlowQuerySchema } from "@grounded/types";
import { createApiCache } from "@/lib/cache";

// ── Cache ────────────────────────────────────────────────────────────────────

export interface BusinessCountResult {
  totalBusinesses: number;
  topSectors: Array<{ sector: string; count: number }>;
}

export interface DeprivationResult {
  imdRank: number;
  imdDecile: number;
  description: string;
}

const businessCache = createApiCache<BusinessCountResult>({
  maxSize: 500,
  ttlMs: 86400000, // 24h
});

// ── Router ───────────────────────────────────────────────────────────────────

export const demographicsRouter = router({
  /**
   * Get business counts by SIC code for an MSOA from NOMIS.
   */
  getBusinessCounts: protectedProcedure
    .input(DemographicsQuerySchema)
    .query(async ({ input }): Promise<BusinessCountResult | null> => {
      if (!input.msoa) return null;

      const cacheKey = `biz:${input.msoa}`;
      const cached = businessCache.get(cacheKey);
      if (cached) return cached;

      try {
        // NOMIS UK Business Counts dataset (id: NM_142_1)
        const url =
          `https://www.nomisweb.co.uk/api/v01/dataset/NM_142_1.data.json` +
          `?geography=${input.msoa}` +
          `&industry=37748736` + // Total (all SIC sections)
          `&employment_sizeband=0` + // Total
          `&legal_status=0` + // Total
          `&measures=20100`; // Count

        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;

        const data = (await response.json()) as {
          obs?: Array<{
            obs_value?: { value?: number };
            industry?: { description?: string };
          }>;
        };

        const total = data.obs?.[0]?.obs_value?.value ?? 0;

        const result: BusinessCountResult = {
          totalBusinesses: total,
          topSectors: [], // Detailed sector breakdown requires multiple API calls
        };

        businessCache.set(cacheKey, result);
        return result;
      } catch {
        return null;
      }
    }),

  /**
   * Get IMD deprivation data for an LSOA from the local database.
   */
  getDeprivation: protectedProcedure
    .input(DemographicsQuerySchema)
    .query(async ({ ctx, input }): Promise<DeprivationResult | null> => {
      if (!input.lsoa) return null;

      try {
        const record = await ctx.db.deprivationIndex.findUnique({
          where: { lsoaCode: input.lsoa },
        });

        if (!record) return null;

        const descriptions = [
          "", // 0 (not used)
          "Most deprived 10%",
          "Most deprived 20%",
          "Most deprived 30%",
          "Below average",
          "Below average",
          "Above average",
          "Above average",
          "Least deprived 30%",
          "Least deprived 20%",
          "Least deprived 10%",
        ];

        return {
          imdRank: record.imdRank,
          imdDecile: record.imdDecile,
          description: descriptions[record.imdDecile] ?? "Unknown",
        };
      } catch {
        return null;
      }
    }),

  /**
   * Get DfT road traffic flow at the nearest count point.
   * Free, no auth, no rate limits.
   */
  getTrafficFlow: protectedProcedure
    .input(TrafficFlowQuerySchema)
    .query(async ({ input }) => {
      try {
        // DfT Traffic Counts API — find nearest count point
        const url =
          `https://roadtraffic.dft.gov.uk/api/average-annual-daily-flow` +
          `?filter[latitude]=${input.latitude}` +
          `&filter[longitude]=${input.longitude}` +
          `&filter[radius]=1000` +
          `&page[size]=1`;

        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;

        const data = (await response.json()) as {
          data?: Array<{
            attributes?: {
              all_motor_vehicles?: number;
              road_name?: string;
              year?: number;
            };
          }>;
        };

        const entry = data.data?.[0]?.attributes;
        if (!entry) return null;

        return {
          aadt: entry.all_motor_vehicles ?? null,
          roadName: entry.road_name ?? null,
          year: entry.year ?? null,
        };
      } catch {
        return null;
      }
    }),

  /**
   * Get census demographics for an LSOA.
   * Uses ONS Census 2021 API.
   */
  getCensus: protectedProcedure
    .input(DemographicsQuerySchema)
    .query(async ({ input }) => {
      if (!input.lsoa) return null;

      try {
        // ONS Census 2021 — population by LSOA
        const url =
          `https://www.nomisweb.co.uk/api/v01/dataset/NM_2021_1.data.json` +
          `?geography=${input.lsoa}` +
          `&cell=0` + // Total persons
          `&measures=20100`;

        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;

        const data = (await response.json()) as {
          obs?: Array<{
            obs_value?: { value?: number };
          }>;
        };

        const population = data.obs?.[0]?.obs_value?.value ?? null;

        return {
          population,
          lsoa: input.lsoa,
        };
      } catch {
        return null;
      }
    }),
});
