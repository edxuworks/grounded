/**
 * Property Router — EPC + Broadband + VOA Comparables
 *
 * Integrates with:
 *  1. EPC Non-Domestic API (opendatacommunities.org) — energy performance certificates
 *  2. Ofcom Broadband API (api-proxy.ofcom.org.uk) — broadband speed/availability
 *  3. VOA Rating Lists (local database) — rateable values for comparables
 *
 * EPC: Free with registration, HTTP Basic Auth.
 * Ofcom: Free with registration, 50k req/month.
 * VOA: Local database, no external API call.
 */

import { protectedProcedure, router } from "@/trpc";
import {
  EPCQuerySchema,
  BroadbandQuerySchema,
  VOAComparablesQuerySchema,
  OwnershipQuerySchema,
  CompanyProfileQuerySchema,
} from "@grounded/types";
import { createApiCache } from "@/lib/cache";

// ── Caches ───────────────────────────────────────────────────────────────────

export interface EPCResult {
  rating: string;
  floorArea: number | null;
  meesCompliant: boolean;
  expiryDate: string | null;
  address: string;
}

export interface BroadbandResult {
  avgDownload: number;
  avgUpload: number;
  maxDownload: number | null;
  ultrafastAvailable: boolean;
}

export interface OwnershipResult {
  companyName: string | null;
  companyNumber: string | null;
  tenure: string | null;
  proprietorAddress: string | null;
}

export interface CompanyProfileResult {
  companyName: string;
  companyNumber: string;
  status: string;
  sicCodes: string[];
  incorporatedDate: string | null;
  registeredAddress: string | null;
}

export interface VOAComparable {
  address: string;
  rateableValue: number;
  description: string | null;
  distance: number;
}

const epcCache = createApiCache<EPCResult>({
  maxSize: 500,
  ttlMs: 86400000, // 24h
});

