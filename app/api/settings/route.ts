import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  // No key → return the academic-year configuration in one shot.
  if (!key) {
    const rows = await db.select().from(settings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      current_academic_year: map.current_academic_year ?? "",
      renewal_year: map.renewal_year ?? "",
    });
  }

  const [setting] = await db.select().from(settings).where(eq(settings.key, key));

  if (!setting) {
    return NextResponse.json({ error: "Setting not found" }, { status: 404 });
  }

  return NextResponse.json(setting);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { key, value } = await req.json();

  // Empty string is a valid value (e.g. clearing renewal_year closes renewals).
  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  const existing = await db.select().from(settings).where(eq(settings.key, key));

  if (existing.length > 0) {
    await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }

  return NextResponse.json({ key, value });
}
