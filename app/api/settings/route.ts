import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
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

  if (!key || !value) {
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
