import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, petes, applications, scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";

// Returns flat application rows (with bank details and the rate-derived
// scholarship amount) for the selected pete / financial year / status / bank
// group. Grouping (bank-wise, branch-wise) and totals are done client-side.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const peteIdParam = req.nextUrl.searchParams.get("pete_id");
  const financialYear = req.nextUrl.searchParams.get("financial_year") ?? "";
  const bankGroup = req.nextUrl.searchParams.get("bank_group") ?? ""; // '' | 'ubi' | 'other'

  const conditions = [];
  if (session.role === "pete_admin") {
    conditions.push(eq(students.peteId, session.peteId!));
  } else if (peteIdParam) {
    conditions.push(eq(students.peteId, Number(peteIdParam)));
  }
  // Reports only ever include sanctioned scholarships.
  conditions.push(eq(applications.status, "Approved"));
  if (financialYear) conditions.push(eq(applications.financialYear, financialYear));
  if (bankGroup === "ubi") {
    conditions.push(sql`${students.bankName} ILIKE '%union bank%'`);
  } else if (bankGroup === "other") {
    conditions.push(sql`${students.bankName} NOT ILIKE '%union bank%'`);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  // Scholarship amount is never stored on the application — always derived
  // from the rates table for the application's year + category.
  const ratesJoin = and(
    eq(scholarshipRates.financialYear, applications.financialYear),
    eq(scholarshipRates.category, applications.category)
  )!;

  const rows = await db
    .select({
      id: students.id,
      application_id: applications.id,
      student_id: students.studentId,
      name: students.name,
      pete_id: students.peteId,
      pete_name: petes.name,
      current_class: applications.currentClass,
      category: applications.category,
      course_name: applications.courseName,
      bank_name: students.bankName,
      bank_branch: students.bankBranch,
      bank_account: students.bankAccount,
      ifsc: students.ifsc,
      status: applications.status,
      closed: applications.closed,
      scholarship_amount: sql<number>`COALESCE(${scholarshipRates.amount}, 0)::int`,
      financial_year: applications.financialYear,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .innerJoin(petes, eq(petes.id, students.peteId))
    .leftJoin(scholarshipRates, ratesJoin)
    .where(where)
    .orderBy(petes.name, students.name);

  const years = await db
    .selectDistinct({ financial_year: applications.financialYear })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .where(session.role === "pete_admin" ? eq(students.peteId, session.peteId!) : undefined)
    .orderBy(sql`${applications.financialYear} desc`);

  return NextResponse.json({
    students: rows,
    years: years.map((y) => y.financial_year),
  });
}
