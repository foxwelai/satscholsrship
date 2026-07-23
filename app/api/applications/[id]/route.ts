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
  if (body.prev_year_marks !== undefined) updates.prevYearMarks = body.prev_year_marks;
  if (body.annual_fee !== undefined) updates.annualFee = body.annual_fee;

  if (body.action === "approve_close") {
    updates.status = "Approved";
    updates.closed = true;
    updates.approvedAt = now;
    updates.closedAt = now;
  } else if (body.action === "reopen") {
    updates.closed = false;
    updates.closedAt = null;
  } else if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "Approved" && !existing.app.approvedAt) updates.approvedAt = now;
  }

  await db.update(applications).set(updates).where(eq(applications.id, Number(id)));
  return NextResponse.json({ ok: true });
}
