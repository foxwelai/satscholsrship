/**
 * One-time script: create the pincodes table and import CSV data into it.
 * Run: node scripts/import-pincodes.mjs
 *
 * Expects DATABASE_URL in .env.local  (relative to project root).
 * The CSV columns used: officename(3), pincode(4), officetype(5), district(7), statename(8)
 * Priority for lookup: HO > PO > BO  (stored in officetype column)
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import postgres from "postgres";

// ── Load DATABASE_URL from .env.local ─────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
if (!match) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const DATABASE_URL = match[1].trim();

const sql = postgres(DATABASE_URL, { ssl: "require", max: 5 });

// ── Create table ──────────────────────────────────────────────────────────────
async function createTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS pincodes (
      id        SERIAL PRIMARY KEY,
      pincode   VARCHAR(6)  NOT NULL,
      officename TEXT        NOT NULL,
      officetype VARCHAR(5)  NOT NULL DEFAULT 'BO',
      district  TEXT        NOT NULL,
      statename TEXT        NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pincodes_pincode ON pincodes(pincode)
  `;
  console.log("Table + index ready.");
}

// ── Parse a CSV line handling quoted fields ───────────────────────────────────
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

// ── Import CSV ────────────────────────────────────────────────────────────────
const CSV_PATH = "/Users/foxwel.ai/Downloads/5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv";
const BATCH = 2000;

async function importCsv() {
  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  let batch = [];
  let total = 0;

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) continue; // skip header

    const f = parseCsvLine(line);
    // columns: circlename(0),regionname(1),divisionname(2),officename(3),
    //          pincode(4),officetype(5),delivery(6),district(7),statename(8)
    const officename = f[3] ?? "";
    const pincode    = f[4] ?? "";
    const officetype = f[5] ?? "BO";
    const district   = f[7] ?? "";
    const statename  = f[8] ?? "";

    if (!pincode || !/^\d{6}$/.test(pincode)) continue;
    if (!district || !statename) continue;

    batch.push({ pincode, officename, officetype, district, statename });

    if (batch.length >= BATCH) {
      await sql`
        INSERT INTO pincodes ${sql(batch, "pincode", "officename", "officetype", "district", "statename")}
        ON CONFLICT DO NOTHING
      `;
      total += batch.length;
      process.stdout.write(`\r  Inserted ${total.toLocaleString()} rows…`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await sql`
      INSERT INTO pincodes ${sql(batch, "pincode", "officename", "officetype", "district", "statename")}
      ON CONFLICT DO NOTHING
    `;
    total += batch.length;
  }

  console.log(`\nDone. Total rows inserted: ${total.toLocaleString()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
try {
  await createTable();
  await importCsv();
} finally {
  await sql.end();
}
