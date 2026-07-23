import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, petes, applications, scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "bank";
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const financialYear = req.nextUrl.searchParams.get("financial_year") ?? "";
  const bankGroup = req.nextUrl.searchParams.get("bank_group") ?? ""; // '' | 'ubi' | 'other'

  const conditions = [];
  if (session.role === "pete_admin") conditions.push(eq(students.peteId, session.peteId!));
  if (status) conditions.push(eq(applications.status, status));
  if (financialYear) conditions.push(eq(applications.financialYear, financialYear));
  if (bankGroup === "ubi") {
    conditions.push(sql`${students.bankName} ILIKE '%union bank%'`);
  } else if (bankGroup === "other") {
    conditions.push(sql`${students.bankName} NOT ILIKE '%union bank%'`);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const groupExpr =
    type === "class"
      ? sql<string>`COALESCE(NULLIF(${applications.currentClass}, ''), '(No class recorded)')`
      : type === "category"
      ? sql<string>`COALESCE(NULLIF(${applications.category}, ''), '(No category recorded)')`
      : type === "consolidated"
      ? petes.name
      : sql<string>`COALESCE(NULLIF(${students.bankName}, ''), '(No bank recorded)')`;

  // The scholarship amount is never stored on the application — it is always
  // taken live from the rates table for the application's year + category, so
  // the super admin can revise rates and reports update instantly.
  const amountExpr = sql<number>`COALESCE(${scholarshipRates.amount}, 0)`;
  const ratesJoin = and(
    eq(scholarshipRates.financialYear, applications.financialYear),
    eq(scholarshipRates.category, applications.category)
  )!;

  const summary = await db
    .select({
      grp: groupExpr,
      total: sql<number>`count(*)::int`,
      approved: sql<number>`sum(case when ${applications.status} = 'Approved' then 1 else 0 end)::int`,
      applied: sql<number>`sum(case when ${applications.status} = 'Applied' then 1 else 0 end)::int`,
      rejected: sql<number>`sum(case when ${applications.status} = 'Rejected' then 1 else 0 end)::int`,
      closed: sql<number>`sum(case when ${applications.closed} then 1 else 0 end)::int`,
      total_amount: sql<number>`sum(${amountExpr})::int`,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .innerJoin(petes, eq(petes.id, students.peteId))
    .leftJoin(scholarshipRates, ratesJoin)
    .where(where)
    .groupBy(groupExpr)
    .orderBy(sql`count(*) desc`, groupExpr);

  const studentRows = await db
    .select({
      id: students.id,
      application_id: applications.id,
      student_id: students.studentId,
      name: students.name,
      current_class: applications.currentClass,
      category: applications.category,
      bank_name: students.bankName,
      bank_branch: students.bankBranch,
      ifsc: students.ifsc,
      status: applications.status,
      closed: applications.closed,
      scholarship_amount: sql<number>`${amountExpr}::int`,
      financial_year: applications.financialYear,
      pete_name: petes.name,
      grp: groupExpr,
    })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .innerJoin(petes, eq(petes.id, students.peteId))
    .leftJoin(scholarshipRates, ratesJoin)
    .where(where)
    .orderBy(groupExpr, students.name);

  const years = await db
    .selectDistinct({ financial_year: applications.financialYear })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .where(session.role === "pete_admin" ? eq(students.peteId, session.peteId!) : undefined)
    .orderBy(sql`${applications.financialYear} desc`);

  return NextResponse.json({
    summary,
    students: studentRows,
    years: years.map((y) => y.financial_year),
  });
}
