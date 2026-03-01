/**
 * Load PTAL Grid — TfL Public Transport Accessibility Level Bulk Ingest
 *
 * Imports the London PTAL grid CSV into a raw PostGIS table (ptal_grid).
 * This is a raw SQL table, not a Prisma model, because it needs spatial
 * indexing for nearest-point queries (millions of 100m grid cells).
 *
 * Usage:
 *   pnpm tsx packages/db/scripts/load-ptal.ts <path-to-csv>
 *
 * The CSV should be downloaded from London Datastore:
 *   https://data.london.gov.uk/dataset/public-transport-accessibility-levels
 *
 * Expected columns: X (easting), Y (northing), PTAL2015 (score string like "6b")
 * Or: Easting, Northing, AI2015, PTAL2015
 *
 * Prerequisites:
 *   - PostGIS extension must be enabled on the database
 *   - Run the migration first to create the ptal_grid table
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PrismaClient } from "../src/generated/client";

const BATCH_SIZE = 5000;

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: pnpm tsx packages/db/scripts/load-ptal.ts <path-to-csv>");
    process.exit(1);
  }

  const db = new PrismaClient();
  console.log("Connecting to database...");

  // Ensure the ptal_grid table exists
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ptal_grid (
      id SERIAL PRIMARY KEY,
      easting DOUBLE PRECISION NOT NULL,
      northing DOUBLE PRECISION NOT NULL,
      ptal_score VARCHAR(3) NOT NULL,
      geom GEOMETRY(Point, 4326)
    )
  `);

  // Create spatial index if not exists
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ptal_grid_geom ON ptal_grid USING GIST (geom)
  `);

  const rl = createInterface({
    input: createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let totalInserted = 0;
  let lineNum = 0;
  let batch: string[] = [];

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

    const easting = parseFloat(row["x"] ?? row["easting"] ?? "");
    const northing = parseFloat(row["y"] ?? row["northing"] ?? "");
    const score = row["ptal2015"] ?? row["ptal"] ?? "";

    if (isNaN(easting) || isNaN(northing) || !score) continue;

    // Convert BNG (EPSG:27700) to WGS84 (EPSG:4326) using PostGIS
    batch.push(
      `(${easting}, ${northing}, '${score.replace(/'/g, "''")}', ` +
      `ST_Transform(ST_SetSRID(ST_MakePoint(${easting}, ${northing}), 27700), 4326))`
    );

    if (batch.length >= BATCH_SIZE) {
      await db.$executeRawUnsafe(
        `INSERT INTO ptal_grid (easting, northing, ptal_score, geom) VALUES ${batch.join(",")}`
      );
      totalInserted += batch.length;
      batch = [];
      if (totalInserted % 50000 === 0) {
        console.log(`  ${totalInserted.toLocaleString()} grid cells loaded...`);
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await db.$executeRawUnsafe(
      `INSERT INTO ptal_grid (easting, northing, ptal_score, geom) VALUES ${batch.join(",")}`
    );
    totalInserted += batch.length;
  }

  console.log(`Done. ${totalInserted.toLocaleString()} PTAL grid cells loaded.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error("Failed to load PTAL data:", err);
  process.exit(1);
});
