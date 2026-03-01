/**
 * Load Postcodes — ONS Postcode Directory Bulk Ingest
 *
 * Downloads and imports the ONS Postcode Directory CSV into the Postcode table.
 * This provides ~2.7M UK postcodes with lat/lng + geographic codes (LSOA, MSOA, ward).
 *
 * Usage:
 *   pnpm tsx packages/db/scripts/load-postcodes.ts <path-to-csv>
 *
 * The CSV should be the ONSPD "open" version downloaded from:
 *   https://geoportal.statistics.gov.uk/
 *
 * Expected CSV columns (semicolon or comma separated):
 *   pcd (postcode), lat (latitude), long (longitude), lsoa11 (LSOA code),
 *   msoa11 (MSOA code), osward (ward code), oslaua (local authority code)
 *
 * Run quarterly to pick up new postcodes.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PrismaClient } from "../src/generated/client";

const BATCH_SIZE = 5000;

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: pnpm tsx packages/db/scripts/load-postcodes.ts <path-to-csv>");
    process.exit(1);
  }

  const db = new PrismaClient();
  console.log("Connecting to database...");

  const rl = createInterface({
    input: createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let batch: Array<{
    postcode: string;
    latitude: number;
    longitude: number;
    lsoa: string | null;
    msoa: string | null;
    ward: string | null;
    localAuthority: string | null;
  }> = [];
  let totalInserted = 0;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;

    if (lineNum === 1) {
      // Detect separator (comma or semicolon)
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

    const pcd = row["pcd"] ?? row["pcds"] ?? row["postcode"] ?? "";
    const lat = parseFloat(row["lat"] ?? row["latitude"] ?? "");
    const lng = parseFloat(row["long"] ?? row["longitude"] ?? "");

    if (!pcd || isNaN(lat) || isNaN(lng)) continue;

    // Normalise: remove spaces, uppercase
    const normalised = pcd.replace(/\s+/g, "").toUpperCase();

    batch.push({
      postcode: normalised,
      latitude: lat,
      longitude: lng,
      lsoa: row["lsoa11"] || row["lsoa21"] || null,
      msoa: row["msoa11"] || row["msoa21"] || null,
      ward: row["osward"] || row["ward"] || null,
      localAuthority: row["oslaua"] || row["la"] || null,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.postcode.createMany({ data: batch, skipDuplicates: true });
      totalInserted += batch.length;
      batch = [];
      if (totalInserted % 50000 === 0) {
        console.log(`  ${totalInserted.toLocaleString()} postcodes loaded...`);
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await db.postcode.createMany({ data: batch, skipDuplicates: true });
    totalInserted += batch.length;
  }

  console.log(`Done. ${totalInserted.toLocaleString()} postcodes loaded.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error("Failed to load postcodes:", err);
  process.exit(1);
});
