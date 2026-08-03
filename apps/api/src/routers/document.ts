/**
 * Document Analysis Router
 *
 * Provides AI-powered PDF analysis for property investment documents.
 * Accepts a base64-encoded PDF, extracts the subject property address
 * using the Anthropic Claude API, and geocodes it via Mapbox.
 *
 * WHY server-side?
 *  - ANTHROPIC_API_KEY must never reach the browser.
 *  - MAPBOX_SECRET_TOKEN (higher rate limits) stays server-side.
 *  - Centralises error handling and future caching/rate-limiting.
 *
 * Flow:
 *  1. analyzeDocument  — PDF → Claude → structured address JSON
 *  2. geocodeAddress   — address string → Mapbox → { lat, lng }
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";
import { protectedProcedure, router } from "@/trpc";

// ── Anthropic client (lazy singleton) ────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "ANTHROPIC_API_KEY is not configured on the server.",
    });
  }
  return new Anthropic({ apiKey });
}

// ── Type for Claude's address extraction response ─────────────────────────────

export interface ExtractedAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  full_address: string;
}

export interface ExtractedCompetitor {
  name: string;
  address: string | null;
}

interface ExtractionError {
  error: string;
}

interface FullExtractionResult {
  subject: ExtractedAddress;
  competitors: ExtractedCompetitor[];
}

// ── Router ────────────────────────────────────────────────────────────────────

export const documentRouter = router({
  /**
   * Sends a base64-encoded PDF to Claude and extracts the primary subject
   * property address. Returns structured address fields or throws if no
   * address can be found.
   *
   * Model: claude-haiku-4-5 — address extraction is a simple task and
   * Haiku is ~10x cheaper than Sonnet with no quality difference here.
   *
   * PDF limits: Claude supports up to 32MB / ~100 pages. The frontend
   * validates size before calling this endpoint.
   */
  analyzeDocument: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string().min(1),
        fileName: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ input }) => {
      const anthropic = getAnthropicClient();

      let response;
      try {
        response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: input.fileBase64,
                  },
                },
                {
                  type: "text",
                  text: `You are a real estate document analyst. Extract the subject property address and any competitor properties from this offering memorandum or property investment document.

Return ONLY a valid JSON object with these exact fields:
{
  "subject": {
    "address": "street address",
    "city": "city name",
    "state": "state or county",
    "zip": "postcode or zip code",
    "full_address": "full formatted address on one line"
  },
  "competitors": [
    { "name": "Property name", "address": "full address on one line or null if not stated in document" }
  ]
}

Rules:
- "subject" is the primary property being offered/sold. If not found, return { "error": "Address not found" } at the top level instead.
- "competitors" is a list of competing properties explicitly mentioned in the document (comparable sales, competing hotels, nearby retail etc.). Set "address" to null if the document does not include the competitor's address.
- Return an empty array [] for "competitors" if none are mentioned.
- Do not include any text outside the JSON object.`,
                },
              ],
            },
          ],
        });
      } catch (err) {
        console.error("[document] Claude API request failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to analyse document. Please try again.",
        });
      }

      // Extract text content from Claude's response.
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected response format from Claude.",
        });
      }

      // Strip potential markdown code fences Claude may wrap the JSON in.
      const raw = textBlock.text
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

      let parsed: FullExtractionResult | ExtractionError;
      try {
        parsed = JSON.parse(raw) as FullExtractionResult | ExtractionError;
      } catch {
        console.error("[document] Failed to parse Claude response as JSON:", raw);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not parse address from document. Try a different file.",
        });
      }

      // Claude indicated it could not find an address.
      if ("error" in parsed) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message:
            "No property address found in this document. Please check the file and try again.",
        });
      }

      return {
        ...parsed.subject,
        competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      };
    }),

  /**
   * Geocodes a free-text address to coordinates using the Mapbox Geocoding API.
   * Falls back to the public Mapbox token if the secret token is not set —
   * the geocoding endpoint works with both.
   *
   * Returns { lat, lng, place_name } where place_name is Mapbox's normalised
   * formatted address (useful to display back to the user).
   */
  geocodeAddress: protectedProcedure
    .input(z.object({ full_address: z.string().min(1).max(500) }))
    .mutation(async ({ input }) => {
      const token =
        process.env["MAPBOX_SECRET_TOKEN"] ||
        process.env["VITE_MAPBOX_PUBLIC_TOKEN"];

      if (!token) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Mapbox token is not configured on the server.",
        });
      }

      const encoded = encodeURIComponent(input.full_address);
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
        `?access_token=${token}&limit=1`;

      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      } catch (err) {
        console.error("[document] Mapbox geocoding request failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Geocoding request timed out. Please try again.",
        });
      }

      if (!response.ok) {
        console.error(`[document] Mapbox geocoding returned HTTP ${response.status}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Geocoding failed (HTTP ${response.status}). Please try again.`,
        });
      }

      const data = (await response.json()) as {
        features: Array<{
          center: [number, number]; // [lng, lat]
          place_name: string;
        }>;
      };

      const feature = data.features[0];
      if (!feature) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message:
            "Could not find this address on the map. You can plot it manually instead.",
        });
      }

      return {
        lng: feature.center[0],
        lat: feature.center[1],
        place_name: feature.place_name,
      };
    }),
});
