import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { petes, students } from "@/lib/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rows = await db
    .select({
      id: petes.id,
      name: petes.name,
      short_code: petes.shortCode,
      member_name: petes.memberName,
      member_mobile: petes.memberMobile,
      active: petes.active,
      student_count: sql<number>`count(${students.id})::int`,
    })
    .from(petes)
    .leftJoin(students, eq(students.peteId, petes.id))
    .where(session.role === "pete_admin" ? eq(petes.id, session.peteId!) : undefined)
    .groupBy(petes.id)
    .orderBy(petes.name);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can manage petes" }, { status: 403 });
  }
  const body = await req.json();
  const { name, short_code, member_name = "", member_mobile = "" } = body;
  if (!name?.trim() || !short_code?.trim()) {
    return NextResponse.json({ error: "Name and short code are required" }, { status: 400 });
  }
  try {
    const [row] = await db
      .insert(petes)
      .values({
        name: name.trim(),
        shortCode: short_code.trim().toUpperCase(),
        memberName: member_name.trim(),
        memberMobile: member_mobile.trim(),
      })
      .returning({ id: petes.id });
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e: unknown) {
    const msg = isUniqueViolation(e)
      ? "A pete with this name or short code already exists"
      : "Failed to create pete";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
