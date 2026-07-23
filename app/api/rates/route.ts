import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { CATEGORIES, currentFinancialYear } from "@/lib/constants";

// Read-only rate lookup for any authenticated user — used by the
// application forms to suggest a scholarship amount for the chosen
// category and financial year. Editing is restricted to super admin
// via /api/admin/rates.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const financialYear = req.nextUrl.searchParams.get("financial_year") || currentFinancialYear();
  const rows = await db
    .select()
    .from(scholarshipRates)
    .where(eq(scholarshipRates.financialYear, financialYear));

  const byCategory = new Map(rows.map((r) => [r.category, r.amount]));
  const rates = CATEGORIES.map((category) => ({
    category,
    amount: byCategory.get(category) ?? 0,
  }));

  const yearRows = await db
    .selectDistinct({ financialYear: scholarshipRates.financialYear })
    .from(scholarshipRates);
  const years = yearRows.map((y) => y.financialYear).sort((a, b) => (a < b ? 1 : -1));

  return NextResponse.json({ financial_year: financialYear, rates, years });
}
