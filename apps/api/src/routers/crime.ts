/**
 * Crime Router — Police UK Street Crime Data
 *
 * Integrates with the Police UK API (data.police.uk) to fetch street-level
 * crime data within a 1-mile radius of a location.
 *
 * API: Free, no auth, rate limit 15 req/s.
 * Data updates monthly with ~2 month lag.
 */

import { protectedProcedure, router } from "@/trpc";
import { CrimeQuerySchema } from "@grounded/types";
import { createApiCache } from "@/lib/cache";

// ── Cache (6h TTL — crime data updates monthly) ─────────────────────────────

export interface CrimeResult {
  totalCrimes: number;
  topCategories: Array<{ category: string; count: number }>;
  period: string | null;
  points: Array<{ latitude: number; longitude: number; category: string }>;
}

const crimeCache = createApiCache<CrimeResult>({
  maxSize: 500,
  ttlMs: 21600000, // 6h
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format Police UK category slugs to human-readable labels */
function formatCategory(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Router ───────────────────────────────────────────────────────────────────

export const crimeRouter = router({
  /**
   * Get street crime data within 1 mile of a point.
   * Returns summary stats + raw points for heatmap rendering.
   */
  getStreetCrime: protectedProcedure
    .input(CrimeQuerySchema)
    .query(async ({ input }): Promise<CrimeResult> => {
      const cacheKey = `${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`;
      const cached = crimeCache.get(cacheKey);
      if (cached) return cached;

      try {
        // Police UK API uses lat/lng directly — returns crimes within 1 mile
        const url =
          `https://data.police.uk/api/crimes-street/all-crime` +
          `?lat=${input.latitude}&lng=${input.longitude}`;

        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) {
          return { totalCrimes: 0, topCategories: [], period: null, points: [] };
        }

        const crimes = (await response.json()) as Array<{
          category: string;
          month: string;
          location: {
            latitude: string;
            longitude: string;
          };
        }>;

        // Aggregate by category
        const categoryMap = new Map<string, number>();
        const points: CrimeResult["points"] = [];

        for (const crime of crimes) {
          const cat = formatCategory(crime.category);
          categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
          points.push({
            latitude: parseFloat(crime.location.latitude),
            longitude: parseFloat(crime.location.longitude),
            category: cat,
          });
        }

        // Sort categories by count descending, take top 3
        const topCategories = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([category, count]) => ({ category, count }));

        const period = crimes[0]?.month ?? null;

        const result: CrimeResult = {
          totalCrimes: crimes.length,
          topCategories,
          period,
          points,
        };

        crimeCache.set(cacheKey, result);
        return result;
      } catch {
        return { totalCrimes: 0, topCategories: [], period: null, points: [] };
      }
    }),
});
