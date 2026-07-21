import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, generateStudentId } from "@/lib/db";
import { students, petes, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { currentFinancialYear, financialYearStart } from "@/lib/constants";

const PROFILE_FIELDS = [
  "name", "mobile", "dob", "aadhar",
  "school_name", "school_address", "school_phone",
  "father_name", "address", "mother_name", "mother_occupation", "family_income", "contact_phone",
  "bank_account", "bank_name", "bank_branch", "ifsc",
  "photo_path", "passbook_path",
] as const;

const fieldMap: Record<string, keyof typeof students.$inferInsert> = {
  name: "name", mobile: "mobile", dob: "dob", aadhar: "aadhar",
  school_name: "schoolName", school_address: "schoolAddress", school_phone: "schoolPhone",
  father_name: "fatherName", address: "address", mother_name: "motherName",
  mother_occupation: "motherOccupation", family_income: "familyIncome", contact_phone: "contactPhone",
  bank_account: "bankAccount", bank_name: "bankName", bank_branch: "bankBranch", ifsc: "ifsc",
  photo_path: "photoPath", passbook_path: "passbookPath",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const peteIdParam = req.nextUrl.searchParams.get("pete_id");

  const conditions = [];
  if (session.role === "pete_admin") {
    conditions.push(eq(students.peteId, session.peteId!));
  } else if (peteIdParam) {
    conditions.push(eq(students.peteId, Number(peteIdParam)));
  }
  if (q) {
    conditions.push(
      or(
        sql`${students.aadhar} ILIKE ${"%" + q + "%"}`,
        sql`${students.studentId} ILIKE ${"%" + q + "%"}`,
        sql`${students.name} ILIKE ${"%" + q + "%"}`
      )
    );
  }

  const rows = await db
    .select({
      id: students.id,
      student_id: students.studentId,
      name: students.name,
      aadhar: students.aadhar,
      mobile: students.mobile,
      pete_name: petes.name,
      pete_id: students.peteId,
      reg_year: students.regYear,
    })
    .from(students)
    .innerJoin(petes, eq(petes.id, students.peteId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(students.createdAt))
    .limit(200);

  const ids = rows.map((r) => r.id);
  const apps = ids.length
    ? await db.select().from(applications).where(inArray(applications.studentId, ids))
    : [];
  const latestByStudent = new Map<number, (typeof apps)[number]>();
  for (const a of apps) {
    const existing = latestByStudent.get(a.studentId);
    if (!existing || a.financialYear > existing.financialYear) latestByStudent.set(a.studentId, a);
  }

  const result = rows.map((r) => {
    const latest = latestByStudent.get(r.id);
    return {
      ...r,
      current_class: latest?.currentClass ?? "",
      category: latest?.category ?? "",
      status: latest?.status ?? "—",
      closed: latest?.closed ?? false,
      financial_year: latest?.financialYear ?? "",
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Student name is required" }, { status: 400 });
  }
  const aadhar = (body.aadhar ?? "").replace(/\D/g, "");
  if (!/^\d{12}$/.test(aadhar)) {
    return NextResponse.json({ error: "A valid 12-digit Aadhar number is required" }, { status: 400 });
  }
  const peteId = session.role === "pete_admin" ? session.peteId! : Number(body.pete_id);
  if (!peteId) {
    return NextResponse.json({ error: "Pete is required" }, { status: 400 });
  }

  const [dup] = await db.select({ studentId: students.studentId }).from(students).where(eq(students.aadhar, aadhar));
  if (dup) {
    return NextResponse.json(
      {
        error: `A student with this Aadhar already exists (ID: ${dup.studentId}). Use Search to find them and add a new year's application instead.`,
      },
      { status: 400 }
    );
  }

  const financialYear = body.financial_year || currentFinancialYear();
  const regYear = financialYearStart(financialYear);

  try {
    const result = await db.transaction(async (tx) => {
      const studentId = await generateStudentId(peteId, regYear);
      const insertValues: typeof students.$inferInsert = {
        studentId,
        peteId,
        regYear,
        name: body.name.trim(),
        aadhar,
      };
      for (const f of PROFILE_FIELDS) {
        if (f === "name" || f === "aadhar") continue;
        const col = fieldMap[f];
        insertValues[col] = (body[f] ?? "") as never;
      }
      const [student] = await tx.insert(students).values(insertValues).returning({ id: students.id });

      await tx.insert(applications).values({
        studentId: student.id,
        financialYear,
        category: body.category ?? "",
        currentClass: body.current_class ?? "",
        prevYearMarks: body.prev_year_marks ?? "",
        annualFee: body.annual_fee ?? "",
        status: "Applied",
        createdBy: session.userId,
      });

      return { id: student.id, student_id: studentId };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to register student" }, { status: 500 });
  }
}
