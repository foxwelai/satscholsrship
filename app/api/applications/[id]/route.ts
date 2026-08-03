import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, applications } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const [existing] = await db
    .select({ app: applications, peteId: students.peteId })
    .from(applications)
    .innerJoin(students, eq(students.id, applications.studentId))
    .where(eq(applications.id, Number(id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "pete_admin" && existing.peteId !== session.peteId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const now = new Date();
  const updates: Partial<typeof applications.$inferInsert> = { updatedAt: now };

  if (body.category !== undefined) updates.category = body.category;
  if (body.current_class !== undefined) updates.currentClass = body.current_class;
  if (body.course_name !== undefined) updates.courseName = body.course_name;
  if (body.pincode !== undefined) updates.pincode = body.pincode;
  if (body.location !== undefined) updates.location = body.location;
  if (body.prev_year_marks !== undefined) updates.prevYearMarks = body.prev_year_marks;
  if (body.annual_fee !== undefined) updates.annualFee = body.annual_fee;

  // Status transitions (approve/reject/close/reopen) are the super admin's
  // call only — everyone else can just edit the application's details.
  const wantsStatusChange =
    body.action === "approve_close" ||
    body.action === "reopen" ||
    (body.status !== undefined && body.status !== existing.app.status);
  if (wantsStatusChange && session.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only the super admin can approve, reject, or close applications" },
      { status: 403 }
    );
  }

  if (body.action === "approve_close") {
    updates.status = "Approved";
    updates.closed = true;
    updates.rejectionReason = "";
    updates.approvedAt = now;
    updates.closedAt = now;
  } else if (body.action === "reopen") {
    updates.closed = false;
    updates.closedAt = null;
  } else if (body.status !== undefined && body.status !== existing.app.status) {
    if (body.status === "Rejected") {
      const reason = (body.rejection_reason ?? "").trim();
      if (!reason) {
        return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
      }
      updates.rejectionReason = reason;
    } else {
      updates.rejectionReason = "";
    }
    updates.status = body.status;
    if (body.status === "Approved" && !existing.app.approvedAt) updates.approvedAt = now;
  }

  await db.update(applications).set(updates).where(eq(applications.id, Number(id)));
  return NextResponse.json({ ok: true });
}
