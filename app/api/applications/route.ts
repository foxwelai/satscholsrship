import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { students, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const studentId = Number(body.student_id);
  const financialYear = body.financial_year?.trim();
  if (!studentId || !financialYear) {
    return NextResponse.json({ error: "Student and financial year are required" }, { status: 400 });
  }

  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (session.role === "pete_admin" && student.peteId !== session.peteId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const approveAndClose = body.action === "approve_close";
  const now = new Date();

  try {
    const [row] = await db
      .insert(applications)
      .values({
        studentId,
        financialYear,
        category: body.category ?? "",
        currentClass: body.current_class ?? "",
        prevYearMarks: body.prev_year_marks ?? "",
        annualFee: body.annual_fee ?? "",
        status: approveAndClose ? "Approved" : "Applied",
        closed: approveAndClose,
        approvedAt: approveAndClose ? now : null,
        closedAt: approveAndClose ? now : null,
        createdBy: session.userId,
      })
      .returning({ id: applications.id });
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    const msg = isUniqueViolation(e)
      ? `An application for ${financialYear} already exists for this student`
      : "Failed to create application";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
