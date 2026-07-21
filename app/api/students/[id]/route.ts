import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, petes, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";

const EDITABLE_FIELDS: Record<string, keyof typeof students.$inferInsert> = {
  name: "name", mobile: "mobile", dob: "dob", aadhar: "aadhar",
  school_name: "schoolName", school_address: "schoolAddress", school_phone: "schoolPhone",
  father_name: "fatherName", address: "address", mother_name: "motherName",
  mother_occupation: "motherOccupation", family_income: "familyIncome", contact_phone: "contactPhone",
  bank_account: "bankAccount", bank_name: "bankName", bank_branch: "bankBranch", ifsc: "ifsc",
  photo_path: "photoPath", passbook_path: "passbookPath",
};

async function loadStudent(id: number) {
  const [row] = await db
    .select({
      id: students.id,
      student_id: students.studentId,
      pete_id: students.peteId,
      pete_name: petes.name,
      reg_year: students.regYear,
      name: students.name,
      mobile: students.mobile,
      dob: students.dob,
      aadhar: students.aadhar,
      school_name: students.schoolName,
      school_address: students.schoolAddress,
      school_phone: students.schoolPhone,
      father_name: students.fatherName,
      address: students.address,
      mother_name: students.motherName,
      mother_occupation: students.motherOccupation,
      family_income: students.familyIncome,
      contact_phone: students.contactPhone,
      bank_account: students.bankAccount,
      bank_name: students.bankName,
      bank_branch: students.bankBranch,
      ifsc: students.ifsc,
      photo_path: students.photoPath,
      passbook_path: students.passbookPath,
      created_at: students.createdAt,
    })
    .from(students)
    .innerJoin(petes, eq(petes.id, students.peteId))
    .where(eq(students.id, id));
  return row;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const student = await loadStudent(Number(id));
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "pete_admin" && student.pete_id !== session.peteId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apps = await db
    .select()
    .from(applications)
    .where(eq(applications.studentId, Number(id)))
    .orderBy(desc(applications.financialYear));

  return NextResponse.json({ ...student, applications: apps });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const studentId = Number(id);

  const existing = await loadStudent(studentId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "pete_admin" && existing.pete_id !== session.peteId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  if ("aadhar" in body) {
    const aadhar = (body.aadhar ?? "").replace(/\D/g, "");
    if (!/^\d{12}$/.test(aadhar)) {
      return NextResponse.json({ error: "A valid 12-digit Aadhar number is required" }, { status: 400 });
    }
    body.aadhar = aadhar;
    const [dup] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.aadhar, aadhar), ne(students.id, studentId)));
    if (dup) {
      return NextResponse.json({ error: "Another student already uses this Aadhar number" }, { status: 400 });
    }
  }

  const updates: Partial<typeof students.$inferInsert> = { updatedAt: new Date() };
  for (const [key, col] of Object.entries(EDITABLE_FIELDS)) {
    if (key in body) updates[col] = body[key] ?? "";
  }
  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(students).set(updates).where(eq(students.id, studentId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can delete student records" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(students).where(eq(students.id, Number(id)));
  return NextResponse.json({ ok: true });
}
