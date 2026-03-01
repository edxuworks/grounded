/**
 * Shared Geocoder Module
 *
 * Provides a unified geocoding interface that tries:
 *  1. Local postcode table lookup (instant, no API call)
 *  2. Mapbox Geocoding API fallback (for addresses without postcodes)
 *
 * Used by multiple routers that need to convert postcodes/addresses to coordinates.
 */

import type { PrismaClient } from "@grounded/db";

interface GeocodingResult {
  latitude: number;
  longitude: number;
  source: "postcode-table" | "mapbox";
}

/**
 * Normalise a UK postcode by removing spaces and uppercasing.
 * "EC2A 1NT" → "EC2A1NT"
 */
export function normalisePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

/**
 * Look up coordinates for a UK postcode from the local postcode table.
 * Returns null if the postcode is not found.
 */
export async function geocodePostcode(
  db: PrismaClient,
  postcode: string
): Promise<GeocodingResult | null> {
  const normalised = normalisePostcode(postcode);

  const record = await db.postcode.findUnique({
    where: { postcode: normalised },
    select: { latitude: true, longitude: true },
  });

  if (!record) return null;

  return {
    latitude: record.latitude,
    longitude: record.longitude,
    source: "postcode-table",
  };
}

/**
 * Geocode a free-text address using the Mapbox Geocoding API.
 * Returns null if no result found or API is unavailable.
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  const token =
    process.env["MAPBOX_SECRET_TOKEN"] ||
    process.env["VITE_MAPBOX_PUBLIC_TOKEN"];

  if (!token) return null;

  const encoded = encodeURIComponent(address);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
    `?access_token=${token}&limit=1&country=gb`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      features: Array<{ center: [number, number] }>;
    };

    const feature = data.features[0];
    if (!feature) return null;

    return {
      longitude: feature.center[0],
      latitude: feature.center[1],
      source: "mapbox",
    };
  } catch {
    return null;
  }
}

/**
 * Try to geocode a postcode first via the local table, then fall back to Mapbox.
 */
export async function geocodeWithFallback(
  db: PrismaClient,
  postcode: string
): Promise<GeocodingResult | null> {
  const fromTable = await geocodePostcode(db, postcode);
  if (fromTable) return fromTable;

  return geocodeAddress(postcode);
}