const broadbandCache = createApiCache<BroadbandResult>({
  maxSize: 500,
  ttlMs: 604800000, // 7 days
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract a UK postcode from an address string */
function extractPostcode(address: string): string | null {
  const match = address.match(
    /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i
  );
  return match?.[1] ? match[1].toUpperCase().replace(/\s+/g, " ") : null;
}

// ── Router ───────────────────────────────────────────────────────────────────

export const propertyRouter = router({
  /**
   * Get EPC (Energy Performance Certificate) data for a property.
   * Searches by postcode extracted from the address, then fuzzy-matches.
   */
  getEPC: protectedProcedure
    .input(EPCQuerySchema)
    .query(async ({ input }): Promise<EPCResult | null> => {
      const cacheKey = `epc:${input.address}`;
      const cached = epcCache.get(cacheKey);
      if (cached) return cached;

      const email = process.env["EPC_API_EMAIL"];
      const apiKey = process.env["EPC_API_KEY"];
      if (!email || !apiKey) {
        console.error("[property] EPC_API_EMAIL or EPC_API_KEY not configured");
        return null;
      }

      const postcode = extractPostcode(input.address);
      if (!postcode) return null;

      try {
        const encoded = encodeURIComponent(postcode);
        const url =
          `https://epc.opendatacommunities.org/api/v1/non-domestic/search` +
          `?postcode=${encoded}&size=5`;

        const authToken = Buffer.from(`${email}:${apiKey}`).toString("base64");

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${authToken}`,
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as {
          rows?: Array<{
            "current-energy-rating"?: string;
            "floor-area"?: string;
            "lodgement-datetime"?: string;
            address?: string;
          }>;
        };

        const row = data.rows?.[0];
        if (!row) return null;

        const rating = row["current-energy-rating"] ?? "Unknown";
        const floorArea = row["floor-area"] ? parseFloat(row["floor-area"]) : null;

        // MEES minimum is E (tightening to B by 2030). Currently E is the threshold.
        const meesRatings = ["A", "B", "C", "D", "E"];
        const meesCompliant = meesRatings.includes(rating);

        // EPC certificates are valid for 10 years
        const lodgementDate = row["lodgement-datetime"];
        let expiryDate: string | null = null;
        if (lodgementDate) {
          const lodged = new Date(lodgementDate);
          lodged.setFullYear(lodged.getFullYear() + 10);
          expiryDate = lodged.toISOString().split("T")[0]!;
        }

        const result: EPCResult = {
          rating,
          floorArea,
          meesCompliant,
          expiryDate,
          address: row.address ?? input.address,
        };

        epcCache.set(cacheKey, result);
        return result;
      } catch (err) {
        console.error("[property] EPC API request failed:", err);
        return null;
      }
    }),

  /**
   * Get broadband speed/availability data from Ofcom.
   * Searches by postcode extracted from the address.
   */
  getBroadband: protectedProcedure
    .input(BroadbandQuerySchema)
    .query(async ({ input }): Promise<BroadbandResult | null> => {
      const cacheKey = `broadband:${input.address}`;
      const cached = broadbandCache.get(cacheKey);
      if (cached) return cached;

      const apiKey = process.env["OFCOM_API_KEY"];
      if (!apiKey) {
        console.error("[property] OFCOM_API_KEY not configured");
        return null;
      }

      const postcode = extractPostcode(input.address);
      if (!postcode) return null;

      try {
        const encoded = encodeURIComponent(postcode.replace(/\s+/g, ""));
        const url = `https://api-proxy.ofcom.org.uk/broadband/basic?postcode=${encoded}`;

        const response = await fetch(url, {
          headers: { "Ocp-Apim-Subscription-Key": apiKey },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as {
          AvailabilityDetailed?: Array<{
            AverageDownloadSpeed?: number;
            AverageUploadSpeed?: number;
            MaximumDownloadSpeed?: number;
            UltrafastAvailable?: boolean;
          }>;
        };

        const entry = data.AvailabilityDetailed?.[0];
        if (!entry) return null;

        const result: BroadbandResult = {
          avgDownload: Math.round(entry.AverageDownloadSpeed ?? 0),
          avgUpload: Math.round(entry.AverageUploadSpeed ?? 0),
          maxDownload: entry.MaximumDownloadSpeed
            ? Math.round(entry.MaximumDownloadSpeed)
            : null,
          ultrafastAvailable: entry.UltrafastAvailable ?? false,
        };

        broadbandCache.set(cacheKey, result);
        return result;
      } catch (err) {
        console.error("[property] Ofcom API request failed:", err);
        return null;
      }
    }),

  /**
   * Get corporate ownership data from CCOD/OCOD (HM Land Registry).
   * Searches by postcode — requires bulk CCOD data to be ingested.
   * In the absence of a local database, this returns null gracefully.
   */
  getOwnership: protectedProcedure
    .input(OwnershipQuerySchema)
    .query(async ({ input }): Promise<OwnershipResult | null> => {
      // CCOD/OCOD is a bulk dataset that requires periodic ingest.
      // When available, search the local database by postcode.
      // For now, this is a placeholder that returns null.
      void input;
      return null;
    }),

  /**
   * Get company profile from Companies House API.
   * Free, rate limited to 600 requests per 5 minutes.
   */
  getCompanyProfile: protectedProcedure
    .input(CompanyProfileQuerySchema)
    .query(async ({ input }): Promise<CompanyProfileResult | null> => {
      const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
      if (!apiKey) return null;

      try {
        const url = `https://api.company-information.service.gov.uk/company/${input.companyNumber}`;
        const authToken = Buffer.from(`${apiKey}:`).toString("base64");

        const response = await fetch(url, {
          headers: { Authorization: `Basic ${authToken}` },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as {
          company_name?: string;
          company_number?: string;
          company_status?: string;
          sic_codes?: string[];
          date_of_creation?: string;
          registered_office_address?: {
            address_line_1?: string;
            locality?: string;
            postal_code?: string;
          };
        };

        const addr = data.registered_office_address;
        return {
          companyName: data.company_name ?? "",
          companyNumber: data.company_number ?? input.companyNumber,
          status: data.company_status ?? "Unknown",
          sicCodes: data.sic_codes ?? [],
          incorporatedDate: data.date_of_creation ?? null,
          registeredAddress: addr
            ? [addr.address_line_1, addr.locality, addr.postal_code]
                .filter(Boolean)
                .join(", ")
            : null,
        };
      } catch {
        return null;
      }
    }),

  /**
   * Get VOA rating list comparables near a location.
   * Queries the local VOAProperty database table.
   */
  getVOAComparables: protectedProcedure
    .input(VOAComparablesQuerySchema)
    .query(async ({ ctx, input }): Promise<VOAComparable[]> => {
      try {
        // Use raw SQL for distance-based spatial query
        const radiusDeg = input.radius / 111000; // rough m to degrees
        const results = await ctx.db.vOAProperty.findMany({
          where: {
            latitude: {
              gte: input.latitude - radiusDeg,
              lte: input.latitude + radiusDeg,
            },
            longitude: {
              gte: input.longitude - radiusDeg,
              lte: input.longitude + radiusDeg,
            },
            rateableValue: { not: null },
          },
          take: 10,
          orderBy: { rateableValue: "desc" },
        });

        return results.map((r) => ({
          address: r.address,
          rateableValue: r.rateableValue ?? 0,
          description: r.description,
          distance: 0, // approximate — Prisma doesn't support ST_Distance natively
        }));
      } catch {
        return [];
      }
    }),
});
