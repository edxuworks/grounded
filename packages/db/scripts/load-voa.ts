/**
 * Load VOA Rating Lists — Valuation Office Agency Bulk Ingest
 *
 * Downloads and imports VOA rating list CSV data into the VOAProperty table.
 * This provides ~2.1M commercial properties with rateable values and floor areas.
 *
 * Usage:
 *   pnpm tsx packages/db/scripts/load-voa.ts <path-to-csv>
 *
 * The CSV can be obtained from VOA open data:
 *   https://voaratinglists.blob.core.windows.net/
 *
 * After loading, postcodes are geocoded via the Postcode table (run load-postcodes first).
 *
 * Run quarterly to pick up revaluations.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PrismaClient } from "../src/generated/client";

const BATCH_SIZE = 2000;

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: pnpm tsx packages/db/scripts/load-voa.ts <path-to-csv>");
    process.exit(1);
  }

  const db = new PrismaClient();
  console.log("Connecting to database...");

  // Build postcode lookup map for geocoding
  console.log("Loading postcode lookup table into memory...");
  const postcodes = await db.postcode.findMany({
    select: { postcode: true, latitude: true, longitude: true },
  });
  const postcodeMap = new Map(
    postcodes.map((p) => [p.postcode, { lat: p.latitude, lng: p.longitude }])
  );
  console.log(`  ${postcodeMap.size.toLocaleString()} postcodes in memory.`);

  const rl = createInterface({
    input: createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let batch: Array<{
    assessmentRef: string;
    address: string;
    postcode: string;
    description: string | null;
    rateableValue: number | null;
    floorArea: number | null;
    latitude: number | null;
    longitude: number | null;
  }> = [];
  let totalInserted = 0;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      const sep = line.includes(";") ? ";" : ",";
      headers = line.split(sep).map((h) => h.trim().replace(/"/g, "").toLowerCase());
      continue;
    }

    const sep = line.includes(";") ? ";" : ",";
    const values = line.split(sep).map((v) => v.trim().replace(/"/g, ""));

    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]!] = values[i] ?? "";
    }

    const ref = row["ba_reference_number"] ?? row["assessment_ref"] ?? row["ref"] ?? "";
    if (!ref) continue;

    const postcode = (row["postcode"] ?? row["pcd"] ?? "").replace(/\s+/g, "").toUpperCase();
    const coords = postcodeMap.get(postcode);

    const rv = parseInt(row["rateable_value"] ?? row["rv"] ?? "", 10);
    const area = parseFloat(row["total_area"] ?? row["floor_area"] ?? "");

    batch.push({
      assessmentRef: ref,
      address: row["full_property_identifier"] ?? row["address"] ?? "",
      postcode,
      description: row["primary_description"] ?? row["description"] ?? null,
      rateableValue: isNaN(rv) ? null : rv,
      floorArea: isNaN(area) ? null : area,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });

    if (batch.length >= BATCH_SIZE) {
      // Upsert to handle quarterly refreshes
      for (const item of batch) {
        await db.vOAProperty.upsert({
          where: { assessmentRef: item.assessmentRef },
          create: item,
          update: item,
        });
      }
      totalInserted += batch.length;
      batch = [];
      if (totalInserted % 10000 === 0) {
        console.log(`  ${totalInserted.toLocaleString()} properties loaded...`);
      }
    }
  }

  // Flush remaining
  for (const item of batch) {
    await db.vOAProperty.upsert({
      where: { assessmentRef: item.assessmentRef },
      create: item,
      update: item,
    });
  }
  totalInserted += batch.length;

  console.log(`Done. ${totalInserted.toLocaleString()} VOA properties loaded.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error("Failed to load VOA data:", err);
  process.exit(1);
});
