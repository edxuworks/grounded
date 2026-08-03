/**
 * Transport Router — PTAL Scores + TfL Journey Times
 *
 * Integrates with:
 *  1. Local PTAL grid database (bulk ingest from London Datastore CSV)
 *  2. TfL Journey Planner API (api.tfl.gov.uk) — journey times to key destinations
 *
 * PTAL: Local database, no external API call.
 * TfL: Free, 500 req/min with API key.
 */

import { protectedProcedure, router } from "@/trpc";
import { PTALQuerySchema, JourneyTimeQuerySchema } from "@grounded/types";
import { createApiCache } from "@/lib/cache";

// ── Caches ───────────────────────────────────────────────────────────────────

export interface PTALResult {
  score: string;
  numericScore: number;
}

export interface JourneyResult {
  journeys: Array<{
    destination: string;
    minutes: number;
  }>;
}

const ptalCache = createApiCache<PTALResult>({
  maxSize: 1000,
  ttlMs: 86400000, // 24h
});

const journeyCache = createApiCache<JourneyResult>({
  maxSize: 500,
  ttlMs: 86400000, // 24h
});

// ── Key London Destinations for Journey Time Queries ─────────────────────────

const KEY_DESTINATIONS = [
  { name: "Bank", lat: 51.5133, lng: -0.0886 },
  { name: "Liverpool Street", lat: 51.5178, lng: -0.0823 },
  { name: "King's Cross", lat: 51.5308, lng: -0.1238 },
  { name: "Canary Wharf", lat: 51.5054, lng: -0.0235 },
] as const;

// ── PTAL Score Mapping ───────────────────────────────────────────────────────

const PTAL_NUMERIC: Record<string, number> = {
  "0": 0, "1a": 1, "1b": 1.5, "2": 2, "3": 3, "4": 4, "5": 5, "6a": 6, "6b": 6.5,
};

// ── Router ───────────────────────────────────────────────────────────────────

export const transportRouter = router({
  /**
   * Get PTAL score for a location.
   * Queries the local ptal_grid table using nearest-point spatial query.
   * Falls back to raw SQL since Prisma doesn't support PostGIS spatial operators.
   */
  getPTAL: protectedProcedure
    .input(PTALQuerySchema)
    .query(async ({ ctx, input }): Promise<PTALResult | null> => {
      const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
      const cached = ptalCache.get(cacheKey);
      if (cached) return cached;

      try {
        // Raw SQL for nearest-point query with PostGIS
        const results = await ctx.db.$queryRawUnsafe<
          Array<{ ptal_score: string }>
        >(
          `SELECT ptal_score FROM ptal_grid
           ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
           LIMIT 1`,
          input.longitude,
          input.latitude
        );

        if (!results[0]) return null;

        const score = results[0].ptal_score;
        const result: PTALResult = {
          score,
          numericScore: PTAL_NUMERIC[score.toLowerCase()] ?? 0,
        };

        ptalCache.set(cacheKey, result);
        return result;
      } catch {
        // ptal_grid table may not exist yet (requires bulk data ingest)
        return null;
      }
    }),

  /**
   * Get journey times from a location to key London destinations via TfL API.
   */
  getJourneyTimes: protectedProcedure
    .input(JourneyTimeQuerySchema)
    .query(async ({ input }): Promise<JourneyResult> => {
      const cacheKey = `journeys:${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
      const cached = journeyCache.get(cacheKey);
      if (cached) return cached;

      const apiKey = process.env["TFL_API_KEY"];
      if (!apiKey) {
        return { journeys: [] };
      }

      const journeys: JourneyResult["journeys"] = [];

      // Fetch journey times to key destinations in parallel
      const promises = KEY_DESTINATIONS.map(async (dest) => {
        try {
          const from = `${input.latitude},${input.longitude}`;
          const to = `${dest.lat},${dest.lng}`;
          const url =
            `https://api.tfl.gov.uk/Journey/JourneyResults/${from}/to/${to}` +
            `?app_key=${apiKey}&mode=tube,dlr,overground,elizabeth-line&timeIs=Departing`;

          const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!response.ok) return null;

          const data = (await response.json()) as {
            journeys?: Array<{ duration?: number }>;
          };

          const duration = data.journeys?.[0]?.duration;
          if (duration) {
            return { destination: dest.name, minutes: duration };
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        if (r) journeys.push(r);
      }

      // Sort by duration ascending
      journeys.sort((a, b) => a.minutes - b.minutes);

      const result: JourneyResult = { journeys };
      journeyCache.set(cacheKey, result);
      return result;
    }),
});
