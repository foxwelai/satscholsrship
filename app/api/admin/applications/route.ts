import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications, students, petes, scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can access" }, { status: 403 });
  }

  try {
    const pendingApps = await db
      .select({
        id: applications.id,
        db_student_id: students.id,
        student_id: students.studentId,
        name: students.name,
        pete_name: petes.name,
        photo_path: students.photoPath,
        category: applications.category,
        current_class: applications.currentClass,
        course_name: applications.courseName,
        pincode: applications.pincode,
        location: applications.location,
        prev_year_marks: applications.prevYearMarks,
        annual_fee: applications.annualFee,
        scholarship_amount: sql<number>`COALESCE(${scholarshipRates.amount}, 0)::int`,
        financial_year: applications.financialYear,
        created_at: applications.createdAt,
      })
      .from(applications)
      .innerJoin(students, eq(students.id, applications.studentId))
      .innerJoin(petes, eq(petes.id, students.peteId))
      .leftJoin(
        scholarshipRates,
        and(
          eq(scholarshipRates.financialYear, applications.financialYear),
          eq(scholarshipRates.category, applications.category)
        )
      )
      .where(eq(applications.status, "Pending Approval"))
      .orderBy(applications.createdAt);

    return NextResponse.json({ applications: pendingApps });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
