import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications, students, petes, scholarshipRates } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { APPLICATION_STATUSES } from "@/lib/constants";

const DEFAULT_PER_PAGE = 25;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can access" }, { status: 403 });
  }

  const url = req.nextUrl.searchParams;
  const requested = url.get("status") ?? "Pending Approval";
  const status = (APPLICATION_STATUSES as readonly string[]).includes(requested)
    ? requested
    : "Pending Approval";

  // Paginated only when a page is asked for. Without it the full list comes
  // back, which is what the approval queue on the student and application
  // pages relies on to walk from one application to the next.
  const page = Math.max(1, Number(url.get("page")) || 0);
  const paginated = url.has("page");
  const perPage = Math.min(200, Math.max(1, Number(url.get("per_page")) || DEFAULT_PER_PAGE));

  try {
    // Oldest first while pending, so the queue is worked in the order applied;
    // most recently decided first once it has been approved or rejected.
    const orderBy =
      status === "Pending Approval"
        ? asc(applications.createdAt)
        : status === "Approved"
          ? desc(sql`COALESCE(${applications.approvedAt}, ${applications.updatedAt})`)
          : desc(applications.updatedAt);

    const query = db
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
        status: applications.status,
        closed: applications.closed,
        rejection_reason: applications.rejectionReason,
        approved_at: applications.approvedAt,
        updated_at: applications.updatedAt,
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
      .where(eq(applications.status, status))
      .orderBy(orderBy);

    const rows = paginated
      ? await query.limit(perPage).offset((page - 1) * perPage)
      : await query;

    // One grouped pass gives both the tab counts and the total for the status
    // being listed, so no extra COUNT round-trip is needed for pagination.
    const tallies = await db
      .select({ status: applications.status, n: sql<number>`count(*)::int` })
      .from(applications)
      .groupBy(applications.status);
    const counts = Object.fromEntries(tallies.map((t) => [t.status, t.n])) as Record<string, number>;

    return NextResponse.json({
      applications: rows,
      status,
      total: counts[status] ?? 0,
      page: paginated ? page : 1,
      perPage: paginated ? perPage : (counts[status] ?? 0),
      counts: {
        pending: counts["Pending Approval"] ?? 0,
        approved: counts["Approved"] ?? 0,
        rejected: counts["Rejected"] ?? 0,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
