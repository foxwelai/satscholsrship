import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pincodes } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

// Strip trailing office-type suffixes so "Manjeshwar SO" → "Manjeshwar"
function cleanOfficeName(name: string): string {
  return name.replace(/\s+(S\.?O\.?|H\.?O\.?|B\.?O\.?|P\.?O\.?|SO|HO|BO|PO)$/i, "").trim();
}

// Title-case a string (e.g. "KASARAGOD" → "Kasaragod")
function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin")?.trim();

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  try {
    // Query from local DB — prefer HO > PO > BO so we get the main post town.
    const rows = await db
      .select()
      .from(pincodes)
      .where(eq(pincodes.pincode, pin))
      .orderBy(
        sql`CASE ${pincodes.officetype} WHEN 'HO' THEN 1 WHEN 'PO' THEN 2 ELSE 3 END`
      )
      .limit(1);

    if (rows.length > 0) {
      const row = rows[0];
      const place = cleanOfficeName(row.officename);
      const district = toTitleCase(row.district);
      const state = toTitleCase(row.statename);
      const parts = [place, district, state].filter(Boolean);
      const location = parts.join(", ");
      return NextResponse.json({ location, pincode: pin, district, state, place });
    }

    return NextResponse.json({ error: "Pincode not found" }, { status: 404 });
  } catch (error) {
    console.error("Pincode lookup error:", error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}
