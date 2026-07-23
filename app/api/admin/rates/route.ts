import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }
  const rows = await db
    .select()
    .from(scholarshipRates)
    .orderBy(scholarshipRates.financialYear);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }
  const body = await req.json();
  const financialYear = body.financial_year?.trim();
  const category = body.category?.trim();
  const amount = Number(body.amount);

  if (!financialYear || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "A valid financial year and category are required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Amount must be a non-negative number" }, { status: 400 });
  }

  await db
    .insert(scholarshipRates)
    .values({ financialYear, category, amount })
    .onConflictDoUpdate({
      target: [scholarshipRates.financialYear, scholarshipRates.category],
      set: { amount, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}

// Remove every category rate for one financial year.
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }
  const financialYear = req.nextUrl.searchParams.get("financial_year")?.trim();
  if (!financialYear) {
    return NextResponse.json({ error: "financial_year is required" }, { status: 400 });
  }
  await db.delete(scholarshipRates).where(eq(scholarshipRates.financialYear, financialYear));
  return NextResponse.json({ ok: true });
}
