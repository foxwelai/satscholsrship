import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { students, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { getAcademicYears } from "@/lib/settings";

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

  if ((body.category === "Engineering" || body.category === "Degree") && !body.course_name?.trim()) {
    return NextResponse.json({ error: "Course name is required for Engineering/Degree" }, { status: 400 });
  }

  // Year rules: applications may only target the current academic year, or —
  // once the super admin opens it in Settings — the renewal year, and then
  // only for students whose current-year application is already Approved.
  const { current, renewal } = await getAcademicYears();
  if (financialYear !== current && financialYear !== renewal) {
    return NextResponse.json(
      {
        error: renewal
          ? `Applications can only be created for ${current} or the open renewal year ${renewal}`
          : `Applications can only be created for the current academic year ${current} — renewals for the next year are not open yet`,
      },
      { status: 400 }
    );
  }
  if (renewal && financialYear === renewal && renewal !== current) {
    const [curApp] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(and(eq(applications.studentId, studentId), eq(applications.financialYear, current)));
    if (!curApp || !["Approved", "Closed"].includes(curApp.status)) {
      return NextResponse.json(
        {
          error: `This student's ${current} application must be Approved before renewing for ${renewal}`,
        },
        { status: 400 }
      );
    }
  }

  // Only the super admin can fast-track (approve & close). Everyone else's
  // submissions always enter the queue as Pending Approval.
  const approveAndClose = body.action === "approve_close" && session.role === "super_admin";
  if (body.action === "approve_close" && session.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only the super admin can approve applications — submit it for approval instead" },
      { status: 403 }
    );
  }
  const now = new Date();

  try {
    const [row] = await db
      .insert(applications)
      .values({
        studentId,
        financialYear,
        category: body.category ?? "",
        currentClass: body.current_class ?? "",
        courseName: body.course_name ?? "",
        pincode: body.pincode ?? "",
        location: body.location ?? "",
        prevYearMarks: body.prev_year_marks ?? "",
        annualFee: body.annual_fee ?? "",
        status: approveAndClose ? "Approved" : "Pending Approval",
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
